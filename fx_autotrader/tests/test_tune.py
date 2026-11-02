from fxbot import tune
from tests.conftest import make_ohlc


def test_tune_selects_on_validation_and_reports_holdout():
    df = make_ohlc(2500)
    result = tune.tune(
        df,
        horizons=[1, 4],
        train_windows=[800, 10**6],
        thresholds=[0.52, 0.6],
        max_spread_ratios=[1.5, 1000.0],
        fee=0.002,
        train_size=800,
        test_size=200,
        bars_per_year=6240,
        holdout_ratio=0.4,
        min_trades=1,
    )
    assert len(result.table) == 2 * 2 * 2 * 2
    # 選ばれた設定は検証期間の表で一番良い（売買回数の条件を満たす）行と一致すること
    top = result.table[result.table["trades"] >= 1].iloc[0]
    assert result.best == {
        "horizon": int(top["horizon"]),
        "train_window": int(top["train_window"]),
        "threshold": float(top["threshold"]),
        "max_spread_ratio": float(top["max_spread_ratio"]),
    }
    assert set(result.holdout) >= {"total_return", "sharpe", "max_drawdown"}
    assert df.index[800] < result.split < df.index[-1]
