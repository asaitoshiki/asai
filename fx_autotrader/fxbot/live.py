import logging
import time

from sklearn.ensemble import HistGradientBoostingClassifier

from fxbot.features import build_features
from fxbot.model import predict_up_proba, to_position
from fxbot.oanda import OandaClient

log = logging.getLogger(__name__)

# 特徴量の計算に必要な過去本数（最長の移動平均50本＋余裕）
LOOKBACK = 300


class LossLimitExceeded(Exception):
    pass


class Trader:
    """確定足が更新されるたびに予測し、目標ポジションへ建て直す"""

    def __init__(
        self,
        client: OandaClient,
        model: HistGradientBoostingClassifier,
        instrument: str,
        granularity: str,
        units: int,
        threshold: float,
        stop_loss_distance: float,
        max_loss_ratio: float,
    ):
        self.client = client
        self.model = model
        self.instrument = instrument
        self.granularity = granularity
        self.units = units
        self.threshold = threshold
        self.stop_loss_distance = stop_loss_distance
        self.max_loss_ratio = max_loss_ratio
        self.start_nav = client.nav()
        self.last_bar = None

    def step(self) -> None:
        self._guard_loss()
        candles = self.client.recent_candles(self.instrument, self.granularity, LOOKBACK)
        latest_bar = candles.index[-1]
        if latest_bar == self.last_bar:
            return
        self.last_bar = latest_bar

        features = build_features(candles).dropna().iloc[[-1]]
        up_proba = predict_up_proba(self.model, features)
        target = int(to_position(up_proba, self.threshold).iloc[-1]) * self.units
        log.info("bar=%s up_proba=%.3f target=%d", latest_bar, up_proba.iloc[-1], target)
        self._rebalance(target)

    def _guard_loss(self) -> None:
        """起動時からの損失が上限を超えたら全決済して停止する"""
        nav = self.client.nav()
        if nav >= self.start_nav * (1 - self.max_loss_ratio):
            return
        self._flatten(self.client.net_units(self.instrument))
        raise LossLimitExceeded(f"NAV {nav} が起動時 {self.start_nav} から上限以上に減少")

    def _rebalance(self, target: int) -> None:
        current = self.client.net_units(self.instrument)
        if current == target:
            return
        self._flatten(current)
        self._open(target)

    def _flatten(self, current: int) -> None:
        if current == 0:
            return
        log.info("close units=%d", current)
        self.client.reduce_position(self.instrument, -current)

    def _open(self, target: int) -> None:
        if target == 0:
            return
        log.info("open units=%d", target)
        self.client.open_position(self.instrument, target, self.stop_loss_distance)


def run_forever(trader: Trader, poll_seconds: int) -> None:
    while True:
        trader.step()
        time.sleep(poll_seconds)
