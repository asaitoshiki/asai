import numpy as np
import pandas as pd
import pytest


def make_ohlc(n: int, seed: int = 0) -> pd.DataFrame:
    """ランダムウォークの合成1時間足"""
    rng = np.random.default_rng(seed)
    close = 150 * np.exp(np.cumsum(rng.normal(0, 0.001, n)))
    open_ = np.concatenate([[close[0]], close[:-1]])
    wiggle = np.abs(rng.normal(0, 0.0005, n)) * close
    index = pd.date_range("2024-01-01", periods=n, freq="h", tz="UTC", name="time")
    return pd.DataFrame(
        {
            "open": open_,
            "high": np.maximum(open_, close) + wiggle,
            "low": np.minimum(open_, close) - wiggle,
            "close": close,
            "volume": rng.integers(100, 1000, n),
        },
        index=index,
    )


@pytest.fixture
def ohlc() -> pd.DataFrame:
    return make_ohlc(1500)
