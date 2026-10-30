import os
from dataclasses import dataclass

API_URLS = {
    "practice": "https://api-fxpractice.oanda.com",
    "live": "https://api-fxtrade.oanda.com",
}

# 年率換算に使う1年あたりの足の本数（FXは週5日・24時間を前提）
BARS_PER_YEAR = {
    "M5": 12 * 24 * 260,
    "M15": 4 * 24 * 260,
    "H1": 24 * 260,
    "H4": 6 * 260,
    "D": 260,
}


@dataclass(frozen=True)
class Settings:
    api_token: str
    account_id: str
    base_url: str


def load_settings() -> Settings:
    # 必須の環境変数が無ければ KeyError で即停止させる
    return Settings(
        api_token=os.environ["OANDA_API_TOKEN"],
        account_id=os.environ["OANDA_ACCOUNT_ID"],
        base_url=API_URLS[os.environ.get("OANDA_ENV", "practice")],
    )
