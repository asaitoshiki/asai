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
    cost = pd.Series([1.0, 2.0, 1.0, 1.0])
    result = backtest.evaluate(close, positions, cost, bars_per_year=1)

    # 1本目: 買いで +10% から新規コスト 1/100、2本目: ドテン(2単位)で -(-10%) からその足のコスト 2×2/110
    expected = [0.10 - 0.01, 0.10 - 4 / 110, 0.0]
    np.testing.assert_allclose(result.returns.to_numpy(), expected)
    assert result.metrics["trades"] == 2


def test_unit_cost_is_half_spread_plus_fee():
    np.testing.assert_allclose(backtest.unit_cost(pd.Series([0.002, 0.02]), fee=0.002), [0.003, 0.012])


def test_spread_filter_holds_previous_position():
    positions = pd.Series([1, 1, -1, -1, 0])
    spread = pd.Series([0.002, 0.002, 0.02, 0.002, 0.02])
    # 3本目と5本目はふだんの中央値（0.002）の1.5倍を超えるので、ポジションを変えずに持ち越す
    assert backtest.apply_spread_filter(positions, spread, max_spread_ratio=1.5).tolist() == [1, 1, 1, -1, -1]


def test_spread_filter_follows_spread_revision():
    # ブローカーがスプレッドを 0.002 → 0.005 に改定しても、しばらくすると改定後の水準で売買できるようになること
    spread = pd.Series([0.002] * 200 + [0.005] * 200)
    allowed = backtest.spread_allowed(spread, max_spread_ratio=1.5)
    assert not allowed.iloc[200]
    assert allowed.iloc[-1]


def test_walk_forward_predicts_only_out_of_sample(ohlc):
    proba = backtest.walk_forward_proba(ohlc, horizon=4, train_size=800, test_size=200, train_window=800)
    # 特徴量のウォームアップ後、学習期間を超えた位置から予測が始まること
    assert proba.index[0] > ohlc.index[800]
    assert proba.between(0, 1).all()
    assert proba.index.is_unique


def test_walk_forward_expanding_window_covers_same_period(ohlc):
    rolling = backtest.walk_forward_proba(ohlc, horizon=4, train_size=800, test_size=200, train_window=800)
    expanding = backtest.walk_forward_proba(ohlc, horizon=4, train_size=800, test_size=200, train_window=10**6)
    assert expanding.index.equals(rolling.index)


def test_run_returns_metrics(ohlc):
    result = backtest.run(
        ohlc,
        horizon=4,
        train_size=800,
        test_size=200,
        train_window=800,
        threshold=0.55,
        max_spread_ratio=1.5,
        fee=0.002,
        bars_per_year=6240,
    )
    assert set(result.metrics) == {"total_return", "sharpe", "max_drawdown", "trades", "exposure", "buy_and_hold"}
    assert result.metrics["max_drawdown"] <= 0
    # スプレッドが広い足ではポジションが変わらないこと
    wide = ohlc["spread"].loc[result.positions.index] > 0.003
    assert (result.positions.diff().fillna(0)[wide] == 0).all()


def test_walk_forward_requires_enough_data(ohlc):
    with pytest.raises(AssertionError):
        backtest.walk_forward_proba(ohlc, horizon=4, train_size=5000, test_size=200, train_window=5000)
