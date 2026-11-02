import hashlib
import hmac
import json
import time

import numpy as np
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from fxbot.config import BAR_SECONDS, GmoSettings

PUBLIC_URL = "https://forex-api.coin.z.com/public"
PRIVATE_URL = "https://forex-api.coin.z.com/private"
JST = "Asia/Tokyo"

INTERVALS = {"M5": "5min", "M15": "15min", "H1": "1hour", "H4": "4hour", "D": "1day"}
SIDES = {1: "BUY", -1: "SELL"}
SIGNS = {"BUY": 1, "SELL": -1}
# 買いは ask、売りは bid で約定する
ENTRY_PRICE_KEYS = {1: "ask", -1: "bid"}
# 決済通貨ごとの価格の小数桁（クロス円は3桁、それ以外は5桁）
PRICE_DECIMALS = {"JPY": 3}


class GmoApiError(Exception):
    pass


def _daily_keys(start: pd.Timestamp, end: pd.Timestamp) -> list[str]:
    # 取引日は平日のみ（土曜早朝の足は金曜の取引日に含まれる）
    days = pd.date_range(start.normalize(), end.normalize(), freq="D")
    return [d.strftime("%Y%m%d") for d in days if d.day_of_week < 5]


def _yearly_keys(start: pd.Timestamp, end: pd.Timestamp) -> list[str]:
    return [str(year) for year in range(start.year, end.year + 1)]


# klines の date パラメータは1時間足以下なら日単位、それより長い足は年単位で指定する
PERIOD_KEYS = {
    "M5": _daily_keys,
    "M15": _daily_keys,
    "H1": _daily_keys,
    "H4": _yearly_keys,
    "D": _yearly_keys,
}


def klines_to_frame(klines: list[dict]) -> pd.DataFrame:
    """APIレスポンスの data 配列を OHLC の DataFrame に変換する"""
    df = pd.DataFrame(klines, columns=["openTime", "open", "high", "low", "close"])
    index = pd.to_datetime(df["openTime"].astype("int64"), unit="ms", utc=True).rename("time")
    return df[["open", "high", "low", "close"]].astype(float).set_index(index)


def format_price(instrument: str, price: float) -> str:
    decimals = PRICE_DECIMALS.get(instrument.split("_")[1], 5)
    return f"{price:.{decimals}f}"


def _retrying_session() -> requests.Session:
    """一時的な通信エラーやサーバーエラーのとき GET だけ再試行するセッション（注文の二重発注を避けるため POST は再試行しない）"""
    retry = Retry(total=5, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504], allowed_methods=["GET"])
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session


def _unwrap(res: requests.Response):
    res.raise_for_status()
    body = res.json()
    if body["status"] != 0:
        raise GmoApiError(body["messages"])
    return body["data"]


class GmoMarketData:
    """GMOコイン「外国為替FX」の Public API（APIキー不要）。OHLC は仲値、spread は足の終値時点の ASK-BID"""

    def __init__(self, session: requests.Session | None = None, request_interval: float = 0.2):
        self.session = session or _retrying_session()
        # Public API の流量制限に掛からないよう連続取得時に空ける秒数
        self.request_interval = request_interval

    def _public_get(self, path: str, params: dict | None = None):
        return _unwrap(self.session.get(f"{PUBLIC_URL}/v1/{path}", params=params, timeout=30))

    def klines(self, instrument: str, granularity: str, date_key: str, price_type: str) -> pd.DataFrame:
        data = self._public_get(
            "klines",
            {"symbol": instrument, "priceType": price_type, "interval": INTERVALS[granularity], "date": date_key},
        )
        return klines_to_frame(data)

    def _period(self, instrument: str, granularity: str, date_key: str) -> pd.DataFrame:
        """1期間分の仲値の足に、終値時点のスプレッドを付ける

        BID だけだとスプレッドが広がる時間帯（日本時間の早朝など）に見かけ上の値下がりが生じ、
        モデルがそれを学習してしまうため、BID と ASK の平均（仲値）を使う
        """
        bid = self.klines(instrument, granularity, date_key, "BID")
        time.sleep(self.request_interval)
        ask = self.klines(instrument, granularity, date_key, "ASK")
        time.sleep(self.request_interval)
        mid = (bid + ask) / 2
        return mid.assign(spread=ask["close"] - bid["close"]).dropna()

    def history(self, instrument: str, granularity: str, start: pd.Timestamp) -> pd.DataFrame:
        """start から現在までの確定足を取得する"""
        now = pd.Timestamp.now(tz=JST)
        # 取引日は日本時間の朝6時（米国夏時間）/7時（冬時間）で切り替わり、まだ始まっていない日付を指定すると
        # 404 になる。遅い方の7時（＋余裕5分）で区切った取引日までを取得し、開始側は前日分から取って後で落とす
        trading_today = now - pd.Timedelta(hours=7, minutes=5)
        keys = PERIOD_KEYS[granularity]((start - pd.Timedelta(days=1)).tz_convert(JST), trading_today)
        df = pd.concat([self._period(instrument, granularity, key) for key in keys]).sort_index()
        df = df[~df.index.duplicated(keep="first")]
        # 終了時刻が現在より後の足は未確定なので除く
        complete = df.index + pd.Timedelta(seconds=BAR_SECONDS[granularity]) <= now
        return df[complete & (df.index >= start)]

    def recent_candles(self, instrument: str, granularity: str, count: int) -> pd.DataFrame:
        # 週末をはさんでも count 本そろうよう、必要期間の1.5倍＋3日さかのぼる
        span = pd.Timedelta(seconds=BAR_SECONDS[granularity] * count * 1.5) + pd.Timedelta(days=3)
        return self.history(instrument, granularity, pd.Timestamp.now(tz="UTC") - span).iloc[-count:]

    def ticker(self, instrument: str) -> dict:
        return next(t for t in self._public_get("ticker") if t["symbol"] == instrument)

    def spread(self, instrument: str) -> float:
        quote = self.ticker(instrument)
        return float(quote["ask"]) - float(quote["bid"])


class GmoClient(GmoMarketData):
    """GMOコイン「外国為替FX」の Private API を含むクライアント（資産・建玉・注文）"""

    def __init__(
        self, settings: GmoSettings, session: requests.Session | None = None, request_interval: float = 0.2
    ):
        super().__init__(session, request_interval)
        self.settings = settings

    def _signed_headers(self, method: str, path: str, payload: str) -> dict:
        # 署名対象は「タイムスタンプ + メソッド + パス（クエリ除く） + ボディ」
        timestamp = str(int(time.time() * 1000))
        text = f"{timestamp}{method}/v1/{path}{payload}"
        sign = hmac.new(self.settings.api_secret.encode(), text.encode(), hashlib.sha256).hexdigest()
        return {"API-KEY": self.settings.api_key, "API-TIMESTAMP": timestamp, "API-SIGN": sign}

    def _private_get(self, path: str, params: dict | None = None):
        headers = self._signed_headers("GET", path, "")
        return _unwrap(self.session.get(f"{PRIVATE_URL}/v1/{path}", params=params, headers=headers, timeout=30))

    def _private_post(self, path: str, body: dict):
        payload = json.dumps(body)
        headers = {**self._signed_headers("POST", path, payload), "Content-Type": "application/json"}
        return _unwrap(self.session.post(f"{PRIVATE_URL}/v1/{path}", data=payload, headers=headers, timeout=30))

    def nav(self) -> float:
        """時価評価総額（評価損益込みの資産）"""
        return float(self._private_get("account/assets")[0]["equity"])

    def net_units(self, instrument: str) -> int:
        """保有ポジションのネット数量（買いは正、売りは負）"""
        data = self._private_get("positionSummary", {"symbol": instrument})
        return sum(SIGNS[p["side"]] * int(p["sumPositionSize"]) for p in data["list"])

    def open_position(self, instrument: str, units: int, stop_loss_distance: float) -> None:
        """成行で新規建てし、反対売買の逆指値決済注文で損切りを置く"""
        sign = int(np.sign(units))
        size = str(abs(units))
        self._private_post(
            "order", {"symbol": instrument, "side": SIDES[sign], "size": size, "executionType": "MARKET"}
        )
        # 成行の約定価格の近似として直後のレートを使う
        entry = float(self.ticker(instrument)[ENTRY_PRICE_KEYS[sign]])
        self._private_post(
            "closeOrder",
            {
                "symbol": instrument,
                "side": SIDES[-sign],
                "executionType": "STOP",
                "stopPrice": format_price(instrument, entry - sign * stop_loss_distance),
                "size": size,
            },
        )

    def reduce_position(self, instrument: str, units: int) -> None:
        """成行で決済する。損切りの逆指値が決済数量を確保しているので先に取り消す"""
        self._private_post("cancelBulkOrder", {"symbols": [instrument], "settleType": "CLOSE"})
        self._private_post(
            "closeOrder",
            {
                "symbol": instrument,
                "side": SIDES[int(np.sign(units))],
                "executionType": "MARKET",
                "size": str(abs(units)),
            },
        )
