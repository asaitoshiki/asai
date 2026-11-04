"""暗号資産の「流れに乗る（買いのみ）」手法を、ずっと持つ場合と比べる

使い方: crypto_trend.py <research|holdout|sealed>
  research: 研究用コインの研究期間（〜2020年）だけを表示する
  holdout : 研究用コインの確認期間（2021年〜）も表示する
  sealed  : 手法が決まるまで封印していたコインで、全期間と2021年〜を表示する
"""
import sys

import numpy as np
import pandas as pd

LOOKBACKS = [20, 60, 120]
COST_RATE = 0.001  # 片道（取引所の手数料と約定のずれ）
TARGET_VOL = 0.40  # 値動き調整版で目指す年率の値動き
DAYS_PER_YEAR = 365  # 暗号資産は土日も取引される
SPLIT = "2021-01-01"
RESEARCH_COINS = {"BTC": "CBBTCUSD", "ETH": "CBETHUSD"}
SEALED_COINS = {"LTC": "CBLTCUSD", "BCH": "CBBCHUSD", "XRP": "XRPUSD"}


def load(series: str) -> pd.Series:
    s = pd.read_csv(f"data/fred/{series}.csv", index_col=0, parse_dates=True, na_values=".").iloc[:, 0]
    # 休場や欠損の日は前日の値で埋める（暗号資産は毎日取引されるので欠損は少ない）
    return s.asfreq("D").ffill().dropna()


def strategies(close: pd.Series) -> dict[str, pd.Series]:
    ret = close.pct_change()
    signal = sum(np.sign(close.pct_change(n)) for n in LOOKBACKS) / len(LOOKBACKS)
    trend = (signal > 0).astype(float)
    vol = ret.rolling(30).std() * np.sqrt(DAYS_PER_YEAR)
    return {
        "ずっと持つ": pd.Series(1.0, index=close.index),
        "流れに乗る": trend,
        "流れに乗る＋値動き調整": trend * (TARGET_VOL / vol).clip(upper=1.0),
    }


def evaluate(close: pd.Series, weight: pd.Series, start: str, end: str) -> str:
    ret = close.pct_change().shift(-1)
    r = (weight * ret - weight.diff().abs() * COST_RATE)[start:end].dropna()
    eq = (1 + r).cumprod()
    years = len(r) / DAYS_PER_YEAR
    return (f"年率 {eq.iloc[-1] ** (1 / years) - 1:+7.1%}  sharpe {r.mean() / r.std() * np.sqrt(DAYS_PER_YEAR):+.2f}  "
            f"最大下落 {(eq / eq.cummax() - 1).min():+.0%}  保有率 {weight[start:end].gt(0).mean():.0%}")


PERIODS = {
    "research": {"研究期間（〜2020）": ("2015-06-01", "2020-12-31")},
    "holdout": {"研究期間（〜2020）": ("2015-06-01", "2020-12-31"), "確認期間（2021〜）": (SPLIT, "2026-12-31")},
    "sealed": {"全期間": ("2015-06-01", "2026-12-31"), "2021〜": (SPLIT, "2026-12-31")},
}
periods = PERIODS[sys.argv[1]]
coins = {"research": RESEARCH_COINS, "holdout": RESEARCH_COINS, "sealed": SEALED_COINS}[sys.argv[1]]
for coin, series in coins.items():
    close = load(series)
    print(f"■ {coin}（{close.index[0]:%Y-%m}〜）")
    for name, weight in strategies(close).items():
        cells = [f"{p}: {evaluate(close, weight, a, b)}" for p, (a, b) in periods.items()]
        print(f"  {name:12s} | " + " | ".join(cells))
