import numpy as np
import pandas as pd
import pytest

from fxbot import backtest
from fxbot.model import to_position


def test_to_position():
    proba = pd.Series([0.7, 0.5, 0.3])
    assert to_position(proba, 0.6).tolist() == [1, 0, -1]


def test_evaluate_applies_return_and_cost():
    close = pd.Series([100.0, 110.0, 99.0, 99.0])
    positions = pd.Series([1, -1, -1], index=close.index[:3])
    result = backtest.evaluate(close, positions, cost=1.0, bars_per_year=1)

    # 1本目: 買いで +10% から新規コスト 1/100、2本目: ドテン(2単位)で -(-10%) からコスト 2/110
    expected = [0.10 - 0.01, 0.10 - 2 / 110, 0.0]
    np.testing.assert_allclose(result.returns.to_numpy(), expected)
    assert result.metrics["trades"] == 2


def test_walk_forward_predicts_only_out_of_sample(ohlc):
    proba = backtest.walk_forward_proba(ohlc, horizon=4, train_size=800, test_size=200)
    # 特徴量のウォームアップ後、学習期間を超えた位置から予測が始まること
    assert proba.index[0] > ohlc.index[800]
    assert proba.between(0, 1).all()
    assert proba.index.is_unique


def test_run_returns_metrics(ohlc):
    result = backtest.run(
        ohlc, horizon=4, train_size=800, test_size=200, threshold=0.55, cost=0.003, bars_per_year=6240
    )
    assert set(result.metrics) == {"total_return", "sharpe", "max_drawdown", "trades", "exposure", "buy_and_hold"}
    assert result.metrics["max_drawdown"] <= 0


def test_walk_forward_requires_enough_data(ohlc):
    with pytest.raises(AssertionError):
        backtest.walk_forward_proba(ohlc, horizon=4, train_size=5000, test_size=200)
