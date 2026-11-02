import itertools
from dataclasses import dataclass

import pandas as pd

from fxbot.backtest import apply_spread_filter, evaluate, unit_cost, walk_forward_proba
from fxbot.model import to_position


@dataclass(frozen=True)
class TuneResult:
    table: pd.DataFrame  # 設定ごとの検証期間の成績（良い順）
    best: dict  # 検証期間で最も良かった設定
    split: pd.Timestamp  # 検証期間と最終確認期間の境目
    holdout: dict  # 最良設定の最終確認期間での成績


def tune(
    df: pd.DataFrame,
    horizons: list[int],
    train_windows: list[int],
    thresholds: list[float],
    max_spread_ratios: list[float],
    fee: float,
    eval_start: pd.Timestamp,
    test_size: int,
    bars_per_year: int,
    holdout_ratio: float,
    min_trades: int,
) -> TuneResult:
    """予測期間の前半（検証期間）だけで設定を選び、選んだ設定を後半（最終確認期間）で一度だけ評価する

    最終確認期間は設定選びに一切使わないので、過去データへの当てはめすぎを見抜ける
    """
    cost = unit_cost(df["spread"], fee)
    probas = {
        (horizon, window): walk_forward_proba(df, horizon, eval_start, test_size, window)
        for horizon, window in itertools.product(horizons, train_windows)
    }
    index = next(iter(probas.values())).index
    split = index[int(len(index) * (1 - holdout_ratio))]

    def positions_for(horizon: int, train_window: int, threshold: float, max_spread_ratio: float) -> pd.Series:
        proba = probas[(horizon, train_window)]
        return apply_spread_filter(to_position(proba, threshold), df["spread"], max_spread_ratio)

    rows = []
    for (horizon, window), threshold, ratio in itertools.product(probas, thresholds, max_spread_ratios):
        positions = positions_for(horizon, window, threshold, ratio)
        metrics = evaluate(df["close"], positions[positions.index < split], cost, bars_per_year).metrics
        rows.append(
            {"horizon": horizon, "train_window": window, "threshold": threshold, "max_spread_ratio": ratio, **metrics}
        )
    table = pd.DataFrame(rows).sort_values("sharpe", ascending=False, ignore_index=True)

    # 売買が少なすぎる設定は偶然の影響が大きいので選ばない
    best_row = table[table["trades"] >= min_trades].iloc[0]
    best = {
        "horizon": int(best_row["horizon"]),
        "train_window": int(best_row["train_window"]),
        "threshold": float(best_row["threshold"]),
        "max_spread_ratio": float(best_row["max_spread_ratio"]),
    }
    positions = positions_for(**best)
    holdout = evaluate(df["close"], positions[positions.index >= split], cost, bars_per_year).metrics
    return TuneResult(table=table, best=best, split=split, holdout=holdout)
