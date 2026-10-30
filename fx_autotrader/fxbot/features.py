import numpy as np
import pandas as pd

RETURN_LAGS = [1, 3, 6, 12, 24]
MA_WINDOWS = [10, 25, 50]


def _rsi(close: pd.Series, window: int = 14) -> pd.Series:
    diff = close.diff()
    gain = diff.clip(lower=0).rolling(window).mean()
    loss = (-diff.clip(upper=0)).rolling(window).mean()
    return 100 - 100 / (1 + gain / loss)


def _atr(df: pd.DataFrame, window: int = 14) -> pd.Series:
    prev_close = df["close"].shift(1)
    true_range = pd.concat(
        [df["high"] - df["low"], (df["high"] - prev_close).abs(), (df["low"] - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    return true_range.rolling(window).mean()


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """各時点で過去データのみを使った特徴量を作る（未来の値は参照しない）"""
    close = df["close"]
    log_close = np.log(close)
    ret_1 = log_close.diff()

    features = {f"ret_{n}": log_close.diff(n) for n in RETURN_LAGS}
    features |= {f"ma_gap_{n}": close / close.rolling(n).mean() - 1 for n in MA_WINDOWS}
    features["rsi_14"] = _rsi(close)
    features["vol_24"] = ret_1.rolling(24).std()
    features["atr_ratio"] = _atr(df) / close
    features["range_ratio"] = (df["high"] - df["low"]) / close
    # 時間帯による値動きの癖を捉えるため時刻を周期表現にする
    hour = df.index.hour
    features["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    features["hour_cos"] = np.cos(2 * np.pi * hour / 24)

    return pd.DataFrame(features, index=df.index)


def make_labels(close: pd.Series, horizon: int) -> pd.Series:
    """horizon 本先の終値が現在より高ければ 1、そうでなければ 0（未来が無い末尾は NaN）"""
    future = close.shift(-horizon)
    return (future > close).astype(float).where(future.notna()).rename("label")
