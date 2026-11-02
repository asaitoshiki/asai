import pandas as pd


def combine(history: pd.DataFrame, recent: pd.DataFrame) -> pd.DataFrame:
    """学習用の長期データ（history）の後ろに、売買するブローカーのデータ（recent）をつなぐ。重なる期間は recent を優先する"""
    return pd.concat([history[history.index < recent.index[0]], recent])
