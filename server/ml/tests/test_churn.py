from data.synthetic import generate_synthetic_dataset
from models.churn import FEATURES, ChurnClassifier


def test_churn_features_list_matches_synthetic_columns():
    ds = generate_synthetic_dataset(n_users=200, seed=10)
    df = ds.churn_features
    for f in FEATURES:
        assert f in df.columns, f"feature {f} missing"
    assert "churned" in df.columns


def test_churn_classifier_trains_and_reaches_targets():
    ds = generate_synthetic_dataset(n_users=2000, seed=11)
    clf = ChurnClassifier(n_estimators=100, max_depth=3)
    metrics = clf.fit(ds.churn_features)

    # на синтетике с сигнальными признаками результаты должны быть высокими
    assert metrics.roc_auc >= 0.80, f"ROC-AUC too low: {metrics.roc_auc}"
    assert 0.0 <= metrics.precision <= 1.0
    assert 0.0 <= metrics.recall <= 1.0
    assert metrics.n_train + metrics.n_test == len(ds.churn_features)
    # Признак days_since_last_booking должен быть в топе важности
    top3 = list(metrics.feature_importance.keys())[:3]
    assert "days_since_last_booking" in top3


def test_churn_predict_one():
    ds = generate_synthetic_dataset(n_users=1500, seed=12)
    clf = ChurnClassifier()
    clf.fit(ds.churn_features)
    row = ds.churn_features.iloc[0].to_dict()
    p = clf.predict_one(row)
    assert 0.0 <= p <= 1.0


def test_churn_save_load(tmp_path):
    ds = generate_synthetic_dataset(n_users=1000, seed=13)
    clf = ChurnClassifier()
    clf.fit(ds.churn_features)

    path = tmp_path / "churn.pkl"
    clf.save(path)
    loaded = ChurnClassifier.load(path)
    assert loaded.trained

    row = ds.churn_features.iloc[5].to_dict()
    assert abs(clf.predict_one(row) - loaded.predict_one(row)) < 1e-9
