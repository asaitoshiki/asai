import pandas as pd
import requests

from fxbot.config import Settings

# OANDA の1リクエストあたりの最大取得本数
MAX_CANDLES = 5000


def candles_to_frame(candles: list[dict]) -> pd.DataFrame:
    """APIレスポンスの candles 配列を OHLCV の DataFrame に変換する（確定足のみ）"""
    rows = [
        {
            "time": c["time"],
            "open": float(c["mid"]["o"]),
            "high": float(c["mid"]["h"]),
            "low": float(c["mid"]["l"]),
            "close": float(c["mid"]["c"]),
            "volume": int(c["volume"]),
        }
        for c in candles
        if c["complete"]
    ]
    df = pd.DataFrame(rows, columns=["time", "open", "high", "low", "close", "volume"])
    df["time"] = pd.to_datetime(df["time"], utc=True)
    return df.set_index("time")


class OandaClient:
    def __init__(self, settings: Settings, session: requests.Session | None = None):
        self.settings = settings
        self.session = session or requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {settings.api_token}",
                "Content-Type": "application/json",
                "Accept-Datetime-Format": "RFC3339",
            }
        )

    def _request(self, method: str, path: str, **kwargs) -> dict:
        res = self.session.request(method, f"{self.settings.base_url}{path}", timeout=30, **kwargs)
        res.raise_for_status()
        return res.json()

    def _account_path(self, suffix: str) -> str:
        return f"/v3/accounts/{self.settings.account_id}{suffix}"

    def candles(self, instrument: str, granularity: str, **params) -> pd.DataFrame:
        body = self._request(
            "GET",
            f"/v3/instruments/{instrument}/candles",
            params={"granularity": granularity, "price": "M", **params},
        )
        return candles_to_frame(body["candles"])

    def recent_candles(self, instrument: str, granularity: str, count: int) -> pd.DataFrame:
        return self.candles(instrument, granularity, count=count)

    def history(self, instrument: str, granularity: str, start: pd.Timestamp) -> pd.DataFrame:
        """start から現在までの確定足をページングしながら取得する"""
        frames = []
        cursor = start
        while True:
            batch = self.candles(
                instrument, granularity, **{"from": cursor.isoformat(), "count": MAX_CANDLES}
            )
            frames.append(batch)
            # 最終ページ（未確定足を除いて上限未満）なら終了
            if len(batch) < MAX_CANDLES - 1:
                break
            cursor = batch.index[-1]
        df = pd.concat(frames)
        return df[~df.index.duplicated(keep="first")]

    def nav(self) -> float:
        body = self._request("GET", self._account_path("/summary"))
        return float(body["account"]["NAV"])

    def net_units(self, instrument: str) -> int:
        """保有ポジションのネット数量（買いは正、売りは負）"""
        body = self._request("GET", self._account_path("/openPositions"))
        units = [
            int(p["long"]["units"]) + int(p["short"]["units"])
            for p in body["positions"]
            if p["instrument"] == instrument
        ]
        return sum(units)

    def _market_order(self, order: dict) -> dict:
        body = {"order": {"type": "MARKET", "timeInForce": "FOK", **order}}
        return self._request("POST", self._account_path("/orders"), json=body)

    def open_position(self, instrument: str, units: int, stop_loss_distance: float) -> dict:
        """成行で新規建てする。損切り注文を必ず同時に付ける"""
        return self._market_order(
            {
                "instrument": instrument,
                "units": str(units),
                "positionFill": "OPEN_ONLY",
                "stopLossOnFill": {"distance": f"{stop_loss_distance:.5f}"},
            }
        )

    def reduce_position(self, instrument: str, units: int) -> dict:
        """既存ポジションを減らす方向にだけ約定させる（ドテン時の決済用）"""
        return self._market_order(
            {"instrument": instrument, "units": str(units), "positionFill": "REDUCE_ONLY"}
        )
