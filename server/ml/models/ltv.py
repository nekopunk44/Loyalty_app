"""Прогноз пожизненной ценности клиента (Customer Lifetime Value).

Регрессионная модель на тех же поведенческих признаках, что и Churn,
но без явных финансовых утечек (`total_spent`, `avg_booking_value`).
Целевая переменная — суммарные расходы пользователя, нормированные
на полный год активности. Это даёт «годовой ARPU» — оценку годовой
выручки на клиента при сохранении его текущего паттерна поведения.

Использование в админке:
  • Top-N клиентов по предсказанной ценности (cohort retention focus).
  • Сегментация для адресных предложений (high-LTV → персональные акции).
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

# Признаки без `total_spent` и `avg_booking_value` (target leakage)
FEATURES: List[str] = [
    "days_since_registration",
    "days_since_last_booking",
    "days_since_last_payment",
    "days_since_last_login",
    "total_bookings_count",
    "total_payments_count",
    "cancelled_bookings_ratio",
    "loyalty_balance",
    "referrals_count",
    "notifications_read_ratio",
    "membership_level_numeric",
    "days_since_level_change",
]
LABEL = "annual_ltv"

# минимальное окно «дней активности» для нормировки выручки на год
MIN_ACTIVE_DAYS = 30


def compute_annual_ltv(df: pd.DataFrame) -> pd.Series:
    """target = total_spent / max(days_since_registration, MIN_ACTIVE_DAYS) * 365.

    Защита от деления на 0 для совсем новых пользователей. Для них берётся
    окно 30 дней — это сглаживает «гиперболическую» нормировку.
    """
    days = df["days_since_registration"].clip(lower=MIN_ACTIVE_DAYS)
    return (df["total_spent"] / days) * 365.0


@dataclass
class LTVMetrics:
    r2: float
    mae: float
    mae_pct: float           # MAE / mean(y) — относительная ошибка
    n_train: int
    n_test: int
    feature_importance: Dict[str, float]


class LTVRegressor:
    """Gradient Boosting Regressor на 12 поведенческих признаках."""

    def __init__(
        self,
        n_estimators: int = 150,
        max_depth: int = 4,
        learning_rate: float = 0.08,
        random_state: int = 42,
    ):
        self.model = GradientBoostingRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            random_state=random_state,
        )
        self.features = FEATURES
        self.trained = False

    def fit(self, df: pd.DataFrame, test_size: float = 0.15) -> LTVMetrics:
        missing = [c for c in self.features if c not in df.columns]
        if missing:
            raise ValueError(f"Отсутствуют колонки фич: {missing}")
        if "total_spent" not in df.columns:
            raise ValueError("Нужна колонка total_spent для расчёта таргета")

        y = compute_annual_ltv(df).to_numpy(dtype=float)
        X = df[self.features].to_numpy(dtype=float)

        # отбрасываем пользователей с total_spent = 0 — для них модель
        # ничего не выучит, ground truth = 0 вне зависимости от поведения
        nonzero = y > 0
        X = X[nonzero]
        y = y[nonzero]

        if len(X) < 20:
            raise ValueError(f"Недостаточно данных для обучения LTV: {len(X)} < 20")

        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        self.model.fit(X_tr, y_tr)
        self.trained = True

        y_pred = self.model.predict(X_te)
        mae = float(mean_absolute_error(y_te, y_pred))
        mean_y = float(np.mean(y_te)) or 1.0

        fi = {
            name: float(score)
            for name, score in zip(self.features, self.model.feature_importances_)
        }
        return LTVMetrics(
            r2=float(r2_score(y_te, y_pred)),
            mae=mae,
            mae_pct=mae / mean_y * 100.0,
            n_train=len(y_tr),
            n_test=len(y_te),
            feature_importance=dict(sorted(fi.items(), key=lambda kv: -kv[1])),
        )

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        if not self.trained:
            raise RuntimeError("Модель не обучена")
        X = df[self.features].to_numpy(dtype=float)
        preds = self.model.predict(X)
        return np.clip(preds, a_min=0.0, a_max=None)  # ценность не бывает отрицательной

    def predict_one(self, features: Dict[str, float]) -> float:
        if not self.trained:
            raise RuntimeError("Модель не обучена")
        x = np.array([[features.get(f, 0.0) for f in self.features]], dtype=float)
        return float(max(self.model.predict(x)[0], 0.0))

    def top_n(self, df: pd.DataFrame, n: int = 20) -> pd.DataFrame:
        """Возвращает top-N пользователей по предсказанному LTV.

        Колонки результата: user_id, predicted_ltv, total_spent (фактическая),
        отсортировано по predicted_ltv desc.
        """
        if not self.trained:
            raise RuntimeError("Модель не обучена")
        preds = self.predict(df)
        out = pd.DataFrame({
            "user_id": df["user_id"].values,
            "predicted_ltv": preds,
            "total_spent": df["total_spent"].values,
        })
        return out.sort_values("predicted_ltv", ascending=False).head(n).reset_index(drop=True)

    def save(self, path: Path) -> None:
        joblib.dump(
            {"model": self.model, "features": self.features, "trained": self.trained},
            path,
        )

    @classmethod
    def load(cls, path: Path) -> "LTVRegressor":
        d = joblib.load(path)
        inst = cls()
        inst.model = d["model"]
        inst.features = d["features"]
        inst.trained = d["trained"]
        return inst
