"""Прогноз ежедневной выручки (Holt-Winters Exponential Smoothing).

Модель не сохраняется в артефакт — обучается на лету при каждом запросе,
поскольку временной ряд короткий и тренировка занимает миллисекунды.
Это упрощает деплой (нет stale-артефакта) и автоматически учитывает
свежие точки в БД.

В качестве fallback при коротких рядах используется простой линейный
тренд от 14-дневного скользящего среднего — это страхует от падения
сервиса, когда у системы ещё нет полной истории.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List

import numpy as np
import pandas as pd

try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    _HAS_STATSMODELS = True
except ImportError:  # graceful degradation, если statsmodels не установлен
    _HAS_STATSMODELS = False


MIN_POINTS_HOLT_WINTERS = 21   # минимум 3 недели данных для сезонной модели
MIN_POINTS_TREND = 7           # минимум 1 неделя для fallback-тренда
SEASONAL_PERIODS = 7           # недельная сезонность


@dataclass
class ForecastResult:
    horizon: int
    total: float
    daily: List[float]
    lower: List[float]
    upper: List[float]
    method: str                 # 'holt-winters' | 'linear-trend' | 'flat'
    history_days: int


def _flat_forecast(series: pd.Series, horizon: int) -> ForecastResult:
    """Последняя точка повторяется horizon раз. Самый бедный fallback."""
    last = float(series.iloc[-1]) if len(series) > 0 else 0.0
    daily = [last] * horizon
    return ForecastResult(
        horizon=horizon,
        total=last * horizon,
        daily=daily,
        lower=daily,
        upper=daily,
        method="flat",
        history_days=len(series),
    )


def _linear_trend_forecast(series: pd.Series, horizon: int) -> ForecastResult:
    """Линейная экстраполяция по последним 14 точкам. Используется,
    когда ряд слишком короткий для Holt-Winters."""
    tail = series.tail(14)
    if len(tail) < 2:
        return _flat_forecast(series, horizon)

    x = np.arange(len(tail), dtype=float)
    y = tail.to_numpy(dtype=float)
    slope, intercept = np.polyfit(x, y, 1)

    # доверительный интервал ~ стандартное отклонение остатков
    residuals = y - (slope * x + intercept)
    std = float(np.std(residuals)) if len(residuals) > 1 else abs(float(np.mean(y))) * 0.1

    daily = []
    lower = []
    upper = []
    for h in range(1, horizon + 1):
        v = max(intercept + slope * (len(tail) - 1 + h), 0.0)
        daily.append(v)
        lower.append(max(v - 1.96 * std, 0.0))
        upper.append(v + 1.96 * std)

    return ForecastResult(
        horizon=horizon,
        total=float(sum(daily)),
        daily=daily,
        lower=lower,
        upper=upper,
        method="linear-trend",
        history_days=len(series),
    )


def _hw_forecast(series: pd.Series, horizon: int) -> ForecastResult:
    """Holt-Winters Additive с недельной сезонностью."""
    model = ExponentialSmoothing(
        series.to_numpy(dtype=float),
        trend="add",
        seasonal="add" if len(series) >= 2 * SEASONAL_PERIODS else None,
        seasonal_periods=SEASONAL_PERIODS if len(series) >= 2 * SEASONAL_PERIODS else None,
        initialization_method="estimated",
    ).fit(optimized=True)

    forecast = model.forecast(steps=horizon)
    daily = [float(max(v, 0.0)) for v in forecast]

    # доверительный интервал по стандартной ошибке остатков обучения
    residuals = series.to_numpy(dtype=float) - model.fittedvalues
    std = float(np.std(residuals)) if len(residuals) > 1 else 0.0
    lower = [max(v - 1.96 * std, 0.0) for v in daily]
    upper = [v + 1.96 * std for v in daily]

    return ForecastResult(
        horizon=horizon,
        total=float(sum(daily)),
        daily=daily,
        lower=lower,
        upper=upper,
        method="holt-winters",
        history_days=len(series),
    )


def forecast_revenue(series: pd.Series, horizon: int = 30) -> ForecastResult:
    """Главная точка входа. Сам выбирает метод по длине ряда.

    series: pd.Series с DatetimeIndex и значениями дневной выручки.
    horizon: количество дней прогноза (1..90).
    """
    horizon = int(max(1, min(horizon, 90)))

    if series is None or len(series) == 0:
        return ForecastResult(
            horizon=horizon, total=0.0,
            daily=[0.0] * horizon, lower=[0.0] * horizon, upper=[0.0] * horizon,
            method="flat", history_days=0,
        )

    # отбрасываем NaN и приводим к float
    series = series.dropna().astype(float)

    if not _HAS_STATSMODELS or len(series) < MIN_POINTS_HOLT_WINTERS:
        if len(series) >= MIN_POINTS_TREND:
            return _linear_trend_forecast(series, horizon)
        return _flat_forecast(series, horizon)

    try:
        return _hw_forecast(series, horizon)
    except Exception:
        # Holt-Winters иногда падает на вырожденных рядах (все нули и т.п.)
        return _linear_trend_forecast(series, horizon)
