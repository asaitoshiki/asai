import hashlib
import hmac
import json
from unittest.mock import MagicMock

import pandas as pd
import pytest

from fxbot import gmo
from fxbot.config import GmoSettings
from fxbot.gmo import GmoApiError, GmoClient, GmoMarketData, format_price, klines_to_frame

SETTINGS = GmoSettings(api_key="key", api_secret="secret")


def ok(data) -> MagicMock:
    res = MagicMock()
    res.json.return_value = {"status": 0, "data": data, "responsetime": "2024-01-01T00:00:00.000Z"}
    return res


def kline(time: pd.Timestamp, close: str) -> dict:
    return {"openTime": str(int(time.timestamp() * 1000)), "open": "150.0", "high": "151.0", "low": "149.0", "close": close}


def make_client() -> tuple[GmoClient, MagicMock]:
    session = MagicMock()
    return GmoClient(SETTINGS, session=session, request_interval=0), session


def posted(session: MagicMock) -> list[tuple[str, dict]]:
    """POST されたパスとボディの一覧"""
    return [(c.args[0].rsplit("/v1/", 1)[1], json.loads(c.kwargs["data"])) for c in session.post.call_args_list]


def test_klines_to_frame():
    t = pd.Timestamp("2024-01-01T00:00:00Z")
    df = klines_to_frame([kline(t, "150.5")])
    assert df.index[0] == t
    assert df["close"].iloc[0] == 150.5


def test_daily_keys_skip_weekend():
    start = pd.Timestamp("2024-01-05", tz=gmo.JST)  # 金曜
    end = pd.Timestamp("2024-01-08", tz=gmo.JST)  # 月曜
    assert gmo.PERIOD_KEYS["H1"](start, end) == ["20240105", "20240108"]


def test_yearly_keys():
    start = pd.Timestamp("2023-06-01", tz=gmo.JST)
    end = pd.Timestamp("2024-02-01", tz=gmo.JST)
    assert gmo.PERIOD_KEYS["H4"](start, end) == ["2023", "2024"]


def test_format_price():
    assert format_price("USD_JPY", 150.12345) == "150.123"
    assert format_price("EUR_USD", 1.0812345) == "1.08123"


def test_history_drops_incomplete_and_duplicates():
    # 過去データの取得は APIキー無しでできること
    session = MagicMock()
    client = GmoMarketData(session=session, request_interval=0)
    now = pd.Timestamp.now(tz="UTC").floor("h")
    bars = [kline(now - pd.Timedelta(hours=h), str(150 + h)) for h in (2, 1, 0)]
    # 取得する日付ごとに同じ足が返っても重複は除かれること
    session.get.return_value = ok(bars)

    df = client.history("USD_JPY", "H1", now - pd.Timedelta(days=5))

    # 現在進行中の足（now 始まり）は未確定なので含まない
    assert df.index.tolist() == [now - pd.Timedelta(hours=2), now - pd.Timedelta(hours=1)]
    params = session.get.call_args.kwargs["params"]
    assert params["priceType"] == "BID"
    assert params["interval"] == "1hour"


def test_private_request_is_signed(monkeypatch):
    client, session = make_client()
    monkeypatch.setattr(gmo.time, "time", lambda: 1700000000.123)
    session.get.return_value = ok([{"equity": "1000000"}])

    assert client.nav() == 1_000_000

    headers = session.get.call_args.kwargs["headers"]
    expected = hmac.new(b"secret", b"1700000000123GET/v1/account/assets", hashlib.sha256).hexdigest()
    assert headers == {"API-KEY": "key", "API-TIMESTAMP": "1700000000123", "API-SIGN": expected}


def test_post_signature_covers_body(monkeypatch):
    client, session = make_client()
    monkeypatch.setattr(gmo.time, "time", lambda: 1700000000.0)
    session.post.return_value = ok({})
    session.get.return_value = ok([{"symbol": "USD_JPY", "ask": "150.010", "bid": "150.000"}])

    client.open_position("USD_JPY", 1000, 0.5)

    first = session.post.call_args_list[0]
    text = "1700000000000POST/v1/order" + first.kwargs["data"]
    assert first.kwargs["headers"]["API-SIGN"] == hmac.new(b"secret", text.encode(), hashlib.sha256).hexdigest()


def test_net_units_nets_buy_and_sell():
    client, session = make_client()
    session.get.return_value = ok(
        {"list": [{"side": "BUY", "sumPositionSize": "1000"}, {"side": "SELL", "sumPositionSize": "300"}]}
    )
    assert client.net_units("USD_JPY") == 700
    assert session.get.call_args.kwargs["params"] == {"symbol": "USD_JPY"}


def test_net_units_without_position_is_zero():
    client, session = make_client()
    session.get.return_value = ok({"list": []})
    assert client.net_units("USD_JPY") == 0


def test_open_short_places_market_order_and_stop():
    client, session = make_client()
    session.post.return_value = ok({})
    session.get.return_value = ok(
        [
            {"symbol": "EUR_JPY", "ask": "160.010", "bid": "160.000"},
            {"symbol": "USD_JPY", "ask": "150.010", "bid": "150.000"},
        ]
    )

    client.open_position("USD_JPY", -1000, 0.5)

    assert posted(session) == [
        ("order", {"symbol": "USD_JPY", "side": "SELL", "size": "1000", "executionType": "MARKET"}),
        # 売りは bid で約定するので、その 0.5 円上に買い戻しの逆指値を置く
        (
            "closeOrder",
            {"symbol": "USD_JPY", "side": "BUY", "executionType": "STOP", "stopPrice": "150.500", "size": "1000"},
        ),
    ]


def test_reduce_cancels_stop_then_closes():
    client, session = make_client()
    session.post.return_value = ok({})

    client.reduce_position("USD_JPY", -1000)

    assert posted(session) == [
        ("cancelBulkOrder", {"symbols": ["USD_JPY"], "settleType": "CLOSE"}),
        ("closeOrder", {"symbol": "USD_JPY", "side": "SELL", "executionType": "MARKET", "size": "1000"}),
    ]


def test_error_status_raises():
    client, session = make_client()
    session.get.return_value.json.return_value = {
        "status": 1,
        "messages": [{"message_code": "ERR-5201", "message_string": "MAINTENANCE"}],
    }
    with pytest.raises(GmoApiError):
        client.nav()
