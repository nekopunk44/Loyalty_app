"""RFM-сегментация и динамическое назначение уровней лояльности.

Алгоритм:
  1. Из таблицы бронирований вычисляем R (recency), F (frequency), M (monetary).
  2. Стандартизируем признаки (StandardScaler).
  3. Кластеризуем k-means на 4 группы.
  4. Упорядочиваем кластеры по среднему M; сопоставляем уровни
     Bronze < Silver < Gold < Platinum.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

LEVEL_NAMES = ["Bronze", "Silver", "Gold", "Platinum"]


@dataclass
class RFMResult:
    user_levels: Dict[str, str]
    silhouette: float
    n_users: int
    distribution: Dict[str, int]


def compute_rfm(activity: pd.DataFrame, today: Optional[datetime] = None) -> pd.DataFrame:
    """Группирует активность по user_id и считает recency, frequency, monetary."""
    today = today or datetime.utcnow()
    if activity.empty:
        return pd.DataFrame(columns=["user_id", "recency", "frequency", "monetary"])

    rfm = (
        activity.groupby("user_id")
        .agg(
            recency=("last_tx_date", lambda s: (today - s.max()).days),
            frequency=("booking_id", "count"),
            monetary=("total_price", "sum"),
        )
        .reset_index()
    )
    return rfm


class RFMSegmenter:
    """Кластеризатор k-means на пространстве (R, F, M)."""

    def __init__(self, n_clusters: int = 4, random_state: int = 42):
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.kmeans: Optional[KMeans] = None
        self.cluster_to_level: Dict[int, str] = {}

    def fit(self, rfm: pd.DataFrame) -> RFMResult:
        if len(rfm) < self.n_clusters:
            raise ValueError(
                f"Слишком мало пользователей ({len(rfm)}) для {self.n_clusters} кластеров"
            )
        X = rfm[["recency", "frequency", "monetary"]].to_numpy(dtype=float)
        # Для recency меньше = лучше → инвертируем перед стандартизацией
        X[:, 0] = -X[:, 0]
        Xn = self.scaler.fit_transform(X)

        self.kmeans = KMeans(
            n_clusters=self.n_clusters,
            init="k-means++",
            n_init=10,
            random_state=self.random_state,
        )
        clusters = self.kmeans.fit_predict(Xn)

        # Упорядочиваем кластеры по среднему M (восходяще) → Bronze..Platinum
        df = rfm.copy()
        df["cluster"] = clusters
        cluster_order = (
            df.groupby("cluster")["monetary"].mean().sort_values().index.tolist()
        )
        self.cluster_to_level = {
            c: LEVEL_NAMES[i] for i, c in enumerate(cluster_order)
        }
        df["level"] = df["cluster"].map(self.cluster_to_level)

        sil = float(silhouette_score(Xn, clusters)) if len(set(clusters)) > 1 else 0.0
        distribution = df["level"].value_counts().to_dict()
        # дополняем нулями отсутствующие уровни
        for lvl in LEVEL_NAMES:
            distribution.setdefault(lvl, 0)

        return RFMResult(
            user_levels=dict(zip(df["user_id"], df["level"])),
            silhouette=sil,
            n_users=len(df),
            distribution={k: int(distribution[k]) for k in LEVEL_NAMES},
        )

    def predict(self, rfm: pd.DataFrame) -> Dict[str, str]:
        if self.kmeans is None:
            raise RuntimeError("Модель не обучена. Сначала вызовите fit().")
        X = rfm[["recency", "frequency", "monetary"]].to_numpy(dtype=float)
        X[:, 0] = -X[:, 0]
        Xn = self.scaler.transform(X)
        clusters = self.kmeans.predict(Xn)
        return {
            uid: self.cluster_to_level[c]
            for uid, c in zip(rfm["user_id"], clusters)
        }

    # ----- persistence -----
    def save(self, path: Path) -> None:
        joblib.dump(
            {
                "scaler": self.scaler,
                "kmeans": self.kmeans,
                "cluster_to_level": self.cluster_to_level,
                "n_clusters": self.n_clusters,
                "random_state": self.random_state,
            },
            path,
        )

    @classmethod
    def load(cls, path: Path) -> "RFMSegmenter":
        d = joblib.load(path)
        inst = cls(n_clusters=d["n_clusters"], random_state=d["random_state"])
        inst.scaler = d["scaler"]
        inst.kmeans = d["kmeans"]
        inst.cluster_to_level = d["cluster_to_level"]
        return inst


def recompute_segments(
    activity: pd.DataFrame, today: Optional[datetime] = None
) -> RFMResult:
    """Полный end-to-end пересчёт RFM-сегментов: данные → fit → результат."""
    rfm = compute_rfm(activity, today)
    seg = RFMSegmenter()
    return seg.fit(rfm)


def fallback_levels_by_index(rfm: pd.DataFrame) -> Dict[str, str]:
    """Резервный алгоритм без обучения — по сумме RFM-индекса.

    Используется, когда выборка слишком мала или ML-сервис недоступен.
    """
    if rfm.empty:
        return {}
    r_score = pd.qcut(rfm["recency"].rank(method="first", ascending=False),
                      5, labels=[1, 2, 3, 4, 5]).astype(int)
    f_score = pd.qcut(rfm["frequency"].rank(method="first"),
                      5, labels=[1, 2, 3, 4, 5]).astype(int)
    m_score = pd.qcut(rfm["monetary"].rank(method="first"),
                      5, labels=[1, 2, 3, 4, 5]).astype(int)
    s = r_score + f_score + m_score
    mapping: Dict[str, str] = {}
    for uid, score in zip(rfm["user_id"], s):
        if score >= 12:
            mapping[uid] = "Platinum"
        elif score >= 9:
            mapping[uid] = "Gold"
        elif score >= 6:
            mapping[uid] = "Silver"
        else:
            mapping[uid] = "Bronze"
    return mapping
