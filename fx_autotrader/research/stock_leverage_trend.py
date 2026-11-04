"""株価指数 × レバレッジ × 200日平均の上でだけ持つ手法を、ずっと持つ場合と比べる

使い方: stock_leverage_trend.py <research|holdout|sealed>
  research: S&P500（SPY配当込み）の研究期間（1993〜2009年）
  holdout : S&P500 の確認期間（2010年〜）
  sealed  : 手法が決まるまで封印していたナスダック総合指数と日経平均（価格指数、配当なし）
"""
import sys

import numpy as np
import pandas as pd

TRADING_DAYS = 252
SWITCH_COST = 0.001  # 乗り換えの片道コスト
FEES = {1: 0.001, 2: 0.01, 3: 0.01}  # 年率の信託報酬（レバレッジ型は約1%）
MA_DAYS = 200
PERIODS = {
    "research": {"S&P500": ("SPY_TR", "1994-01-01", "2009-12-31")},
    "holdout": {"S&P500": ("SPY_TR", "2010-01-01", "2026-12-31")},
    "sealed": {"ナスダック": ("NASDAQCOM", "1972-01-01", "2026-12-31"), "日経平均": ("NIKKEI225", "1972-01-01", "2026-12-31")},
}


def load(name: str) -> pd.Series:
    return pd.read_csv(f"data/fred/{name}.csv", index_col=0, parse_dates=True, na_values=".").iloc[:, 0].dropna()


def run(close: pd.Series, rf: pd.Series, leverage: int, filtered: bool) -> pd.Series:
    """t日の終値で決めた保有を t→t+1 に適用した日次リターン"""
    ret = close.pct_change().shift(-1)
    daily_rf = rf.reindex(close.index).ffill() / 100 / TRADING_DAYS
    # レバレッジ分は短期金利で借りる。信託報酬も日割りで差し引く
    held = leverage * ret - (leverage - 1) * daily_rf - FEES[leverage] / TRADING_DAYS
    invested = (close > close.rolling(MA_DAYS).mean()).astype(float) if filtered else pd.Series(1.0, index=close.index)
    return invested * held + (1 - invested) * daily_rf - invested.diff().abs() * SWITCH_COST


def stats(r: pd.Series) -> str:
    r = r.dropna()
    eq = (1 + r).cumprod()
    years = len(r) / TRADING_DAYS
    return (f"年率 {eq.iloc[-1] ** (1 / years) - 1:+6.1%}  sharpe {r.mean() / r.std() * np.sqrt(TRADING_DAYS):+.2f}  "
            f"最大下落 {(eq / eq.cummax() - 1).min():+.0%}  100万円→{eq.iloc[-1] * 100:,.0f}万円")


rf = load("DTB3")
for index_name, (series, start, end) in PERIODS[sys.argv[1]].items():
    close = load(series)
    print(f"■ {index_name}（{start[:4]}〜{min(end[:4], f'{close.index[-1]:%Y}')}）")
    for filtered in [False, True]:
        for leverage in [1, 2, 3]:
            r = run(close, rf, leverage, filtered)[start:end]
            label = f"{'200日平均の上だけ' if filtered else 'ずっと持つ'} {leverage}倍"
            print(f"  {label:16s} {stats(r)}")
