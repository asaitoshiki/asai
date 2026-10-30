from dataclasses import dataclass

import numpy as np
import pandas as pd

from fxbot.features import build_features, make_labels
from fxbot.model import new_model, predict_up_proba, to_position


@dataclass(frozen=True)
class BacktestResult:
    returns: pd.Series
    positions: pd.Series
    equity: pd.Series
    metrics: dict


def walk_forward_proba(df: pd.DataFrame, horizon: int, train_size: int, test_size: int) -> pd.Series:
    """学習期間をずらしながら再学習し、常に未学習の期間だけを予測する"""
    data = build_features(df).join(make_labels(df["close"], horizon)).dropna()
    X, y = data.drop(columns="label"), data["label"]
    assert len(data) > train_size, "データが学習期間より短い"

    chunks = []
    for start in range(0, len(data) - train_size, test_size):
        # 学習末尾 horizon 本のラベルはテスト期間の価格を参照するので除外する（リーク防止）
        train_end = start + train_size - horizon
        test_start = start + train_size
        model = new_model().fit(X.iloc[start:train_end], y.iloc[start:train_end])
        chunks.append(predict_up_proba(model, X.iloc[test_start : test_start + test_size]))
    return pd.concat(chunks)


def evaluate(close: pd.Series, positions: pd.Series, spread: float, bars_per_year: int) -> BacktestResult:
    """t 時点の終値で決めたポジションを t→t+1 の値動きで評価する。ポジション変更ごとにスプレッドを差し引く"""
    next_return = close.pct_change().shift(-1).loc[positions.index]
    turnover = positions.diff().fillna(positions).abs()
    cost = turnover * spread / close.loc[positions.index]
    returns = (positions * next_return - cost).dropna()
    equity = (1 + returns).cumprod()

    metrics = {
        "total_return": equity.iloc[-1] - 1,
        "sharpe": returns.mean() / returns.std() * np.sqrt(bars_per_year),
        "max_drawdown": (equity / equity.cummax() - 1).min(),
        "trades": int((turnover > 0).sum()),
        "exposure": float((positions != 0).mean()),
        "buy_and_hold": close.loc[returns.index[-1]] / close.loc[returns.index[0]] - 1,
    }
    return BacktestResult(returns=returns, positions=positions, equity=equity, metrics=metrics)


def run(
    df: pd.DataFrame,
    horizon: int,
    train_size: int,
    test_size: int,
    threshold: float,
    spread: float,
    bars_per_year: int,
) -> BacktestResult:
    up_proba = walk_forward_proba(df, horizon, train_size, test_size)
    return evaluate(df["close"], to_position(up_proba, threshold), spread, bars_per_year)
