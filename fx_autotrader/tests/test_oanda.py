from unittest.mock import MagicMock

import pandas as pd

from fxbot.config import Settings
from fxbot.oanda import OandaClient, candles_to_frame

SETTINGS = Settings(api_token="token", account_id="001-001-1", base_url="https://example.test")


def candle(time: str, close: str, complete: bool = True) -> dict:
    return {
        "time": time,
        "complete": complete,
        "volume": 10,
        "mid": {"o": "150.0", "h": "151.0", "l": "149.0", "c": close},
    }


def client_returning(*bodies: dict) -> tuple[OandaClient, MagicMock]:
    session = MagicMock()
    session.headers = {}
    session.request.return_value.json.side_effect = list(bodies)
    return OandaClient(SETTINGS, session=session), session


def test_candles_to_frame_drops_incomplete():
    df = candles_to_frame(
        [candle("2024-01-01T00:00:00Z", "150.5"), candle("2024-01-01T01:00:00Z", "150.7", complete=False)]
    )
    assert len(df) == 1
    assert df["close"].iloc[0] == 150.5
    assert df.index[0] == pd.Timestamp("2024-01-01T00:00:00Z")


def test_net_units_sums_long_and_short():
    client, _ = client_returning(
        {
            "positions": [
                {"instrument": "EUR_USD", "long": {"units": "500"}, "short": {"units": "0"}},
                {"instrument": "USD_JPY", "long": {"units": "1000"}, "short": {"units": "-300"}},
            ]
        }
    )
    assert client.net_units("USD_JPY") == 700


def test_net_units_without_position_is_zero():
    client, _ = client_returning({"positions": []})
    assert client.net_units("USD_JPY") == 0


def test_open_position_attaches_stop_loss():
    client, session = client_returning({})
    client.open_position("USD_JPY", -1000, 0.5)

    method, url = session.request.call_args.args
    order = session.request.call_args.kwargs["json"]["order"]
    assert (method, url) == ("POST", "https://example.test/v3/accounts/001-001-1/orders")
    assert order["units"] == "-1000"
    assert order["positionFill"] == "OPEN_ONLY"
    assert order["stopLossOnFill"] == {"distance": "0.50000"}


def test_reduce_position_is_reduce_only():
    client, session = client_returning({})
    client.reduce_position("USD_JPY", 700)
    order = session.request.call_args.kwargs["json"]["order"]
    assert order["positionFill"] == "REDUCE_ONLY"
    assert "stopLossOnFill" not in order
