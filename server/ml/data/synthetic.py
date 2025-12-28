"""Генератор синтетического датасета для обучения и тестирования.

Имитирует четыре поведенческих сегмента (Bronze/Silver/Gold/Platinum) с
реалистичными распределениями частоты бронирований, среднего чека и
истории участия в событиях.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

import numpy as np
import pandas as pd


EVENT_CATEGORIES = ["gastro", "spa", "sport", "culture", "business", "auction"]
SEG_PARAMS = {
    # name:        (share, freq_lambda, avg_price_mu, recency_scale, churn_rate)
    "Bronze":   (0.40, 0.5, 6_000,   180, 0.45),
    "Silver":   (0.34, 1.5, 18_000,  90,  0.20),
    "Gold":     (0.18, 3.5, 55_000,  40,  0.08),
    "Platinum": (0.08, 7.0, 150_000, 18,  0.03),
}


@dataclass
class SyntheticDataset:
    activity: pd.DataFrame          # для RFM
    churn_features: pd.DataFrame    # для churn-классификатора и LTV
    user_events: pd.DataFrame       # long: user × event × category
    events: pd.DataFrame            # каталог
    daily_revenue: pd.Series        # для forecast (Holt-Winters)
    recent_transactions: pd.DataFrame  # для anomaly-детектора


def _draw_segment(rng: np.random.Generator, n: int) -> np.ndarray:
    names = list(SEG_PARAMS.keys())
    probs = np.array([p[0] for p in SEG_PARAMS.values()])
    probs = probs / probs.sum()
    return rng.choice(names, size=n, p=probs)


def generate_synthetic_dataset(
    n_users: int = 1500, days: int = 365, n_events: int = 80, seed: int = 42
) -> SyntheticDataset:
    rng = np.random.default_rng(seed)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    segments = _draw_segment(rng, n_users)
    user_ids = [f"u_{i:05d}" for i in range(n_users)]

    # ---------- activity: бронирования ----------
    rows = []
    churn_rows = []
    for uid, seg in zip(user_ids, segments):
        share, lam, price_mu, rec_scale, churn_p = SEG_PARAMS[seg]
        # сколько бронирований за период
        n_bookings = int(rng.poisson(lam * (days / 365) * 4))  # ~4× за год для Platinum
        if n_bookings == 0:
            cancelled = 0
            total_spent = 0.0
            last_tx = today - timedelta(days=int(rng.exponential(rec_scale) + 30))
            avg_price = 0.0
        else:
            for _ in range(n_bookings):
                # цена ~lognormal вокруг seg-mu
                price = float(rng.lognormal(np.log(price_mu), 0.4))
                # дата бронирования
                offset = int(rng.exponential(rec_scale))
                tx_date = today - timedelta(days=min(offset, days - 1))
                rows.append({
                    "user_id": uid,
                    "booking_id": len(rows) + 1,
                    "total_price": price,
                    "last_tx_date": tx_date,
                })
            user_rows = [r for r in rows if r["user_id"] == uid]
            cancelled = int(rng.binomial(len(user_rows), 0.07))
            total_spent = sum(r["total_price"] for r in user_rows)
            avg_price = total_spent / max(len(user_rows), 1)
            last_tx = max(r["last_tx_date"] for r in user_rows)

        days_since_last_booking = (today - last_tx).days
        days_since_registration = int(rng.uniform(30, 1200))
        days_since_last_login = int(rng.exponential(rec_scale / 2))
        days_since_last_payment = max(days_since_last_booking - int(rng.uniform(0, 5)), 0)
        membership_numeric = {"Bronze": 1, "Silver": 2, "Gold": 3, "Platinum": 4}[seg]
        days_since_level_change = int(rng.uniform(1, 365))
        notif_read = float(np.clip(rng.normal({"Bronze": 0.2, "Silver": 0.4,
                                                "Gold": 0.6, "Platinum": 0.75}[seg], 0.15), 0, 1))
        referrals = int(rng.poisson({"Bronze": 0.1, "Silver": 0.4,
                                      "Gold": 1.0, "Platinum": 2.0}[seg]))
        loyalty_balance = float(rng.uniform(0, total_spent * 0.05 + 100))
        total_payments = max(n_bookings - cancelled, 0)
        cancelled_ratio = (cancelled / n_bookings) if n_bookings > 0 else 0.0

        # метка оттока: больше шанса для seg с высоким churn_p,
        # длительной паузы и низкой вовлечённости
        base = churn_p
        recency_mod = min(days_since_last_booking / 150, 1.0) * 0.55
        engagement_mod = (1.0 - notif_read) * 0.15
        churn_prob = min(base + recency_mod + engagement_mod, 0.95)
        churned = int(rng.random() < churn_prob)

        churn_rows.append({
            "user_id": uid,
            "segment": seg,
            "days_since_registration": days_since_registration,
            "days_since_last_booking": days_since_last_booking,
            "days_since_last_payment": days_since_last_payment,
            "days_since_last_login": days_since_last_login,
            "total_bookings_count": n_bookings,
            "total_payments_count": total_payments,
            "total_spent": total_spent,
            "avg_booking_value": avg_price,
            "cancelled_bookings_ratio": cancelled_ratio,
            "loyalty_balance": loyalty_balance,
            "referrals_count": referrals,
            "notifications_read_ratio": notif_read,
            "membership_level_numeric": membership_numeric,
            "days_since_level_change": days_since_level_change,
            "churned": churned,
        })

    activity_df = pd.DataFrame(rows)
    churn_df = pd.DataFrame(churn_rows)

    # ---------- events catalog ----------
    event_ids = list(range(1, n_events + 1))
    categories = rng.choice(EVENT_CATEGORIES, size=n_events)
    participants = rng.integers(5, 60, size=n_events)
    events_df = pd.DataFrame({
        "event_id": event_ids,
        "category": categories,
        "participants": participants,
    })

    # ---------- user × event ----------
    ue_rows = []
    seg_category_pref = {
        "Bronze":   {"gastro": 0.30, "spa": 0.10, "sport": 0.20,
                     "culture": 0.20, "business": 0.05, "auction": 0.15},
        "Silver":   {"gastro": 0.35, "spa": 0.20, "sport": 0.15,
                     "culture": 0.20, "business": 0.05, "auction": 0.05},
        "Gold":     {"gastro": 0.30, "spa": 0.25, "sport": 0.10,
                     "culture": 0.15, "business": 0.15, "auction": 0.05},
        "Platinum": {"gastro": 0.20, "spa": 0.25, "sport": 0.05,
                     "culture": 0.10, "business": 0.25, "auction": 0.15},
    }
    for uid, seg in zip(user_ids, segments):
        n_events_user = int(rng.poisson(
            {"Bronze": 0.5, "Silver": 1.5, "Gold": 3.0, "Platinum": 5.0}[seg]
        ))
        if n_events_user == 0:
            continue
        prefs = seg_category_pref[seg]
        for _ in range(n_events_user):
            cat = rng.choice(list(prefs.keys()), p=list(prefs.values()))
            cat_events = events_df[events_df["category"] == cat]["event_id"].tolist()
            if not cat_events:
                continue
            eid = int(rng.choice(cat_events))
            ue_rows.append({"user_id": uid, "event_id": eid, "category": cat})

    user_events_df = pd.DataFrame(ue_rows).drop_duplicates(subset=["user_id", "event_id"])

    # ---------- daily revenue (для Holt-Winters прогноза) ----------
    if activity_df.empty:
        idx = pd.date_range(end=today, periods=days, freq="D")
        daily_rev = pd.Series(0.0, index=idx, name="revenue")
    else:
        rev_by_day = (
            activity_df.assign(day=pd.to_datetime(activity_df["last_tx_date"]).dt.normalize())
            .groupby("day")["total_price"].sum()
        )
        # сезонность недельная + лёгкий рост (≈+0.4% в день)
        full_idx = pd.date_range(end=today, periods=days, freq="D")
        rev_by_day = rev_by_day.reindex(full_idx, fill_value=0.0)
        weekday_mult = np.array([0.85, 0.90, 0.95, 1.00, 1.20, 1.35, 1.10])  # сб/пт пик
        trend = np.linspace(0.9, 1.15, num=days)
        noise = rng.normal(1.0, 0.06, size=days)
        seasonal = weekday_mult[full_idx.dayofweek]
        daily_rev = (rev_by_day.to_numpy() * seasonal * trend * noise).clip(min=0)
        daily_rev = pd.Series(daily_rev, index=full_idx, name="revenue")

    # ---------- recent transactions (для anomaly) ----------
    if activity_df.empty:
        tx_df = pd.DataFrame(columns=["user_id", "amount", "created_at"])
    else:
        tx_df = activity_df[["user_id", "total_price", "last_tx_date"]].rename(
            columns={"total_price": "amount", "last_tx_date": "created_at"}
        ).copy()
        # внедряем ~3% настоящих аномалий: ночные крупные платежи
        n_anomalies = max(int(len(tx_df) * 0.03), 5) if len(tx_df) >= 50 else 0
        if n_anomalies > 0:
            anomaly_idx = rng.choice(tx_df.index, size=n_anomalies, replace=False)
            tx_df.loc[anomaly_idx, "amount"] = tx_df.loc[anomaly_idx, "amount"] * rng.uniform(
                5, 12, size=n_anomalies
            )
            tx_df.loc[anomaly_idx, "created_at"] = tx_df.loc[anomaly_idx, "created_at"].apply(
                lambda d: d.replace(hour=int(rng.integers(2, 5)),
                                    minute=int(rng.integers(0, 60)))
            )
        # обычные транзакции — равномерное время в течение дня
        normal_mask = ~tx_df.index.isin(
            anomaly_idx if n_anomalies > 0 else []
        )
        for i in tx_df[normal_mask].index:
            tx_df.at[i, "created_at"] = tx_df.at[i, "created_at"].replace(
                hour=int(rng.integers(8, 23)),
                minute=int(rng.integers(0, 60)),
            )

    return SyntheticDataset(
        activity=activity_df,
        churn_features=churn_df,
        user_events=user_events_df,
        events=events_df,
        daily_revenue=daily_rev,
        recent_transactions=tx_df,
    )
