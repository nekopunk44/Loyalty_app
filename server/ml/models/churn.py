"""Прогноз оттока через Gradient Boosting на 14 признаках поведенческой активности.

Целевая метка: пользователь оттёк, если в течение 90 дней с момента
обучающей даты у него нет ни одного бронирования или платежа.
Признаки описаны в §2.2.2 ВКР.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score, roc_auc_score,
)
from sklearn.model_selection import train_test_split

FEATURES: List[str] = [
    "days_since_registration",
    "days_since_last_booking",
    "days_since_last_payment",
    "days_since_last_login",
    "total_bookings_count",
    "total_payments_count",
    "total_spent",
    "avg_booking_value",
    "cancelled_bookings_ratio",
    "loyalty_balance",
    "referrals_count",
    "notifications_read_ratio",
    "membership_level_numeric",
    "days_since_level_change",
]
LABEL = "churned"


@dataclass
class ChurnMetrics:
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    n_train: int
    n_test: int
    feature_importance: Dict[str, float]


class ChurnClassifier:
    def __init__(
        self,
        n_estimators: int = 100,
        max_depth: int = 3,
        learning_rate: float = 0.1,
        random_state: int = 42,
    ):
        self.model = GradientBoostingClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            random_state=random_state,
        )
        self.features = FEATURES
        self.trained = False

    def fit(self, df: pd.DataFrame, test_size: float = 0.15) -> ChurnMetrics:
        missing = [c for c in self.features + [LABEL] if c not in df.columns]
        if missing:
            raise ValueError(f"В датафрейме отсутствуют колонки: {missing}")

        X = df[self.features].to_numpy(dtype=float)
        y = df[LABEL].astype(int).to_numpy()

        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y, test_size=test_size, stratify=y, random_state=42
        )
        self.model.fit(X_tr, y_tr)
        self.trained = True

        y_pred = self.model.predict(X_te)
        y_prob = self.model.predict_proba(X_te)[:, 1]

        importances = self.model.feature_importances_
        fi = {
            name: float(score) for name, score in zip(self.features, importances)
        }

        return ChurnMetrics(
            accuracy=float(accuracy_score(y_te, y_pred)),
            precision=float(precision_score(y_te, y_pred, zero_division=0)),
            recall=float(recall_score(y_te, y_pred, zero_division=0)),
            f1=float(f1_score(y_te, y_pred, zero_division=0)),
            roc_auc=float(roc_auc_score(y_te, y_prob)),
            n_train=len(y_tr),
            n_test=len(y_te),
            feature_importance=dict(
                sorted(fi.items(), key=lambda kv: -kv[1])
            ),
        )

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        if not self.trained:
            raise RuntimeError("Модель не обучена")
        X = df[self.features].to_numpy(dtype=float)
        return self.model.predict_proba(X)[:, 1]

    def predict_one(self, features: Dict[str, float]) -> float:
        if not self.trained:
            raise RuntimeError("Модель не обучена")
        x = np.array([[features.get(f, 0.0) for f in self.features]], dtype=float)
        return float(self.model.predict_proba(x)[0, 1])

    def save(self, path: Path) -> None:
        joblib.dump(
            {"model": self.model, "features": self.features, "trained": self.trained},
            path,
        )

    @classmethod
    def load(cls, path: Path) -> "ChurnClassifier":
        d = joblib.load(path)
        inst = cls()
        inst.model = d["model"]
        inst.features = d["features"]
        inst.trained = d["trained"]
        return inst
