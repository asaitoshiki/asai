"""複数通貨ペアに分散し、値動きの大きさでリスクをそろえた時系列モメンタム（流れに乗る手法）"""
import numpy as np
import pandas as pd

from fxbot.cli import load_csv

PAIRS = ["USD_JPY", "EUR_USD", "GBP_USD", "AUD_USD", "EUR_JPY", "GBP_JPY", "AUD_JPY"]
LOOKBACKS = [20, 60, 120, 250]
COST_RATE = 0.00003  # 片道
TARGET_VOL = 0.10  # 1ペアあたり年10%の値動きにそろえる

closes = pd.DataFrame({p: load_csv(f"data/{p}_D.csv")["close"] for p in PAIRS}).sort_index()
closes = closes[closes.index >= "2003-01-01"]
ret = closes.pct_change()
signal = sum(np.sign(closes.pct_change(n)) for n in LOOKBACKS) / len(LOOKBACKS)
vol = ret.rolling(60).std() * np.sqrt(260)
weight = (signal * TARGET_VOL / vol).clip(-3, 3)
# t日の終値で決めた量で t→t+1 の値動きを受ける
pair_ret = weight * ret.shift(-1) - weight.diff().abs() * COST_RATE
pair_ret = pair_ret[pair_ret.index >= "2004-06-01"].dropna(how="all")
portfolio = pair_ret.mean(axis=1, skipna=True).dropna()


def stats(r: pd.Series) -> str:
    years = len(r) / 260
    total = (1 + r).prod()
    eq = (1 + r).cumprod()
    return f"年率 {total ** (1 / years) - 1:+.3f}  sharpe {r.mean() / r.std() * np.sqrt(260):+.2f}  最大下落 {(eq / eq.cummax() - 1).min():+.2f}"


print("ポートフォリオ（7ペア平均）")
for a, b in [("2004", "2027"), ("2004", "2015"), ("2015", "2027"), ("2020", "2027")]:
    print(f"  {a}〜{int(b) - 1}: {stats(portfolio[(portfolio.index >= a) & (portfolio.index < b)])}")
print("\nペア別（2004〜2026）")
for p in PAIRS:
    print(f"  {p}: {stats(pair_ret[p].dropna())}")
yearly = (1 + portfolio).groupby(portfolio.index.year).prod() - 1
print("\n年別（ポートフォリオ）:", (yearly * 100).round(1).to_dict())
