import io

import pandas as pd
import requests

FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv"
MA_DAYS = 200
# 判定に使う株価指数（FRED の系列ID）
INDEXES = {"SP500": ("S&P500", "SP500"), "NASDAQ": ("ナスダック総合", "NASDAQCOM"), "NIKKEI": ("日経平均", "NIKKEI225")}


def fetch_fred(series: str, session: requests.Session | None = None) -> pd.Series:
    res = (session or requests.Session()).get(FRED_URL, params={"id": series}, timeout=60)
    res.raise_for_status()
    df = pd.read_csv(io.StringIO(res.text), index_col=0, parse_dates=True, na_values=".")
    return df.iloc[:, 0].dropna()


def trend_state(close: pd.Series) -> dict:
    """直近の終値が200日平均より上か（＝保有すべきか）と、前日から切り替わったかを返す"""
    ma = close.rolling(MA_DAYS).mean()
    above = (close > ma)[ma.notna()]
    return {
        "date": above.index[-1],
        "close": float(close.iloc[-1]),
        "ma": float(ma.iloc[-1]),
        "hold": bool(above.iloc[-1]),
        "changed": bool(above.iloc[-1] != above.iloc[-2]),
        "gap": float(close.iloc[-1] / ma.iloc[-1] - 1),
    }


def message(name: str, state: dict) -> str:
    action = "保有（2倍ETFを持つ）" if state["hold"] else "退避（売って現金で待つ）"
    head = f"【切り替え】{name}: 今日から{action}" if state["changed"] else f"{name}: {action}を継続"
    return (
        f"{head}\n"
        f"  {state['date']:%Y-%m-%d} 終値 {state['close']:,.2f} / 200日平均 {state['ma']:,.2f}（{state['gap']:+.1%}）"
    )
