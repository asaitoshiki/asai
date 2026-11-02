import lzma
from unittest.mock import MagicMock

import numpy as np
import pandas as pd

from fxbot.dukascopy import HOUR_CANDLE, DukascopyData, parse_hour_candles

MONTH = pd.Timestamp("2024-01-01", tz="UTC")


def bi5(rows: list[tuple]) -> bytes:
    """(月初からの秒, 始値, 終値, 安値, 高値, 出来高) の並びを .bi5 形式にする"""
    return lzma.compress(np.array(rows, dtype=HOUR_CANDLE).tobytes(), format=lzma.FORMAT_ALONE)


def test_parse_hour_candles_scales_and_drops_flat_bars():
    raw = bi5([(0, 141000, 141100, 140900, 141200, 1.5), (3600, 141100, 141100, 141100, 141100, 0.0)])
    df = parse_hour_candles(raw, MONTH, scale=1000)
    # 出来高0の足（週末の埋め草）は除かれる
    assert df.index.tolist() == [MONTH]
    assert df.iloc[0].to_dict() == {"open": 141.0, "high": 141.2, "low": 140.9, "close": 141.1}


def test_parse_empty_month():
    assert parse_hour_candles(b"", MONTH, scale=1000).empty


def test_history_builds_mid_and_spread_from_zero_based_month_urls():
    session = MagicMock()
    files = {
        "BID": bi5([(3600, 141000, 141100, 140900, 141200, 1.0)]),
        "ASK": bi5([(3600, 141004, 141104, 140904, 141204, 1.0)]),
    }
    session.get.side_effect = lambda url, timeout: MagicMock(content=files[url.rsplit("/", 1)[1].split("_")[0]])

    df = DukascopyData(session=session, request_interval=0).history(
        "USD_JPY", MONTH, pd.Timestamp("2024-02-01", tz="UTC")
    )

    urls = [c.args[0] for c in session.get.call_args_list]
    assert urls == [
        "https://datafeed.dukascopy.com/datafeed/USDJPY/2024/00/BID_candles_hour_1.bi5",
        "https://datafeed.dukascopy.com/datafeed/USDJPY/2024/00/ASK_candles_hour_1.bi5",
    ]
    assert df.index.tolist() == [MONTH + pd.Timedelta(hours=1)]
    assert round(df["close"].iloc[0], 6) == 141.102
    assert round(df["spread"].iloc[0], 6) == 0.004
