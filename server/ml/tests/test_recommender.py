from data.synthetic import generate_synthetic_dataset
from models.recommender import HybridRecommender


def test_recommender_fits():
    ds = generate_synthetic_dataset(n_users=500, seed=20)
    rec = HybridRecommender(alpha=0.5)
    metrics = rec.fit(ds.user_events, ds.events)
    assert metrics.n_events == len(ds.events)
    assert metrics.n_users > 0
    assert metrics.n_interactions > 0


def test_recommender_returns_k_items_for_existing_user():
    ds = generate_synthetic_dataset(n_users=800, seed=21)
    rec = HybridRecommender()
    rec.fit(ds.user_events, ds.events)

    existing = ds.user_events["user_id"].iloc[0]
    recs = rec.rank_for_user(existing, k=5)
    assert len(recs) <= 5
    assert all(isinstance(eid, int) and isinstance(s, float) for eid, s in recs)
    # рекомендуемые события не должны пересекаться с историей пользователя
    seen = set(ds.user_events.loc[ds.user_events["user_id"] == existing, "event_id"])
    assert all(eid not in seen for eid, _ in recs)


def test_recommender_cold_start_falls_back_to_popular():
    ds = generate_synthetic_dataset(n_users=400, seed=22)
    rec = HybridRecommender()
    rec.fit(ds.user_events, ds.events)
    recs = rec.rank_for_user("u_unknown_12345", k=5)
    assert len(recs) == 5
    # популярность убывает
    scores = [s for _, s in recs]
    assert scores == sorted(scores, reverse=True)


def test_recommender_save_load(tmp_path):
    ds = generate_synthetic_dataset(n_users=300, seed=23)
    rec = HybridRecommender()
    rec.fit(ds.user_events, ds.events)
    p = tmp_path / "recsys.pkl"
    rec.save(p)
    loaded = HybridRecommender.load(p)

    uid = ds.user_events["user_id"].iloc[0]
    a = rec.rank_for_user(uid, k=5)
    b = loaded.rank_for_user(uid, k=5)
    assert a == b
