import numpy as np
import pandas as pd
import pytest

from fxbot.live import LossLimitExceeded, Trader
from tests.conftest import make_ohlc


class FakeClient:
    def __init__(self, candles: pd.DataFrame, nav: float = 1_000_000):
        self.candles = candles
        self.nav_value = nav
        self.units = 0
        self.orders: list[tuple[str, int]] = []

    def nav(self) -> float:
        return self.nav_value

    def recent_candles(self, instrument, granularity, count):
        return self.candles.iloc[-count:]

    def net_units(self, instrument) -> int:
        return self.units

    def open_position(self, instrument, units, stop_loss_distance):
        self.orders.append(("open", units))
        self.units += units

    def reduce_position(self, instrument, units):
        self.orders.append(("reduce", units))
        self.units += units


class FixedModel:
    """常に同じ上昇確率を返すモデル"""

    def __init__(self, up_proba: float):
        self.up_proba = up_proba

    def predict_proba(self, X):
        return np.tile([1 - self.up_proba, self.up_proba], (len(X), 1))


def make_trader(client: FakeClient, up_proba: float) -> Trader:
    return Trader(
        client=client,
        model=FixedModel(up_proba),
        instrument="USD_JPY",
        granularity="H1",
        units=1000,
        threshold=0.55,
        stop_loss_distance=0.5,
        max_loss_ratio=0.05,
    )


def test_opens_long_on_bullish_prediction():
    client = FakeClient(make_ohlc(400))
    make_trader(client, 0.7).step()
    assert client.orders == [("open", 1000)]


def test_reverses_position():
    client = FakeClient(make_ohlc(400))
    client.units = 1000
    make_trader(client, 0.3).step()
    assert client.orders == [("reduce", -1000), ("open", -1000)]


def test_flat_prediction_only_closes():
    client = FakeClient(make_ohlc(400))
    client.units = -1000
    make_trader(client, 0.5).step()
    assert client.orders == [("reduce", 1000)]


def test_skips_same_bar():
    client = FakeClient(make_ohlc(400))
    trader = make_trader(client, 0.7)
    trader.step()
    client.units = 0
    trader.step()
    assert client.orders == [("open", 1000)]


def test_stops_when_loss_limit_exceeded():
    client = FakeClient(make_ohlc(400))
    client.units = 1000
    trader = make_trader(client, 0.7)
    client.nav_value = 940_000
    with pytest.raises(LossLimitExceeded):
        trader.step()
    assert client.orders == [("reduce", -1000)]
