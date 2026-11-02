import pandas as pd

from fxbot.data import combine


def test_combine_prefers_recent_data_on_overlap():
    index = pd.date_range("2024-01-01", periods=4, freq="h", tz="UTC")
    history = pd.DataFrame({"close": [1.0, 2.0, 3.0, 4.0]}, index=index)
    recent = pd.DataFrame({"close": [30.0, 40.0, 50.0]}, index=index[2:].append(index[-1:] + pd.Timedelta(hours=1)))
    assert combine(history, recent)["close"].tolist() == [1.0, 2.0, 30.0, 40.0, 50.0]
