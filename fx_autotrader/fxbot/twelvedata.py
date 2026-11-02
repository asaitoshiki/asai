import time

import pandas as pd
import requests

BASE_URL = "https://api.twelvedata.com"
# 無料プランは1分あたり8リクエストまでなので間を空ける
REQUEST_INTERVAL = 8.0
# 1回の取得上限（5000本）に収まる期間ごとに分けて取得する
CHUNK = pd.Timedelta(days=180)


def values_to_frame(values: list[dict]) -> pd.DataFrame:
    """time_series の values 配列を OHLC の DataFrame に変換する（時刻は足の開始時刻、UTC）"""
    df = pd.DataFrame(values, columns=["datetime", "open", "high", "low", "close"])
    index = pd.to_datetime(df["datetime"]).dt.tz_localize("UTC").rename("time")
    return df[["open", "high", "low", "close"]].astype(float).set_index(index)


class TwelveDataHistory:
    """Twelve Data の1時間足。学習・検証用の長期データとして使う

    APIキーはコードに持たず、環境のネットワーク設定が付与する Authorization ヘッダーで認証する
    """

    def __init__(self, session: requests.Session | None = None, request_interval: float = REQUEST_INTERVAL):
        self.session = session or requests.Session()
        self.request_interval = request_interval

    def _range(self, symbol: str, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
        res = self.session.get(
            f"{BASE_URL}/time_series",
            params={
                "symbol": symbol,
                "interval": "1h",
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

    def history(self, instrument: str, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame:
        """start 以上 end 未満の1時間足を取得する"""
        symbol = instrument.replace("_", "/")
        edges = pd.date_range(start, end, freq=CHUNK).append(pd.DatetimeIndex([end])).unique()
        df = pd.concat([self._range(symbol, a, b) for a, b in zip(edges[:-1], edges[1:])]).sort_index()
        df = df[~df.index.duplicated(keep="first")]
        return df[(df.index >= start) & (df.index < end)]
