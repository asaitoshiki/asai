import pandas as pd

JST = "Asia/Tokyo"


def hourly_spread_profile(df: pd.DataFrame, recent_days: int) -> pd.Series:
    """直近 recent_days 日のスプレッドの、日本時間の時刻ごとの中央値"""
    recent = df[df.index >= df.index[-1] - pd.Timedelta(days=recent_days)]
    return recent["spread"].groupby(recent.index.tz_convert(JST).hour).median()


def combine(history: pd.DataFrame, recent: pd.DataFrame, recent_days: int) -> pd.DataFrame:
    """スプレッドの無い長期データ（history）の後ろに、売買するブローカーのデータ（recent）をつなぐ

    history の期間のスプレッドは、recent の直近 recent_days 日の時刻ごとの値がそのままかかっていたと仮定する。
    重なる期間は recent を優先する
    """
    profile = hourly_spread_profile(recent, recent_days)
    older = history[history.index < recent.index[0]]
    spread = profile.loc[older.index.tz_convert(JST).hour].to_numpy()
    return pd.concat([older.assign(spread=spread), recent])
