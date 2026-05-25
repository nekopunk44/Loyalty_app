"""Офлайн-обучение моделей оттока и рекомендаций.

Использование:
    python train.py                 # обучение на данных из БД или синтетике
    python train.py --synthetic     # принудительно синтетические данные
    python train.py --n-users 3000  # размер синтетического датасета

Результат сохраняется в artifacts_dir (по умолчанию ./artifacts):
    churn_v1.pkl     — обученный градиентный бустинг
    recsys_v1.pkl    — построенный гибридный рекомендер
    metrics.json     — отчёт по метрикам обучения
"""
from __future__ import annotations

import argparse
import json
import logging
from dataclasses import asdict
from datetime import datetime

from config import settings
from data.loader import (
    load_active_events,
    load_churn_features,
    load_user_activity,
    load_user_event_matrix,
)
from data.synthetic import generate_synthetic_dataset
from models.churn import ChurnClassifier
from models.recommender import HybridRecommender
from models.rfm import compute_rfm, recompute_segments

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("train")


def train_all(use_synthetic: bool, n_users: int) -> dict:
    if use_synthetic:
        logger.info("Генерирую синтетический датасет (%s пользователей)", n_users)
        ds = generate_synthetic_dataset(n_users=n_users)
        activity = ds.activity
        churn_df = ds.churn_features
        user_events = ds.user_events
        events = ds.events
    else:
        logger.info("Загружаю данные из БД")
        activity = load_user_activity()
        churn_df = load_churn_features()
        user_events = load_user_event_matrix()
        events = load_active_events()

    metrics: dict = {"trained_at": datetime.utcnow().isoformat() + "Z"}

    # --- RFM ---
    logger.info("Обучаю RFM-сегментер на %s бронированиях", len(activity))
    rfm_result = recompute_segments(activity)
    metrics["rfm"] = {
        "n_users": rfm_result.n_users,
        "silhouette": rfm_result.silhouette,
        "distribution": rfm_result.distribution,
    }
    logger.info(
        "RFM: silhouette=%.3f, распределение=%s",
        rfm_result.silhouette, rfm_result.distribution,
    )

    # --- Churn ---
    logger.info("Обучаю Churn-классификатор на %s пользователях", len(churn_df))
    churn = ChurnClassifier()
    cm = churn.fit(churn_df)
    metrics["churn"] = asdict(cm)
    logger.info(
        "Churn: ROC-AUC=%.3f, F1=%.3f, precision=%.3f, recall=%.3f",
        cm.roc_auc, cm.f1, cm.precision, cm.recall,
    )
    churn.save(settings.artifacts_dir / "churn_v1.pkl")

    # --- Recsys ---
    logger.info(
        "Обучаю Recommender на %s взаимодействиях, %s событиях",
        len(user_events), len(events),
    )
    recsys = HybridRecommender(alpha=0.5)
    rm = recsys.fit(user_events, events)
    metrics["recsys"] = {
        "n_users": rm.n_users,
        "n_events": rm.n_events,
        "n_interactions": rm.n_interactions,
    }
    logger.info(
        "Recsys: users=%s, events=%s, interactions=%s",
        rm.n_users, rm.n_events, rm.n_interactions,
    )
    recsys.save(settings.artifacts_dir / "recsys_v1.pkl")

    metrics_path = settings.artifacts_dir / "metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2, ensure_ascii=False))
    logger.info("Метрики сохранены в %s", metrics_path)

    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Обучение моделей ML-микросервиса")
    parser.add_argument("--synthetic", action="store_true",
                        help="Принудительно использовать синтетические данные")
    parser.add_argument("--n-users", type=int, default=1500,
                        help="Размер синтетического датасета")
    args = parser.parse_args()

    use_synth = args.synthetic or not settings.database_url
    train_all(use_synthetic=use_synth, n_users=args.n_users)


if __name__ == "__main__":
    main()
