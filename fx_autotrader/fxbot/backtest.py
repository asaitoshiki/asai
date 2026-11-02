from dataclasses import dataclass

import numpy as np
import pandas as pd

from fxbot.config import SPREAD_WINDOW
from fxbot.features import build_features, make_labels
from fxbot.model import new_model, predict_up_proba, to_position


@dataclass(frozen=True)
class BacktestResult:
    returns: pd.Series
    positions: pd.Series
    equity: pd.Series
    metrics: dict


def walk_forward_proba(
    df: pd.DataFrame, horizon: int, train_size: int, test_size: int, train_window: int
) -> pd.Series:
    """学習期間をずらしながら再学習し、常に未学習の期間だけを予測する

    train_size 本たまってから予測を始め、各回は直近 train_window 本で学習する（全期間より大きければ全データで学習）
    """
    data = build_features(df).join(make_labels(df["close"], horizon)).dropna()
    X, y = data.drop(columns="label"), data["label"]
    assert len(data) > train_size, "データが学習期間より短い"

    chunks = []
    for test_start in range(train_size, len(data), test_size):
        # 学習末尾 horizon 本のラベルはテスト期間の価格を参照するので除外する（リーク防止）
        train_end = test_start - horizon
        train_start = max(0, train_end - train_window)
        model = new_model().fit(X.iloc[train_start:train_end], y.iloc[train_start:train_end])
        chunks.append(predict_up_proba(model, X.iloc[test_start : test_start + test_size]))
    return pd.concat(chunks)


def spread_allowed(spread: pd.Series, max_spread_ratio: float) -> pd.Series:
    """各足のスプレッドが、直近 SPREAD_WINDOW 本の中央値（ふだんのスプレッド）の max_spread_ratio 倍以内か"""
    typical = spread.rolling(SPREAD_WINDOW, min_periods=1).median()
    return spread <= typical * max_spread_ratio


def apply_spread_filter(positions: pd.Series, spread: pd.Series, max_spread_ratio: float) -> pd.Series:
    """スプレッドがふだんより広い足ではポジションを変えず、直前のポジションを維持する"""
    allowed = spread_allowed(spread, max_spread_ratio).loc[positions.index]
    return positions.where(allowed).ffill().fillna(0).astype(int)


def unit_cost(spread: pd.Series, fee: float) -> pd.Series:
    """1通貨を売買するときの片道コスト。仲値基準なので片道でスプレッドの半分＋手数料"""
    return spread / 2 + fee


def evaluate(close: pd.Series, positions: pd.Series, cost: pd.Series, bars_per_year: int) -> BacktestResult:
    """t 時点の終値で決めたポジションを t→t+1 の値動きで評価する。売買1単位ごとにその足の片道コストを差し引く"""
    next_return = close.pct_change().shift(-1).loc[positions.index]
    turnover = positions.diff().fillna(positions).abs()
    cost_return = turnover * cost.loc[positions.index] / close.loc[positions.index]
    returns = (positions * next_return - cost_return).dropna()
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
    train_window: int,
    threshold: float,
    max_spread_ratio: float,
    fee: float,
    bars_per_year: int,
) -> BacktestResult:
    up_proba = walk_forward_proba(df, horizon, train_size, test_size, train_window)
    positions = apply_spread_filter(to_position(up_proba, threshold), df["spread"], max_spread_ratio)
    return evaluate(df["close"], positions, unit_cost(df["spread"], fee), bars_per_year)
