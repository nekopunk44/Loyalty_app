"""Гибридная рекомендательная система для событий.

Комбинирует Content-Based filtering (по категориям) и item-item Collaborative
Filtering (по матрице участия). Холодный старт — ранжирование по
популярности.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity

EVENT_CATEGORIES = ["gastro", "spa", "sport", "culture", "business", "auction"]


@dataclass
class RecommenderMetrics:
    n_users: int
    n_events: int
    n_interactions: int
    coverage: float       # доля пользователей с >= 1 рекомендацией
    avg_rec_length: float


class HybridRecommender:
    """Hybrid score(u, e) = α · CB(u, e) + (1-α) · CF(u, e).

    CB — косинусное сходство между one-hot вектором категорий пользователя
    и one-hot вектором события.
    CF — item-item сходство через матрицу пользователь × событие.
    """

    def __init__(self, alpha: float = 0.5, categories: Optional[List[str]] = None):
        self.alpha = alpha
        self.categories = categories or EVENT_CATEGORIES
        self.user_ids: List[str] = []
        self.event_ids: List[int] = []
        self.uid_idx: Dict[str, int] = {}
        self.eid_idx: Dict[int, int] = {}
        self.event_cat_vec: np.ndarray = np.empty((0, 0))  # (n_events, n_categories)
        self.user_cat_vec: np.ndarray = np.empty((0, 0))   # (n_users, n_categories)
        self.event_sim: np.ndarray = np.empty((0, 0))      # (n_events, n_events)
        self.interaction: csr_matrix = csr_matrix((0, 0))  # (n_users, n_events)
        self.popularity: Dict[int, int] = {}
        self.trained = False

    def fit(self, user_events: pd.DataFrame, events: pd.DataFrame) -> RecommenderMetrics:
        if events.empty:
            raise ValueError("events DataFrame не должен быть пустым")

        self.event_ids = sorted(events["event_id"].unique().tolist())
        self.eid_idx = {eid: i for i, eid in enumerate(self.event_ids)}

        # one-hot матрица категорий событий
        cat_idx = {c: i for i, c in enumerate(self.categories)}
        n_events = len(self.event_ids)
        n_cats = len(self.categories)
        self.event_cat_vec = np.zeros((n_events, n_cats))
        for _, row in events.iterrows():
            ei = self.eid_idx[row["event_id"]]
            ci = cat_idx.get(row["category"])
            if ci is not None:
                self.event_cat_vec[ei, ci] = 1.0

        # популярность
        self.popularity = dict(zip(events["event_id"], events.get("participants", 0)))

        # матрица user × event
        if not user_events.empty:
            self.user_ids = sorted(user_events["user_id"].unique().tolist())
            self.uid_idx = {uid: i for i, uid in enumerate(self.user_ids)}

            rows = user_events["user_id"].map(self.uid_idx).to_numpy()
            cols = user_events["event_id"].map(self.eid_idx).to_numpy()
            # отфильтровываем взаимодействия с неизвестными событиями
            mask = (~pd.isna(rows)) & (~pd.isna(cols))
            rows = rows[mask].astype(int)
            cols = cols[mask].astype(int)
            data = np.ones(len(rows), dtype=float)
            self.interaction = csr_matrix(
                (data, (rows, cols)), shape=(len(self.user_ids), n_events)
            )

            # user × category из взаимодействий
            self.user_cat_vec = np.asarray(self.interaction @ self.event_cat_vec)
            # нормируем по сумме (доли категорий пользователя)
            sums = self.user_cat_vec.sum(axis=1, keepdims=True)
            sums[sums == 0] = 1.0
            self.user_cat_vec = self.user_cat_vec / sums

            # item-item сходство по столбцам матрицы взаимодействий
            self.event_sim = cosine_similarity(self.interaction.T)
        else:
            self.user_ids = []
            self.uid_idx = {}
            self.interaction = csr_matrix((0, n_events))
            self.user_cat_vec = np.zeros((0, n_cats))
            self.event_sim = np.zeros((n_events, n_events))

        self.trained = True
        return RecommenderMetrics(
            n_users=len(self.user_ids),
            n_events=n_events,
            n_interactions=int(self.interaction.sum()),
            coverage=1.0 if self.user_ids else 0.0,
            avg_rec_length=float(n_events),
        )

    def _cb_scores(self, user_idx: int) -> np.ndarray:
        u = self.user_cat_vec[user_idx]
        if u.sum() == 0:
            return np.zeros(self.event_cat_vec.shape[0])
        # косинус между профилем пользователя и каждым событием
        u_norm = np.linalg.norm(u) or 1.0
        e_norms = np.linalg.norm(self.event_cat_vec, axis=1)
        e_norms[e_norms == 0] = 1.0
        return (self.event_cat_vec @ u) / (u_norm * e_norms)

    def _cf_scores(self, user_idx: int) -> np.ndarray:
        history = self.interaction.getrow(user_idx).toarray().ravel()
        if history.sum() == 0:
            return np.zeros(self.event_sim.shape[0])
        return history @ self.event_sim

    def rank_for_user(self, user_id: str, k: int = 10) -> List[Tuple[int, float]]:
        if not self.trained:
            raise RuntimeError("Рекомендер не обучен")

        if user_id not in self.uid_idx:
            return self._popular_fallback(k)

        u = self.uid_idx[user_id]
        cb = self._cb_scores(u)
        cf = self._cf_scores(u)

        # нормализуем оба компонента в [0, 1]
        def _norm(a: np.ndarray) -> np.ndarray:
            if a.max() <= 0:
                return a
            return a / a.max()

        score = self.alpha * _norm(cb) + (1 - self.alpha) * _norm(cf)

        # исключаем события, в которых пользователь уже участвовал
        history = self.interaction.getrow(u).toarray().ravel()
        score[history > 0] = -np.inf

        order = np.argsort(-score)[:k]
        return [
            (self.event_ids[i], float(score[i]))
            for i in order
            if np.isfinite(score[i])
        ]

    def _popular_fallback(self, k: int) -> List[Tuple[int, float]]:
        top = sorted(self.popularity.items(), key=lambda kv: -kv[1])[:k]
        return [(int(eid), float(p)) for eid, p in top]

    # ----- persistence -----
    def save(self, path: Path) -> None:
        joblib.dump(
            {
                "alpha": self.alpha,
                "categories": self.categories,
                "user_ids": self.user_ids,
                "event_ids": self.event_ids,
                "uid_idx": self.uid_idx,
                "eid_idx": self.eid_idx,
                "event_cat_vec": self.event_cat_vec,
                "user_cat_vec": self.user_cat_vec,
                "event_sim": self.event_sim,
                "interaction": self.interaction,
                "popularity": self.popularity,
                "trained": self.trained,
            },
            path,
        )

    @classmethod
    def load(cls, path: Path) -> "HybridRecommender":
        d = joblib.load(path)
        inst = cls(alpha=d["alpha"], categories=d["categories"])
        for k, v in d.items():
            setattr(inst, k, v)
        return inst
