"""五十日（ゴトー日）の仲値前後のUSD/JPYの値動きを、五十日とそれ以外の日で比べる"""
import datetime as dt

import jpholiday
import numpy as np
import pandas as pd

from fxbot.cli import load_csv

FEE = 0.002


def business_day(d: dt.date) -> bool:
    return d.weekday() < 5 and not jpholiday.is_holiday(d)


def previous_business_day(d: dt.date) -> dt.date:
    while not business_day(d):
        d -= dt.timedelta(days=1)
    return d


def gotobi_dates(start: dt.date, end: dt.date) -> set:
    days = set()
    for month in pd.period_range(start, end, freq="M"):
        y, m = month.year, month.month
        candidates = [dt.date(y, m, n) for n in (5, 10, 15, 20, 25)] + [month.end_time.date()]
        days |= {previous_business_day(c) for c in candidates}
    return days


df = load_csv("data/USD_JPY_H1_combined.csv")
# 各時刻の価格 = その時刻に終わる1時間足の終値（日本時間）
at = df[["close", "spread"]].copy()
at.index = (at.index + pd.Timedelta(hours=1)).tz_convert("Asia/Tokyo")
dates = sorted({t.date() for t in at.index if business_day(t.date())})
gotobi = gotobi_dates(dates[0], dates[-1])

windows = {"8時→10時 買い": (8, 10, 1), "9時→10時 買い": (9, 10, 1), "10時→15時 売り": (10, 15, -1)}
rows = []
for d in dates:
    for name, (h0, h1, side) in windows.items():
        t0 = pd.Timestamp(dt.datetime(d.year, d.month, d.day, h0), tz="Asia/Tokyo")
        t1 = pd.Timestamp(dt.datetime(d.year, d.month, d.day, h1), tz="Asia/Tokyo")
        if t0 not in at.index or t1 not in at.index:
            continue
        gross = side * (at.at[t1, "close"] - at.at[t0, "close"])
        cost = at.at[t0, "spread"] / 2 + at.at[t1, "spread"] / 2 + 2 * FEE
        rows.append(dict(date=d, window=name, gotobi=d in gotobi, gross=gross * 100, net=(gross - cost) * 100,
                         period="2020-01〜2023-10" if d < dt.date(2023, 10, 30) else "2023-10〜2026-11（GMO実データ）"))
r = pd.DataFrame(rows)


def summarize(g):
    return pd.Series({"日数": len(g), "平均(銭)": g["gross"].mean(), "t値": g["gross"].mean() / g["gross"].std() * np.sqrt(len(g)),
                      "コスト後平均(銭)": g["net"].mean(), "勝率": (g["net"] > 0).mean()})


print(r.groupby(["window", "gotobi"]).apply(summarize, include_groups=False).round(2).to_string())
print()
print(r[r.gotobi].groupby(["window", "period"]).apply(summarize, include_groups=False).round(2).to_string())
print()
g = r[r.gotobi & (r.window == "9時→10時 買い")]
print("9時→10時（五十日）年別のコスト後平均(銭):", g.groupby(pd.to_datetime(g.date).dt.year)["net"].mean().round(2).to_dict())
g = r[r.gotobi & (r.window == "8時→10時 買い")]
print("8時→10時（五十日）年別のコスト後平均(銭):", g.groupby(pd.to_datetime(g.date).dt.year)["net"].mean().round(2).to_dict())
