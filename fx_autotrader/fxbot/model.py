from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier

from fxbot.features import build_features, make_labels


def new_model() -> HistGradientBoostingClassifier:
    # 過学習を抑えるため浅い木・強めの正則化にしている
    return HistGradientBoostingClassifier(
        max_depth=3,
        learning_rate=0.05,
        max_iter=200,
        l2_regularization=1.0,
        random_state=0,
    )


def training_set(df: pd.DataFrame, horizon: int) -> tuple[pd.DataFrame, pd.Series]:
    data = build_features(df).join(make_labels(df["close"], horizon)).dropna()
    return data.drop(columns="label"), data["label"]


def train(df: pd.DataFrame, horizon: int) -> HistGradientBoostingClassifier:
    X, y = training_set(df, horizon)
    return new_model().fit(X, y)


def predict_up_proba(model: HistGradientBoostingClassifier, X: pd.DataFrame) -> pd.Series:
    return pd.Series(model.predict_proba(X)[:, 1], index=X.index)


def to_position(up_proba: pd.Series, threshold: float) -> pd.Series:
    """上昇確率が閾値を超えたら買い(+1)、1-閾値を下回ったら売り(-1)、それ以外はノーポジ(0)"""
    position = np.select([up_proba > threshold, up_proba < 1 - threshold], [1, -1], 0)
    return pd.Series(position, index=up_proba.index)


def save(model: HistGradientBoostingClassifier, path: Path, horizon: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "horizon": horizon}, path)


def load(path: Path) -> HistGradientBoostingClassifier:
    return joblib.load(path)["model"]
