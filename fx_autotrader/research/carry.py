"""キャリー（金利差・スワップポイント）手法と、流れのフィルターを組み合わせた手法を7通貨ペアで検証する"""
import sys

import numpy as np
import pandas as pd

from fxbot.cli import load_csv

RESEARCH_PAIRS = ["USD_JPY", "EUR_USD", "GBP_USD", "AUD_USD", "EUR_JPY", "GBP_JPY", "AUD_JPY"]
# 手法が決まるまで封印していた最終確認用の通貨ペア
SEALED_PAIRS = ["NZD_USD", "USD_CAD", "USD_CHF", "CAD_JPY", "CHF_JPY", "NZD_JPY"]
# 各通貨の3か月金利（FRED、月次）。日本は3か月TIBOR
RATE_SERIES = {"USD": "IR3TIB01USM156N", "JPY": "IR3TIB01JPM156N", "EUR": "IR3TIB01EZM156N",
               "GBP": "IR3TIB01GBM156N", "AUD": "IR3TIB01AUM156N", "NZD": "IR3TIB01NZM156N",
               "CAD": "IR3TIB01CAM156N", "CHF": "IR3TIB01CHM156N"}
LOOKBACKS = [20, 60, 120, 250]
COST_RATE = 0.00003  # 売買の片道コスト（価格比）
TARGET_VOL = 0.10
# 使い方: carry.py [業者がスワップから差し引く分（年率）] [research|sealed]
SWAP_MARKUP = float(sys.argv[1])
PAIRS = {"research": RESEARCH_PAIRS, "sealed": SEALED_PAIRS}[sys.argv[2]]

closes = pd.DataFrame({p: load_csv(f"data/{p}_D.csv")["close"] for p in PAIRS}).sort_index()
closes = closes[closes.index >= "2003-01-01"]


def rate(ccy: str) -> pd.Series:
    s = pd.read_csv(f"data/fred/{RATE_SERIES[ccy]}.csv", index_col=0, parse_dates=True).iloc[:, 0] / 100
    # 月初日付の値はその月の平均なので、翌月から使える値として1か月ずらす
    s.index = (s.index + pd.offsets.MonthBegin(1)).tz_localize("UTC")
    return s.reindex(s.index.union(closes.index)).ffill().reindex(closes.index)


diff = pd.DataFrame({p: rate(p[:3]) - rate(p[4:]) for p in PAIRS})
days = closes.index.to_series().diff().shift(-1).dt.days  # t→t+1 の暦日数（週末をまたぐと3日分のスワップ）
ret = closes.pct_change()
vol = ret.rolling(60).std() * np.sqrt(260)
trend = np.sign(sum(np.sign(closes.pct_change(n)) for n in LOOKBACKS))
carry_sign = np.sign(diff)


def run(direction: pd.DataFrame) -> pd.DataFrame:
    weight = (direction * TARGET_VOL / vol).clip(-3, 3)
    # 持っている向きの金利差を受け取り（売りなら支払い）、業者の取り分を差し引く
    carry = (weight * diff - weight.abs() * SWAP_MARKUP).mul(days, axis=0) / 365
    price = weight * ret.shift(-1)
    cost = weight.diff().abs() * COST_RATE
    out = (price + carry - cost)
    return out[out.index >= "2004-06-01"].dropna(how="all"), price, carry


def stats(r: pd.Series) -> str:
    r = r.dropna()
    years = len(r) / 260
    eq = (1 + r).cumprod()
    return (f"年率 {eq.iloc[-1] ** (1 / years) - 1:+.3f}  sharpe {r.mean() / r.std() * np.sqrt(260):+.2f}  "
            f"最大下落 {(eq / eq.cummax() - 1).min():+.2f}")


print(f"スワップの目減り: 年{SWAP_MARKUP:.1%} / 通貨ペア: {PAIRS}")
for name, direction in {"キャリー": carry_sign, "キャリー＋流れのフィルター": carry_sign.where(trend == carry_sign, 0)}.items():
    pair_ret, price, carry = run(direction)
    port = pair_ret.mean(axis=1).dropna()
    print(f"\n■ {name}（7ペア平均）")
    for a, b in [("2004", "2027"), ("2004", "2015"), ("2015", "2027"), ("2020", "2027")]:
        print(f"  {a}〜{int(b) - 1}: {stats(port[(port.index >= a) & (port.index < b)])}")
    yearly = (1 + port).groupby(port.index.year).prod() - 1
    print("  年別(%):", (yearly * 100).round(1).to_dict())
    p = price[price.index >= "2004-06-01"].mean(axis=1).sum()
    c = carry[carry.index >= "2004-06-01"].mean(axis=1).sum()
    print(f"  内訳（単純合計）: 値動き {p:+.2f} / スワップ {c:+.2f}")
    print("  ペア別:", {k: stats(pair_ret[k]).split("  ")[0] for k in PAIRS})
