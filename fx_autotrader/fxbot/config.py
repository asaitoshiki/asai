import os
from dataclasses import dataclass

OANDA_API_URLS = {
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

BAR_SECONDS = {
    "M5": 5 * 60,
    "M15": 15 * 60,
    "H1": 60 * 60,
    "H4": 4 * 60 * 60,
    "D": 24 * 60 * 60,
}


@dataclass(frozen=True)
class OandaSettings:
    api_token: str
    account_id: str
    base_url: str


@dataclass(frozen=True)
class GmoSettings:
    api_key: str
    api_secret: str


# 必須の環境変数が無ければ KeyError で即停止させる
def load_oanda_settings() -> OandaSettings:
    return OandaSettings(
        api_token=os.environ["OANDA_API_TOKEN"],
        account_id=os.environ["OANDA_ACCOUNT_ID"],
        base_url=OANDA_API_URLS[os.environ.get("OANDA_ENV", "practice")],
    )


def load_gmo_settings() -> GmoSettings:
    return GmoSettings(api_key=os.environ["GMO_API_KEY"], api_secret=os.environ["GMO_API_SECRET"])
