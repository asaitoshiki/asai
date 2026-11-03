"""USD/JPYで選んだ「過去60日の上げ下げに乗る」ルールを、選定に使っていない通貨ペアで試す"""
import numpy as np
import pandas as pd
from fxbot.backtest import evaluate
from fxbot.cli import load_csv

# 片道コストは価格の0.003%（GMOコインの今のスプレッドの半分＋API手数料に相当）
COST_RATE = 0.00003
rows = []
for pair in ["EUR_USD", "GBP_USD", "AUD_USD", "EUR_JPY", "GBP_JPY", "AUD_JPY"]:
    df = load_csv(f"data/{pair}_D.csv")
    close = df["close"]
    cost = close * COST_RATE
    start = max(pd.Timestamp("2000-01-01", tz="UTC"), close.index[0] + pd.Timedelta(days=200))
    for name, pos in {
        "60日の流れに乗る": np.sign(close.pct_change(60)),
        "20日の流れに乗る": np.sign(close.pct_change(20)),
        "120日の流れに乗る": np.sign(close.pct_change(120)),
        "ずっと買い": pd.Series(1.0, index=close.index),
    }.items():
        p = pos.fillna(0).astype(int)
        p = p[p.index >= start]
        m = evaluate(close, p, cost, 260).metrics
        years = (p.index[-1] - p.index[0]).days / 365.25
        rows.append(dict(pair=pair, rule=name, 期間=f"{p.index[0]:%Y}-{p.index[-1]:%Y}",
                         年率=round((1 + m["total_return"]) ** (1 / years) - 1, 4), sharpe=round(m["sharpe"], 2),
                         最大下落=round(m["max_drawdown"], 2)))
t = pd.DataFrame(rows)
print(t.pivot_table(index="pair", columns="rule", values="年率").round(4).to_string())
print()
print(t.pivot_table(index="pair", columns="rule", values="sharpe").to_string())
print()
print(t[t.rule == "60日の流れに乗る"][["pair", "期間", "年率", "sharpe", "最大下落"]].to_string(index=False))
