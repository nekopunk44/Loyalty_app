"""Выгрузка данных из Postgres-БД основного приложения для обучения и инференса.

Имена таблиц и колонок соответствуют Sequelize-моделям server/models/*.js:
  users, bookings, payments, transactions, loyalty_cards, events,
  notifications, referrals — все таблицы в нижнем регистре,
  колонки в camelCase (требуют двойных кавычек в SQL).

Если DATABASE_URL не задан и synthetic_fallback=True — возвращает
синтетический датасет того же формата, чтобы сервис мог работать
локально без поднятой БД.

ВАЖНО про метку оттока (`churned`):
  В реальной системе явного флага оттока нет. Поэтому используется
  эвристика: пользователь считается «оттёкшим», если последнее
  бронирование было более 180 дней назад. Это стартовая разметка
  для бутстрапа модели; в дальнейшем её можно заменить на
  актуарную (например, фактический возврат через 6 месяцев).
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

import pandas as pd
from sqlalchemy import create_engine, text

from config import settings
from data.synthetic import generate_synthetic_dataset

logger = logging.getLogger(__name__)

CHURN_DAYS_THRESHOLD = 180  # бронирование старше — считаем оттоком

_engine = None


def get_engine():
    global _engine
    if _engine is None and settings.database_url:
        _engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
    return _engine


def _has_db() -> bool:
    return get_engine() is not None


def _fallback_or_raise(kind: str, **kwargs):
    if settings.synthetic_fallback:
        logger.warning("DATABASE_URL не задан, использую синтетический датасет (%s)", kind)
        ds = generate_synthetic_dataset(**kwargs)
        return getattr(ds, kind)
    raise RuntimeError("DATABASE_URL не задан и synthetic_fallback=False")


# ---------------------------------------------------------------------------
# Activity → RFM
# ---------------------------------------------------------------------------
def load_user_activity(window_days: int = 365) -> pd.DataFrame:
    """user_id, booking_id, total_price, last_tx_date — по одной строке на
    подтверждённое/завершённое бронирование за окно window_days."""
    if not _has_db():
        return _fallback_or_raise("activity", n_users=1500, days=window_days)

    query = text(
        """
        SELECT
            b."userId"                              AS user_id,
            b.id                                    AS booking_id,
            b."totalPrice"::float                   AS total_price,
            COALESCE(b."updatedAt", b."createdAt")  AS last_tx_date
        FROM bookings b
        WHERE b.status IN ('confirmed', 'completed')
          AND b."createdAt" >= NOW() - make_interval(days => :wd)
        """
    )
    with get_engine().connect() as conn:
        df = pd.read_sql(query, conn, params={"wd": int(window_days)})
    df["last_tx_date"] = pd.to_datetime(df["last_tx_date"])
    return df


# ---------------------------------------------------------------------------
# Churn features
# ---------------------------------------------------------------------------
def load_churn_features(as_of: Optional[datetime] = None) -> pd.DataFrame:
    """Признаковая матрица: user_id + 14 фич + churned (heuristic label).

    Признаки соответствуют models.churn.FEATURES — порядок и имена
    должны совпадать, иначе ChurnClassifier.fit() упадёт.
    """
    if not _has_db():
        return _fallback_or_raise("churn_features", n_users=1500)

    as_of = as_of or datetime.utcnow()

    # Большой агрегат: левый JOIN от users ко всем источникам метрик,
    # чтобы пользователи без bookings/notifications/etc. тоже попадали
    # в датасет (для них фичи будут NULL → ниже заполним дефолтами).
    query = text(
        f"""
        WITH b_agg AS (
            SELECT
                "userId"                                                AS user_id,
                COUNT(*)                                                AS total_bookings,
                COALESCE(SUM("totalPrice"), 0)::float                   AS total_spent,
                COALESCE(AVG("totalPrice"), 0)::float                   AS avg_booking_value,
                MIN("createdAt")                                        AS first_booking_at,
                MAX("createdAt")                                        AS last_booking_at,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)   AS cancelled_count
            FROM bookings
            GROUP BY "userId"
        ),
        p_agg AS (
            SELECT
                "userId"                                                AS user_id,
                COUNT(*) FILTER (WHERE status = 'completed')            AS total_payments,
                MAX("createdAt") FILTER (WHERE status = 'completed')    AS last_payment_at
            FROM payments
            GROUP BY "userId"
        ),
        n_agg AS (
            SELECT
                "userId"                                                AS user_id,
                COUNT(*)                                                AS total_notifications,
                SUM(CASE WHEN read THEN 1 ELSE 0 END)                   AS read_notifications
            FROM notifications
            GROUP BY "userId"
        ),
        r_agg AS (
            SELECT "referrerId" AS user_id, COUNT(*) AS referrals_count
            FROM referrals
            GROUP BY "referrerId"
        )
        SELECT
            u."userId"                                                  AS user_id,
            u."membershipLevel"                                         AS membership_level,
            -- days_since_registration (проксируем по первому бронированию,
            -- т.к. в users.timestamps=false и поля createdAt нет)
            COALESCE(
                EXTRACT(EPOCH FROM (:as_of - b.first_booking_at)) / 86400,
                0
            )                                                           AS days_since_registration,
            COALESCE(
                EXTRACT(EPOCH FROM (:as_of - b.last_booking_at)) / 86400,
                999
            )                                                           AS days_since_last_booking,
            COALESCE(
                EXTRACT(EPOCH FROM (:as_of - p.last_payment_at)) / 86400,
                999
            )                                                           AS days_since_last_payment,
            COALESCE(
                EXTRACT(EPOCH FROM (:as_of - u."refreshTokenExpires")) / 86400,
                999
            )                                                           AS days_since_last_login,
            COALESCE(b.total_bookings, 0)                               AS total_bookings_count,
            COALESCE(p.total_payments, 0)                               AS total_payments_count,
            COALESCE(b.total_spent, 0)                                  AS total_spent,
            COALESCE(b.avg_booking_value, 0)                            AS avg_booking_value,
            CASE
                WHEN COALESCE(b.total_bookings, 0) = 0 THEN 0.0
                ELSE COALESCE(b.cancelled_count, 0)::float / b.total_bookings
            END                                                         AS cancelled_bookings_ratio,
            COALESCE(lc.balance, 0)::float                              AS loyalty_balance,
            COALESCE(r.referrals_count, 0)                              AS referrals_count,
            CASE
                WHEN COALESCE(n.total_notifications, 0) = 0 THEN 0.0
                ELSE COALESCE(n.read_notifications, 0)::float / n.total_notifications
            END                                                         AS notifications_read_ratio,
            CASE u."membershipLevel"
                WHEN 'Bronze' THEN 1
                WHEN 'Silver' THEN 2
                WHEN 'Gold' THEN 3
                WHEN 'Platinum' THEN 4
                ELSE 1
            END                                                         AS membership_level_numeric,
            COALESCE(
                EXTRACT(EPOCH FROM (:as_of - lc."updatedAt")) / 86400,
                365
            )                                                           AS days_since_level_change
        FROM users u
        LEFT JOIN b_agg b   ON b.user_id = u."userId"
        LEFT JOIN p_agg p   ON p.user_id = u."userId"
        LEFT JOIN n_agg n   ON n.user_id = u."userId"
        LEFT JOIN r_agg r   ON r.user_id = u."userId"
        LEFT JOIN loyalty_cards lc ON lc."userId" = u."userId"
        WHERE u.role = 'user'
        """
    )
    with get_engine().connect() as conn:
        df = pd.read_sql(query, conn, params={"as_of": as_of})

    if df.empty:
        logger.warning("Реальная БД пустая, возвращаю синтетику для bootstrap")
        return _fallback_or_raise("churn_features", n_users=1500)

    # Эвристическая метка оттока: давность последнего бронирования.
    # Заодно отсекает совсем новых пользователей с days_since_last_booking=999.
    df["churned"] = (
        (df["days_since_last_booking"] > CHURN_DAYS_THRESHOLD)
        & (df["total_bookings_count"] > 0)
    ).astype(int)

    # ChurnClassifier ожидает строго эти 14 фич + label
    feature_cols = [
        "days_since_registration", "days_since_last_booking",
        "days_since_last_payment", "days_since_last_login",
        "total_bookings_count", "total_payments_count",
        "total_spent", "avg_booking_value",
        "cancelled_bookings_ratio", "loyalty_balance",
        "referrals_count", "notifications_read_ratio",
        "membership_level_numeric", "days_since_level_change",
    ]
    for c in feature_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    return df[["user_id"] + feature_cols + ["churned"]]


# ---------------------------------------------------------------------------
# User × Event interactions
# ---------------------------------------------------------------------------
def load_user_event_matrix() -> pd.DataFrame:
    """user_id, event_id, category — по одной строке на участие пользователя
    в событии (из events.participantIds, который Sequelize JSON хранит как jsonb)."""
    if not _has_db():
        return _fallback_or_raise("user_events", n_users=1500)

    query = text(
        """
        SELECT
            jsonb_array_elements_text(e."participantIds"::jsonb) AS user_id,
            e.id                                                  AS event_id,
            e.category
        FROM events e
        WHERE e."participantIds" IS NOT NULL
          AND jsonb_typeof(e."participantIds"::jsonb) = 'array'
          AND jsonb_array_length(e."participantIds"::jsonb) > 0
        """
    )
    with get_engine().connect() as conn:
        df = pd.read_sql(query, conn)
    return df


# ---------------------------------------------------------------------------
# Daily revenue time series → Holt-Winters forecast
# ---------------------------------------------------------------------------
def load_daily_revenue(window_days: int = 365) -> pd.Series:
    """Сумма выручки по дням за окно window_days.

    Возвращает pd.Series с DatetimeIndex (ровно window_days точек,
    пропущенные дни заполнены 0). Используется forecast-моделью.
    """
    if not _has_db():
        return _fallback_or_raise("daily_revenue", days=window_days)

    query = text(
        """
        SELECT
            date_trunc('day', COALESCE(b."updatedAt", b."createdAt")) AS day,
            SUM(b."totalPrice"::float)                                AS revenue
        FROM bookings b
        WHERE b.status IN ('confirmed', 'completed')
          AND COALESCE(b."updatedAt", b."createdAt") >= NOW() - make_interval(days => :wd)
        GROUP BY day
        ORDER BY day
        """
    )
    with get_engine().connect() as conn:
        df = pd.read_sql(query, conn, params={"wd": int(window_days)})

    if df.empty:
        # пустая БД — возвращаем нулевую серию нужной длины
        idx = pd.date_range(end=datetime.utcnow().date(), periods=window_days, freq="D")
        return pd.Series(0.0, index=idx, name="revenue")

    df["day"] = pd.to_datetime(df["day"])
    series = df.set_index("day")["revenue"].astype(float)
    # выравниваем на непрерывную дневную шкалу
    full_idx = pd.date_range(end=series.index.max(), periods=window_days, freq="D")
    return series.reindex(full_idx, fill_value=0.0)


# ---------------------------------------------------------------------------
# Recent transactions → anomaly detection
# ---------------------------------------------------------------------------
def load_recent_transactions(limit: int = 1000, window_days: int = 180) -> pd.DataFrame:
    """user_id, amount, created_at — последние транзакции для anomaly-модели."""
    if not _has_db():
        return _fallback_or_raise("recent_transactions",
                                  n_users=500, days=window_days)

    query = text(
        """
        SELECT
            "userId"::text       AS user_id,
            "amount"::float      AS amount,
            "createdAt"          AS created_at
        FROM payments
        WHERE status = 'completed'
          AND "createdAt" >= NOW() - make_interval(days => :wd)
        ORDER BY "createdAt" DESC
        LIMIT :lim
        """
    )
    with get_engine().connect() as conn:
        df = pd.read_sql(query, conn, params={"wd": int(window_days), "lim": int(limit)})
    if df.empty:
        return pd.DataFrame(columns=["user_id", "amount", "created_at"])
    df["created_at"] = pd.to_datetime(df["created_at"])
    return df


# ---------------------------------------------------------------------------
# Active events catalogue
# ---------------------------------------------------------------------------
def load_active_events() -> pd.DataFrame:
    """Каталог активных/предстоящих событий для ранжирования."""
    if not _has_db():
        return _fallback_or_raise("events", n_users=1500)

    query = text(
        """
        SELECT
            id                                                            AS event_id,
            COALESCE(category, 'misc')                                    AS category,
            COALESCE(participants, 0)                                     AS participants
        FROM events
        WHERE status IN ('active', 'upcoming')
        """
    )
    with get_engine().connect() as conn:
        df = pd.read_sql(query, conn)
    return df
