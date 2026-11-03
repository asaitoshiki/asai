import time

import pandas as pd
import requests

BASE_URL = "https://api.twelvedata.com"
# 無料プランは1分あたり8リクエストまでなので間を空ける
REQUEST_INTERVAL = 8.0
INTERVALS = {"H1": "1h", "D": "1day"}
# 1回の取得上限（5000本）に収まる期間ごとに分けて取得する
CHUNKS = {"H1": pd.Timedelta(days=180), "D": pd.Timedelta(days=4000)}
# 残す曜日（UTC）。日足はUTC20時区切りで、土日付けの足は金曜の取引終了前後のわずかな値動きしか含まないので除く
WEEKDAYS = {"H1": range(7), "D": range(5)}


def values_to_frame(values: list[dict]) -> pd.DataFrame:
    """time_series の values 配列を OHLC の DataFrame に変換する（時刻は足の開始時刻、UTC）"""
    df = pd.DataFrame(values, columns=["datetime", "open", "high", "low", "close"])
    index = pd.to_datetime(df["datetime"]).dt.tz_localize("UTC").rename("time")
    return df[["open", "high", "low", "close"]].astype(float).set_index(index)


class TwelveDataHistory:
    """Twelve Data の1時間足・日足。学習・検証用の長期データとして使う

    APIキーはコードに持たず、環境のネットワーク設定が付与する Authorization ヘッダーで認証する
    """

    def __init__(self, session: requests.Session | None = None, request_interval: float = REQUEST_INTERVAL):
        self.session = session or requests.Session()
        self.request_interval = request_interval

    def _range(self, symbol: str, granularity: str, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
        res = self.session.get(
            f"{BASE_URL}/time_series",
            params={
                "symbol": symbol,
                "interval": INTERVALS[granularity],
                "start_date": start.strftime("%Y-%m-%d %H:%M:%S"),
                "end_date": end.strftime("%Y-%m-%d %H:%M:%S"),
                "timezone": "UTC",
                "order": "ASC",
                "outputsize": 5000,
            },
            timeout=60,
        )
        res.raise_for_status()
        body = res.json()
        assert body["status"] == "ok", body
        time.sleep(self.request_interval)
        return values_to_frame(body["values"])

    def history(self, instrument: str, granularity: str, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
        """start 以上 end 未満の足を取得する"""
        symbol = instrument.replace("_", "/")
        edges = pd.date_range(start, end, freq=CHUNKS[granularity]).append(pd.DatetimeIndex([end])).unique()
        frames = [self._range(symbol, granularity, a, b) for a, b in zip(edges[:-1], edges[1:])]
        df = pd.concat(frames).sort_index()
        df = df[~df.index.duplicated(keep="first") & df.index.dayofweek.isin(WEEKDAYS[granularity])]
        return df[(df.index >= start) & (df.index < end)]
