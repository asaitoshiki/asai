import lzma
import time

import numpy as np
import pandas as pd
import requests

DATAFEED_URL = "https://datafeed.dukascopy.com/datafeed"

# 1時間足ファイルの1レコード（24バイト、ビッグエンディアン）: 月初からの秒数、始値、終値、安値、高値（整数ポイント）、出来高
HOUR_CANDLE = np.dtype(
    [("offset", ">u4"), ("open", ">u4"), ("close", ">u4"), ("low", ">u4"), ("high", ">u4"), ("volume", ">f4")]
)
# 整数ポイントを価格に戻す倍率（クロス円は小数3桁、それ以外は5桁）
POINT_SCALES = {"JPY": 1_000}


def parse_hour_candles(raw: bytes, month_start: pd.Timestamp, scale: int) -> pd.DataFrame:
    """1か月分の .bi5（LZMA 圧縮）を OHLC の DataFrame に変換する"""
    # データの無い月は空ファイルが返る
    if not raw:
        return pd.DataFrame(columns=["open", "high", "low", "close"], dtype=float)
    records = np.frombuffer(lzma.decompress(raw), dtype=HOUR_CANDLE)
    # 週末など取引の無い時間も出来高0の足として入っているので除く
    records = records[records["volume"] > 0]
    index = (month_start + pd.to_timedelta(records["offset"], unit="s")).rename("time")
    return pd.DataFrame({c: records[c] / scale for c in ["open", "high", "low", "close"]}, index=index)


class DukascopyData:
    """Dukascopy の公開ヒストリカルデータ（1時間足）。学習用の長期データとして使う"""

    def __init__(self, session: requests.Session | None = None, request_interval: float = 0.2):
        self.session = session or requests.Session()
        self.request_interval = request_interval

    def _month(self, symbol: str, month_start: pd.Timestamp, price_type: str, scale: int) -> pd.DataFrame:
        # URL の月は0始まり（1月が00）
        url = f"{DATAFEED_URL}/{symbol}/{month_start.year}/{month_start.month - 1:02d}/{price_type}_candles_hour_1.bi5"
        res = self.session.get(url, timeout=60)
        res.raise_for_status()
        time.sleep(self.request_interval)
        return parse_hour_candles(res.content, month_start, scale)

    def history(self, instrument: str, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
        """start 以上 end 未満の1時間足を、仲値の OHLC と終値時点のスプレッドで返す"""
        base, quote = instrument.split("_")
        symbol = f"{base}{quote}"
        scale = POINT_SCALES.get(quote, 100_000)
        frames = []
        for month in pd.period_range(start, end - pd.Timedelta(seconds=1), freq="M"):
            month_start = month.start_time.tz_localize("UTC")
            bid = self._month(symbol, month_start, "BID", scale)
            ask = self._month(symbol, month_start, "ASK", scale)
            frames.append(((bid + ask) / 2).assign(spread=ask["close"] - bid["close"]).dropna())
        df = pd.concat(frames).sort_index()
        return df[(df.index >= start) & (df.index < end)]
