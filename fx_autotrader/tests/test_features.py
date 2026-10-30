import numpy as np
import pandas as pd

from fxbot.features import build_features, make_labels


def test_features_do_not_look_ahead(ohlc):
    cut = 1000
    original = build_features(ohlc).iloc[:cut]
    # 未来側の価格を大きく書き換えても過去の特徴量は変わらないこと
    altered = ohlc.copy()
    altered.iloc[cut:, :4] *= 2
    pd.testing.assert_frame_equal(build_features(altered).iloc[:cut], original)


def test_features_have_no_nan_after_warmup(ohlc):
    assert not build_features(ohlc).iloc[60:].isna().any().any()


def test_labels():
    close = pd.Series([1.0, 2.0, 1.5, 3.0])
    labels = make_labels(close, horizon=1)
    np.testing.assert_array_equal(labels.iloc[:3], [1.0, 0.0, 1.0])
    assert np.isnan(labels.iloc[3])
