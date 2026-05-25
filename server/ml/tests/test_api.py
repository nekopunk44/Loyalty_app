"""Smoke-тесты FastAPI-эндпоинтов: запускают train.py-логику в памяти и
проверяют, что роуты возвращают ожидаемые контракты."""
import pytest
from fastapi.testclient import TestClient

import main
from data.synthetic import generate_synthetic_dataset
from models.churn import ChurnClassifier
from models.recommender import HybridRecommender


@pytest.fixture(scope="module")
def client():
    # Готовим обученные модели в памяти и подкладываем в state
    ds = generate_synthetic_dataset(n_users=600, seed=99)
    churn = ChurnClassifier()
    churn.fit(ds.churn_features)
    rec = HybridRecommender()
    rec.fit(ds.user_events, ds.events)
    main._state["churn"] = churn
    main._state["recsys"] = rec

    with TestClient(main.app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["churn_loaded"] is True
    assert body["recsys_loaded"] is True


def test_rfm_recompute(client):
    r = client.post("/rfm/recompute")
    assert r.status_code == 200
    body = r.json()
    assert set(body["distribution"].keys()) == {"Bronze", "Silver", "Gold", "Platinum"}
    assert body["n_users"] > 0
    assert 0.0 <= body["silhouette"] <= 1.0


def test_churn_predict_with_features(client):
    payload = {
        "user_id": "u_test",
        "features": {
            "days_since_registration": 365,
            "days_since_last_booking": 200,
            "days_since_last_payment": 200,
            "days_since_last_login": 180,
            "total_bookings_count": 2,
            "total_payments_count": 1,
            "total_spent": 15000,
            "avg_booking_value": 7500,
            "cancelled_bookings_ratio": 0.5,
            "loyalty_balance": 0,
            "referrals_count": 0,
            "notifications_read_ratio": 0.05,
            "membership_level_numeric": 1,
            "days_since_level_change": 200,
        },
    }
    r = client.post("/churn/predict", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["user_id"] == "u_test"
    assert 0.0 <= body["churn_probability"] <= 1.0
    assert body["risk"] in {"low", "medium", "high"}


def test_recommend_events_existing_and_cold(client):
    # cold start
    r = client.post("/recommend/events", json={"user_id": "unknown_user", "k": 5})
    assert r.status_code == 200
    body = r.json()
    assert body["fallback_used"] is True
    assert len(body["recommendations"]) > 0
