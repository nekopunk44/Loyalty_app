"""Детекция аномалий на потоке транзакций (IsolationForest).

Признаки одного платежа:
  • log_amount        — log10(amount + 1), сжимает «хвост» сумм
  • hour_of_day       — 0..23
  • day_of_week       — 0..6
  • user_avg_log      — log10(средняя сумма пользователя + 1)
  • user_count        — сколько всего платежей у юзера к моменту tx
  • dev_from_avg      — abs(amount - user_avg) / max(user_avg, 1)

Это даёт модели возможность поймать:
  • необычно крупные суммы относительно истории пользователя;
  • ночные/нетипичные временные паттерны;
  • резкий всплеск активности у «спящего» аккаунта.

Хранится как artifact `anomaly_v1.pkl`. Перед инференсом нужно
обогатить входящие транзакции теми же per-user агрегатами, что
использовались при обучении.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

FEATURES: List[str] = [
    "log_amount",
    "hour_of_day",
    "day_of_week",
    "user_avg_log",
    "user_count",
    "dev_from_avg",
]


@dataclass
class AnomalyMetrics:
    n_transactions: int
    contamination: float
    n_flagged: int
    flagged_share: float


def build_features(tx: pd.DataFrame) -> pd.DataFrame:
    """Строит признаковую матрицу из «сырой» таблицы транзакций.

    tx должна содержать: user_id, amount (float), created_at (datetime).
    """
    if tx.empty:
        return pd.DataFrame(columns=["user_id"] + FEATURES)

    df = tx.copy()
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0).abs()
    df["created_at"] = pd.to_datetime(df["created_at"])
    df["log_amount"] = np.log10(df["amount"] + 1.0)
    df["hour_of_day"] = df["created_at"].dt.hour.astype(int)
    df["day_of_week"] = df["created_at"].dt.dayofweek.astype(int)

    # per-user агрегаты — running, чтобы у первой транзакции не было утечки в будущее
    df = df.sort_values(["user_id", "created_at"]).reset_index(drop=True)
    df["user_count"] = df.groupby("user_id").cumcount() + 1
    df["user_running_sum"] = df.groupby("user_id")["amount"].cumsum()
    df["user_running_avg"] = df["user_running_sum"] / df["user_count"]
    df["user_avg_log"] = np.log10(df["user_running_avg"] + 1.0)
    df["dev_from_avg"] = (
        (df["amount"] - df["user_running_avg"]).abs()
        / df["user_running_avg"].clip(lower=1.0)
    )

    return df[["user_id"] + FEATURES + ["amount", "created_at"]]


class AnomalyDetector:
    """IsolationForest + post-hoc нормализация anomaly_score в [0, 1]."""

    def __init__(
        self,
        contamination: float = 0.04,
        n_estimators: int = 200,
        random_state: int = 42,
    ):
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state,
            n_jobs=-1,
        )
        self.contamination = contamination
        self.features = FEATURES
        # эталонные min/max sklearn-score для нормализации в [0, 1]
        self._score_min: Optional[float] = None
        self._score_max: Optional[float] = None
        self.trained = False

    def fit(self, tx: pd.DataFrame) -> AnomalyMetrics:
        feats = build_features(tx)
        if len(feats) < 20:
            raise ValueError(f"Недостаточно транзакций для обучения: {len(feats)} < 20")

        X = feats[self.features].to_numpy(dtype=float)
        self.model.fit(X)

        # sklearn выдаёт «score_samples» где БОЛЬШЕЕ = более типичное.
        # Инвертируем и нормализуем для удобства интерпретации:
        # 0 = нормальная транзакция, 1 = крайняя аномалия.
        raw = self.model.score_samples(X)
        self._score_min = float(np.min(raw))
        self._score_max = float(np.max(raw))
        self.trained = True

        flagged = int(np.sum(self.model.predict(X) == -1))
        return AnomalyMetrics(
            n_transactions=len(feats),
            contamination=self.contamination,
            n_flagged=flagged,
            flagged_share=flagged / len(feats),
        )

    def score(self, tx: pd.DataFrame) -> pd.DataFrame:
        """Возвращает каждую транзакцию + anomaly_score [0..1] + is_anomaly bool."""
        if not self.trained:
            raise RuntimeError("Модель не обучена")
        feats = build_features(tx)
        if feats.empty:
            return pd.DataFrame(columns=["user_id", "amount", "created_at",
                                         "anomaly_score", "is_anomaly"])

        X = feats[self.features].to_numpy(dtype=float)
        raw = self.model.score_samples(X)

        # инверсия + нормализация: чем меньше raw, тем больше score
        smin = self._score_min if self._score_min is not None else float(np.min(raw))
        smax = self._score_max if self._score_max is not None else float(np.max(raw))
        if smax == smin:
            normalized = np.zeros_like(raw)
        else:
            normalized = (smax - raw) / (smax - smin)
        normalized = np.clip(normalized, 0.0, 1.0)

        is_anomaly = self.model.predict(X) == -1

        return pd.DataFrame({
            "user_id": feats["user_id"].values,
            "amount": feats["amount"].values,
            "created_at": feats["created_at"].values,
            "anomaly_score": normalized,
            "is_anomaly": is_anomaly,
        })

    def save(self, path: Path) -> None:
        joblib.dump({
            "model": self.model,
            "contamination": self.contamination,
            "features": self.features,
            "score_min": self._score_min,
            "score_max": self._score_max,
            "trained": self.trained,
        }, path)

    @classmethod
    def load(cls, path: Path) -> "AnomalyDetector":
        d = joblib.load(path)
        inst = cls(contamination=d["contamination"])
        inst.model = d["model"]
        inst.features = d["features"]
        inst._score_min = d["score_min"]
        inst._score_max = d["score_max"]
        inst.trained = d["trained"]
        return inst
