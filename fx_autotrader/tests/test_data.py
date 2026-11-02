import pandas as pd

from fxbot.data import combine, hourly_spread_profile


def make(index: pd.DatetimeIndex, close: float, spread: float | None) -> pd.DataFrame:
    df = pd.DataFrame({"open": close, "high": close, "low": close, "close": close}, index=index)
    return df if spread is None else df.assign(spread=spread)


def test_combine_applies_recent_hourly_spread_and_prefers_recent():
    history = make(pd.date_range("2024-01-01", periods=48, freq="h", tz="UTC"), 1.0, None)
    recent_index = pd.date_range("2024-01-02", periods=48, freq="h", tz="UTC")
    # 日本時間6時（UTC 21時）だけスプレッドが広い
    recent = make(recent_index, 2.0, 0.005).assign(spread=lambda d: d["spread"].where(d.index.hour != 21, 0.12))

    df = combine(history, recent, recent_days=30)

    assert df.index.is_unique and df.index.is_monotonic_increasing
    older = df[df.index < recent_index[0]]
    assert (older["close"] == 1.0).all() and (df.loc[recent_index, "close"] == 2.0).all()
    assert older.loc[older.index.hour == 21, "spread"].eq(0.12).all()
    assert older.loc[older.index.hour != 21, "spread"].eq(0.005).all()


def test_hourly_spread_profile_uses_only_recent_days():
    index = pd.date_range("2024-01-01", periods=24 * 10, freq="h", tz="UTC")
    df = make(index, 1.0, 0.002).assign(spread=lambda d: d["spread"].where(d.index < index[-1] - pd.Timedelta(days=3), 0.005))
    assert (hourly_spread_profile(df, recent_days=2) == 0.005).all()
