import argparse
import json
import logging
from pathlib import Path

import pandas as pd

from fxbot import backtest, model
from fxbot.config import BARS_PER_YEAR, load_gmo_settings, load_oanda_settings
from fxbot.gmo import GmoClient
from fxbot.live import Trader, run_forever
from fxbot.oanda import OandaClient

# 接続先ブローカーごとのクライアント生成（認証情報はそれぞれの環境変数から読む）
CLIENTS = {
    "gmo": lambda: GmoClient(load_gmo_settings()),
    "oanda": lambda: OandaClient(load_oanda_settings()),
}


def load_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, index_col="time", parse_dates=["time"])


def cmd_fetch(args: argparse.Namespace) -> None:
    client = CLIENTS[args.broker]()
    df = client.history(args.instrument, args.granularity, pd.Timestamp(args.start, tz="UTC"))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out)
    print(f"{len(df)} 本を {args.out} に保存しました")


def cmd_backtest(args: argparse.Namespace) -> None:
    result = backtest.run(
        load_csv(args.data),
        horizon=args.horizon,
        train_size=args.train_size,
        test_size=args.test_size,
        threshold=args.threshold,
        cost=args.cost,
        bars_per_year=BARS_PER_YEAR[args.granularity],
    )
    print(json.dumps(result.metrics, indent=2, ensure_ascii=False))
    result.equity.to_csv(args.equity_out, header=["equity"])
    print(f"資産曲線を {args.equity_out} に保存しました")


def cmd_train(args: argparse.Namespace) -> None:
    trained = model.train(load_csv(args.data), args.horizon)
    model.save(trained, args.model, args.horizon)
    print(f"モデルを {args.model} に保存しました")


def cmd_live(args: argparse.Namespace) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    trader = Trader(
        client=CLIENTS[args.broker](),
        model=model.load(args.model),
        instrument=args.instrument,
        granularity=args.granularity,
        units=args.units,
        threshold=args.threshold,
        stop_loss_distance=args.stop_loss,
        max_loss_ratio=args.max_loss,
    )
    run_forever(trader, args.poll_seconds)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="fxbot", description="機械学習FX自動売買ボット")
    sub = parser.add_subparsers(required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--broker", default="gmo", choices=list(CLIENTS))
    common.add_argument("--instrument", default="USD_JPY")
    common.add_argument("--granularity", default="H1", choices=list(BARS_PER_YEAR))

    fetch = sub.add_parser("fetch", parents=[common], help="過去データを取得してCSV保存")
    fetch.add_argument("--start", default="2022-01-01")
    fetch.add_argument("--out", type=Path, default=Path("data/USD_JPY_H1.csv"))
    fetch.set_defaults(func=cmd_fetch)

    bt = sub.add_parser("backtest", parents=[common], help="ウォークフォワードでバックテスト")
    bt.add_argument("--data", type=Path, default=Path("data/USD_JPY_H1.csv"))
    bt.add_argument("--horizon", type=int, default=4, help="何本先の上下を予測するか")
    bt.add_argument("--train-size", type=int, default=4000)
    bt.add_argument("--test-size", type=int, default=500)
    bt.add_argument("--threshold", type=float, default=0.55, help="エントリーする上昇確率の閾値")
    bt.add_argument(
        "--cost",
        type=float,
        default=0.003,
        help="片道の売買コスト（価格単位）。GMOコインのUSD/JPYならスプレッドの半分0.001＋API手数料0.002",
    )
    bt.add_argument("--equity-out", type=Path, default=Path("data/equity.csv"))
    bt.set_defaults(func=cmd_backtest)

    tr = sub.add_parser("train", parents=[common], help="全データで学習してモデル保存")
    tr.add_argument("--data", type=Path, default=Path("data/USD_JPY_H1.csv"))
    tr.add_argument("--horizon", type=int, default=4)
    tr.add_argument("--model", type=Path, default=Path("models/model.joblib"))
    tr.set_defaults(func=cmd_train)

    lv = sub.add_parser("live", parents=[common], help="口座で自動売買を実行")
    lv.add_argument("--model", type=Path, default=Path("models/model.joblib"))
    lv.add_argument("--units", type=int, default=1000, help="1回の注文数量（通貨単位）")
    lv.add_argument("--threshold", type=float, default=0.55)
    lv.add_argument("--stop-loss", type=float, default=0.5, help="損切り幅（価格単位）")
    lv.add_argument("--max-loss", type=float, default=0.05, help="起動時NAVからの許容損失率")
    lv.add_argument("--poll-seconds", type=int, default=60)
    lv.set_defaults(func=cmd_live)

    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
