from data.synthetic import generate_synthetic_dataset
from models.rfm import compute_rfm, recompute_segments, fallback_levels_by_index


def test_compute_rfm_produces_three_columns():
    ds = generate_synthetic_dataset(n_users=300, seed=1)
    rfm = compute_rfm(ds.activity)
    assert set(rfm.columns) >= {"user_id", "recency", "frequency", "monetary"}
    assert (rfm["frequency"] > 0).all()
    assert (rfm["monetary"] >= 0).all()


def test_recompute_segments_returns_four_levels():
    ds = generate_synthetic_dataset(n_users=800, seed=2)
    result = recompute_segments(ds.activity)
    assert set(result.distribution.keys()) == {"Bronze", "Silver", "Gold", "Platinum"}
    assert sum(result.distribution.values()) == result.n_users
    # Силуэт должен быть положительным при разделимых сегментах
    assert result.silhouette > 0
    # Platinum в среднем должен иметь больший monetary, чем Bronze
    assert result.distribution["Bronze"] > 0
    assert result.distribution["Platinum"] > 0


def test_fallback_levels_by_index():
    ds = generate_synthetic_dataset(n_users=500, seed=3)
    rfm = compute_rfm(ds.activity)
    levels = fallback_levels_by_index(rfm)
    assert len(levels) == len(rfm)
    assert set(levels.values()).issubset({"Bronze", "Silver", "Gold", "Platinum"})


def test_segmenter_save_and_load(tmp_path):
    from models.rfm import RFMSegmenter

    ds = generate_synthetic_dataset(n_users=400, seed=4)
    rfm = compute_rfm(ds.activity)
    seg = RFMSegmenter()
    seg.fit(rfm)

    path = tmp_path / "rfm.pkl"
    seg.save(path)
    loaded = RFMSegmenter.load(path)

    sample = rfm.head(10)
    a = seg.predict(sample)
    b = loaded.predict(sample)
    assert a == b
