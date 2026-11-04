from unittest.mock import MagicMock

import numpy as np
import pandas as pd

from fxbot.trend_signal import fetch_fred, message, trend_state

INDEX = pd.date_range("2025-01-01", periods=260, freq="B")


def test_hold_while_above_moving_average():
    close = pd.Series(np.linspace(100, 200, len(INDEX)), index=INDEX)
    state = trend_state(close)
    assert state["hold"] and not state["changed"]
    assert state["gap"] > 0
    assert "継続" in message("S&P500", state)


def test_detects_switch_to_exit():
    # 上昇してきた相場が最終日に急落して200日平均を割る
    values = np.linspace(100, 200, len(INDEX))
    values[-1] = 100
    state = trend_state(pd.Series(values, index=INDEX))
    assert not state["hold"] and state["changed"]
    assert message("S&P500", state).startswith("【切り替え】S&P500: 今日から退避")


def test_fetch_fred_parses_csv_and_skips_missing():
    session = MagicMock()
    session.get.return_value.text = "observation_date,SP500\n2026-10-30,7580.07\n2026-10-31,.\n2026-11-02,7541.40\n"
    s = fetch_fred("SP500", session)
    assert session.get.call_args.kwargs["params"] == {"id": "SP500"}
    assert s.tolist() == [7580.07, 7541.40]
