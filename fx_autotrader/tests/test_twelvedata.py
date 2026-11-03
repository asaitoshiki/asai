from unittest.mock import MagicMock

import pandas as pd
import pytest

from fxbot.twelvedata import TwelveDataHistory, values_to_frame


def test_values_to_frame():
    df = values_to_frame([{"datetime": "2024-01-08 00:00:00", "open": "144.7", "high": "144.8", "low": "144.5", "close": "144.6"}])
    assert df.index[0] == pd.Timestamp("2024-01-08", tz="UTC")
    assert df["close"].iloc[0] == 144.6


def test_history_splits_into_chunks_and_trims():
    session = MagicMock()

    def respond(url, params, timeout):
        # 各区間の最初と最後の時刻の足を返す（区間の境目は重複する）
        times = pd.to_datetime([params["start_date"], params["end_date"]])
        values = [{"datetime": str(t), "open": "1", "high": "1", "low": "1", "close": "1"} for t in times]
        return MagicMock(json=lambda: {"status": "ok", "values": values})

    session.get.side_effect = respond
    start, end = pd.Timestamp("2020-01-01", tz="UTC"), pd.Timestamp("2021-01-01", tz="UTC")
    df = TwelveDataHistory(session=session, request_interval=0).history("USD_JPY", "H1", start, end)

    params = [c.kwargs["params"] for c in session.get.call_args_list]
    assert [p["symbol"] for p in params] == ["USD/JPY"] * 3
    assert {p["interval"] for p in params} == {"1h"}
    assert params[0]["start_date"] == "2020-01-01 00:00:00"
    assert params[-1]["end_date"] == "2021-01-01 00:00:00"
    # 重複は除かれ、end ちょうどの足は含まない
    assert df.index.is_unique
    assert df.index[-1] < end


def test_error_response_raises():
    session = MagicMock()
    session.get.return_value.json.return_value = {"status": "error", "code": 400, "message": "No data"}
    with pytest.raises(AssertionError):
        TwelveDataHistory(session=session, request_interval=0).history(
            "USD_JPY", "H1", pd.Timestamp("2015-01-01", tz="UTC"), pd.Timestamp("2015-02-01", tz="UTC")
        )


def test_daily_history_drops_weekend_bars():
    session = MagicMock()
    # 2026-10-30 金, 10-31 土, 11-01 日, 11-02 月
    days = ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]
    values = [{"datetime": d, "open": "1", "high": "1", "low": "1", "close": "1"} for d in days]
    session.get.return_value.json.return_value = {"status": "ok", "values": values}
    df = TwelveDataHistory(session=session, request_interval=0).history(
        "USD_JPY", "D", pd.Timestamp("2026-10-01", tz="UTC"), pd.Timestamp("2026-11-03", tz="UTC")
    )
    assert session.get.call_args.kwargs["params"]["interval"] == "1day"
    assert df.index.strftime("%Y-%m-%d").tolist() == ["2026-10-30", "2026-11-02"]
