"""FastAPI-приложение микросервиса Intelligent Loyalty Engine.

Запуск:
    uvicorn main:app --host 0.0.0.0 --port 8001

Эндпоинты:
    POST /rfm/recompute        — пересчёт уровней лояльности по RFM
    POST /churn/predict        — вероятность оттока для пользователя
    POST /recommend/events     — ранжированный список рекомендованных событий
    POST /ltv/predict          — предсказанный годовой LTV для пользователя
    GET  /ltv/top              — top-N клиентов по предсказанной ценности
    GET  /forecast/revenue     — прогноз ежедневной выручки на горизонт
    GET  /anomaly/transactions — последние транзакции с anomaly-score
    GET  /health               — health-check
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from config import settings
from data.loader import (
    load_active_events,
    load_churn_features,
    load_daily_revenue,
    load_recent_transactions,
    load_user_activity,
    load_user_event_matrix,
)
from models.anomaly import AnomalyDetector
from models.churn import ChurnClassifier
from models.forecast import forecast_revenue
from models.ltv import LTVRegressor
from models.recommender import HybridRecommender
from models.rfm import recompute_segments

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)

CHURN_ARTIFACT   = settings.artifacts_dir / "churn_v1.pkl"
RECSYS_ARTIFACT  = settings.artifacts_dir / "recsys_v1.pkl"
LTV_ARTIFACT     = settings.artifacts_dir / "ltv_v1.pkl"
ANOMALY_ARTIFACT = settings.artifacts_dir / "anomaly_v1.pkl"

_state: Dict[str, object] = {
    "churn": None, "recsys": None, "ltv": None, "anomaly": None,
}


def _try_load(name: str, loader_cls, path: Path):
    if not path.exists():
        logger.warning("Артефакт %s не найден. Запустите train.py.", name)
        return
    try:
        _state[name] = loader_cls.load(path)
        logger.info("Загружена модель %s из %s", name, path)
    except Exception as exc:
        logger.warning("Не удалось загрузить %s: %s", name, exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _try_load("churn",   ChurnClassifier,   CHURN_ARTIFACT)
    _try_load("recsys",  HybridRecommender, RECSYS_ARTIFACT)
    _try_load("ltv",     LTVRegressor,      LTV_ARTIFACT)
    _try_load("anomaly", AnomalyDetector,   ANOMALY_ARTIFACT)
    yield


app = FastAPI(
    title="Villa Jaconda — Intelligent Loyalty Engine",
    description="Микросервис RFM-сегментации, прогноза оттока и рекомендаций событий.",
    version="1.0.0",
    lifespan=lifespan,
)

bearer = HTTPBearer(auto_error=False)


def require_token(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    """Простая проверка сервисного токена.

    В продакшене сетевой уровень должен дополнительно изолировать ML-сервис
    во внутренней сети — этот middleware защищает от случайного раскрытия.
    """
    expected = settings.ml_service_token
    if not expected or expected == "dev-token":
        # development mode — пропускаем без токена
        return
    if creds is None or creds.credentials != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ML service token",
        )


# ============ Pydantic schemas ============


class HealthResponse(BaseModel):
    status: str
    churn_loaded: bool
    recsys_loaded: bool
    ltv_loaded: bool
    anomaly_loaded: bool


class RFMResponse(BaseModel):
    n_users: int
    silhouette: float
    distribution: Dict[str, int]
    user_levels: Dict[str, str]


class ChurnRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=64)
    features: Optional[Dict[str, float]] = None


class ChurnResponse(BaseModel):
    user_id: str
    churn_probability: float
    risk: str  # "low" | "medium" | "high"


class RecommendRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=64)
    k: int = Field(10, ge=1, le=50)


class RecommendItem(BaseModel):
    event_id: int
    score: float


class RecommendResponse(BaseModel):
    user_id: str
    recommendations: List[RecommendItem]
    fallback_used: bool


class LTVRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=64)
    features: Optional[Dict[str, float]] = None


class LTVResponse(BaseModel):
    user_id: str
    predicted_ltv: float       # годовой ARPU в PRB
    tier: str                  # 'low' | 'mid' | 'high'


class LTVTopItem(BaseModel):
    user_id: str
    predicted_ltv: float
    total_spent: float


class LTVTopResponse(BaseModel):
    n: int
    items: List[LTVTopItem]


class ForecastResponse(BaseModel):
    horizon: int
    total: float
    daily: List[float]
    lower: List[float]
    upper: List[float]
    method: str
    history_days: int


class AnomalyItem(BaseModel):
    user_id: str
    amount: float
    created_at: str
    anomaly_score: float
    is_anomaly: bool


class AnomalyResponse(BaseModel):
    n_total: int
    n_anomalies: int
    items: List[AnomalyItem]


# ============ Endpoints ============


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        churn_loaded=_state["churn"] is not None,
        recsys_loaded=_state["recsys"] is not None,
        ltv_loaded=_state["ltv"] is not None,
        anomaly_loaded=_state["anomaly"] is not None,
    )


@app.post("/rfm/recompute", response_model=RFMResponse, dependencies=[Depends(require_token)])
async def rfm_recompute(window_days: int = 365):
    """Пересчитывает RFM-сегменты по всем активным пользователям."""
    try:
        activity = load_user_activity(window_days=window_days)
    except Exception as exc:
        logger.exception("RFM: ошибка выгрузки активности")
        raise HTTPException(status_code=503, detail=f"Ошибка источника данных: {exc}")

    if activity.empty:
        raise HTTPException(status_code=400, detail="Нет данных для пересчёта")

    try:
        result = recompute_segments(activity)
    except ValueError as exc:
        # типично: пользователей меньше, чем кластеров (4) — недостаточно данных
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("RFM: ошибка кластеризации")
        raise HTTPException(status_code=500, detail=f"Ошибка кластеризации: {exc}")

    return RFMResponse(
        n_users=result.n_users,
        silhouette=result.silhouette,
        distribution=result.distribution,
        user_levels=result.user_levels,
    )


@app.post("/churn/predict", response_model=ChurnResponse, dependencies=[Depends(require_token)])
async def churn_predict(req: ChurnRequest):
    """Возвращает вероятность оттока для пользователя.

    Если features переданы в запросе — используются они, иначе
    подтягиваются из БД (или из синтетики при fallback).
    """
    model: Optional[ChurnClassifier] = _state["churn"]
    if model is None:
        raise HTTPException(status_code=503, detail="Модель churn не загружена")

    if req.features:
        prob = model.predict_one(req.features)
    else:
        df = load_churn_features()
        row = df[df["user_id"] == req.user_id]
        if row.empty:
            raise HTTPException(
                status_code=404, detail=f"Признаки для user_id={req.user_id} не найдены"
            )
        prob = float(model.predict_proba(row)[0])

    risk = "high" if prob >= 0.7 else ("medium" if prob >= 0.4 else "low")
    return ChurnResponse(user_id=req.user_id, churn_probability=prob, risk=risk)


@app.post(
    "/recommend/events",
    response_model=RecommendResponse,
    dependencies=[Depends(require_token)],
)
async def recommend_events(req: RecommendRequest):
    recsys: Optional[HybridRecommender] = _state["recsys"]
    if recsys is None:
        raise HTTPException(status_code=503, detail="Рекомендер не загружен")

    fallback = req.user_id not in recsys.uid_idx
    pairs = recsys.rank_for_user(req.user_id, k=req.k)
    items = [RecommendItem(event_id=int(eid), score=float(s)) for eid, s in pairs]
    return RecommendResponse(
        user_id=req.user_id, recommendations=items, fallback_used=fallback
    )


# ============ LTV ============


def _ltv_tier(value: float, p_low: float, p_high: float) -> str:
    if value >= p_high:
        return "high"
    if value >= p_low:
        return "mid"
    return "low"


@app.post("/ltv/predict", response_model=LTVResponse, dependencies=[Depends(require_token)])
async def ltv_predict(req: LTVRequest):
    model: Optional[LTVRegressor] = _state["ltv"]
    if model is None:
        raise HTTPException(status_code=503, detail="Модель LTV не загружена")

    if req.features:
        prob = model.predict_one(req.features)
    else:
        df = load_churn_features()
        row = df[df["user_id"] == req.user_id]
        if row.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Признаки для user_id={req.user_id} не найдены",
            )
        prob = float(model.predict(row)[0])

    # пороги: 25 000 и 100 000 PRB годового ARPU (грубая бизнес-оценка)
    tier = _ltv_tier(prob, p_low=25_000, p_high=100_000)
    return LTVResponse(user_id=req.user_id, predicted_ltv=prob, tier=tier)


@app.get("/ltv/top", response_model=LTVTopResponse, dependencies=[Depends(require_token)])
async def ltv_top(n: int = 20):
    model: Optional[LTVRegressor] = _state["ltv"]
    if model is None:
        raise HTTPException(status_code=503, detail="Модель LTV не загружена")

    df = load_churn_features()
    if df.empty:
        return LTVTopResponse(n=0, items=[])

    top_df = model.top_n(df, n=int(max(1, min(n, 100))))
    items = [
        LTVTopItem(
            user_id=str(row["user_id"]),
            predicted_ltv=float(row["predicted_ltv"]),
            total_spent=float(row["total_spent"]),
        )
        for _, row in top_df.iterrows()
    ]
    return LTVTopResponse(n=len(items), items=items)


# ============ Revenue forecast ============


@app.get(
    "/forecast/revenue",
    response_model=ForecastResponse,
    dependencies=[Depends(require_token)],
)
async def forecast_revenue_endpoint(horizon: int = 30, window_days: int = 180):
    """Прогноз ежедневной выручки на horizon дней по window_days истории.

    Модель Holt-Winters обучается на лету — ряд короткий, тренировка
    укладывается в десятки миллисекунд.
    """
    series = load_daily_revenue(window_days=window_days)
    result = forecast_revenue(series, horizon=horizon)
    return ForecastResponse(
        horizon=result.horizon,
        total=result.total,
        daily=result.daily,
        lower=result.lower,
        upper=result.upper,
        method=result.method,
        history_days=result.history_days,
    )


# ============ Anomaly detection ============


@app.get(
    "/anomaly/transactions",
    response_model=AnomalyResponse,
    dependencies=[Depends(require_token)],
)
async def anomaly_transactions(limit: int = 200, window_days: int = 30):
    """Скорит последние `limit` транзакций. Возвращает все вместе с
    anomaly_score, чтобы UI мог отметить флагом подозрительные.
    """
    model: Optional[AnomalyDetector] = _state["anomaly"]
    if model is None:
        raise HTTPException(status_code=503, detail="Модель anomaly не загружена")

    tx = load_recent_transactions(limit=int(max(1, min(limit, 1000))),
                                  window_days=int(window_days))
    if tx.empty:
        return AnomalyResponse(n_total=0, n_anomalies=0, items=[])

    scored = model.score(tx)
    # сортируем по anomaly_score DESC, чтобы первыми шли подозрительные
    scored = scored.sort_values("anomaly_score", ascending=False)
    items = [
        AnomalyItem(
            user_id=str(row["user_id"]),
            amount=float(row["amount"]),
            created_at=str(row["created_at"]),
            anomaly_score=float(row["anomaly_score"]),
            is_anomaly=bool(row["is_anomaly"]),
        )
        for _, row in scored.iterrows()
    ]
    n_anomalies = int(scored["is_anomaly"].sum())
    return AnomalyResponse(n_total=len(items), n_anomalies=n_anomalies, items=items)
