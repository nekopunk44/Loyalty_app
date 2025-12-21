"""FastAPI-приложение микросервиса Intelligent Loyalty Engine.

Запуск:
    uvicorn main:app --host 0.0.0.0 --port 8001

Эндпоинты:
    POST /rfm/recompute        — пересчёт уровней лояльности по RFM
    POST /churn/predict        — вероятность оттока для пользователя
    POST /recommend/events     — ранжированный список рекомендованных событий
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
    load_user_activity,
    load_user_event_matrix,
)
from models.churn import ChurnClassifier
from models.recommender import HybridRecommender
from models.rfm import recompute_segments

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)

CHURN_ARTIFACT = settings.artifacts_dir / "churn_v1.pkl"
RECSYS_ARTIFACT = settings.artifacts_dir / "recsys_v1.pkl"

_state: Dict[str, object] = {"churn": None, "recsys": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if CHURN_ARTIFACT.exists():
        try:
            _state["churn"] = ChurnClassifier.load(CHURN_ARTIFACT)
            logger.info("Загружена модель churn из %s", CHURN_ARTIFACT)
        except Exception as exc:
            logger.warning("Не удалось загрузить churn: %s", exc)
    else:
        logger.warning("Артефакт churn не найден. Запустите train.py.")

    if RECSYS_ARTIFACT.exists():
        try:
            _state["recsys"] = HybridRecommender.load(RECSYS_ARTIFACT)
            logger.info("Загружена модель recsys из %s", RECSYS_ARTIFACT)
        except Exception as exc:
            logger.warning("Не удалось загрузить recsys: %s", exc)
    else:
        logger.warning("Артефакт recsys не найден. Запустите train.py.")
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


# ============ Endpoints ============


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        churn_loaded=_state["churn"] is not None,
        recsys_loaded=_state["recsys"] is not None,
    )


@app.post("/rfm/recompute", response_model=RFMResponse, dependencies=[Depends(require_token)])
async def rfm_recompute(window_days: int = 365):
    """Пересчитывает RFM-сегменты по всем активным пользователям."""
    activity = load_user_activity(window_days=window_days)
    if activity.empty:
        raise HTTPException(status_code=400, detail="Нет данных для пересчёта")

    result = recompute_segments(activity)
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
