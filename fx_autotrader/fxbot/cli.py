import argparse
import json
import logging
from pathlib import Path

import pandas as pd

from fxbot import backtest, model, tune
from fxbot.config import BARS_PER_YEAR, load_gmo_settings, load_oanda_settings
from fxbot.gmo import GmoClient, GmoMarketData
from fxbot.live import Trader, run_forever
from fxbot.oanda import OandaClient

# 接続先ブローカーごとのクライアント生成（認証情報はそれぞれの環境変数から読む）
CLIENTS = {
    "gmo": lambda: GmoClient(load_gmo_settings()),
    "oanda": lambda: OandaClient(load_oanda_settings()),
}
# 過去データの取得元。GMOコインは Public API なので APIキー不要
DATA_SOURCES = {
    "gmo": GmoMarketData,
    "oanda": lambda: OandaClient(load_oanda_settings()),
}


POOL_HELP = "学習データに加える他の通貨ペアのCSV（評価は --data の通貨ペアだけで行う）"
SPREAD_RATIO_HELP = "スプレッドが直近のふだんの値（中央値）の何倍を超えたら売買を見送るか"


def load_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, index_col="time", parse_dates=["time"])


def cmd_fetch(args: argparse.Namespace) -> None:
    source = DATA_SOURCES[args.broker]()
    df = source.history(args.instrument, args.granularity, pd.Timestamp(args.start, tz="UTC"))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out)
    print(f"{len(df)} 本を {args.out} に保存しました")


def cmd_backtest(args: argparse.Namespace) -> None:
    result = backtest.run(
        load_csv(args.data),
        horizon=args.horizon,
        eval_start=pd.Timestamp(args.eval_start, tz="UTC"),
        test_size=args.test_size,
        train_window=args.train_window,
        threshold=args.threshold,
        max_spread_ratio=args.max_spread_ratio,
        fee=args.fee,
        bars_per_year=BARS_PER_YEAR[args.granularity],
        pool=[load_csv(p) for p in args.pool],
    )
    print(json.dumps(result.metrics, indent=2, ensure_ascii=False))
    result.equity.to_csv(args.equity_out, header=["equity"])
    print(f"資産曲線を {args.equity_out} に保存しました")


def cmd_tune(args: argparse.Namespace) -> None:
    result = tune.tune(
        load_csv(args.data),
        horizons=args.horizons,
        train_windows=args.train_windows,
        thresholds=args.thresholds,
        max_spread_ratios=args.max_spread_ratios,
        fee=args.fee,
        eval_start=pd.Timestamp(args.eval_start, tz="UTC"),
        test_size=args.test_size,
        bars_per_year=BARS_PER_YEAR[args.granularity],
        holdout_ratio=args.holdout_ratio,
        min_trades=args.min_trades,
        pool=[load_csv(p) for p in args.pool],
    )
    with pd.option_context("display.width", 200, "display.precision", 3):
        print(f"■ 検証期間（〜{result.split}）の成績 上位10件")
        print(result.table.head(10).to_string())
    print("\n■ 検証期間で選んだ設定")
    print(json.dumps(result.best, ensure_ascii=False))
    print(f"\n■ 最終確認期間（{result.split}〜）での成績 ※設定選びには使っていない期間")
    print(json.dumps(result.holdout, indent=2, ensure_ascii=False))


def cmd_train(args: argparse.Namespace) -> None:
    # バックテストと同じく、直近 train_window 本と同じ期間の他の通貨ペアで学習する
    own = load_csv(args.data).iloc[-args.train_window :]
    others = [p[p.index >= own.index[0]] for p in map(load_csv, args.pool)]
    trained = model.train([own, *others], args.horizon)
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
        max_spread_ratio=args.max_spread_ratio,
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

    # バックテストと設定探索で共通の評価条件
    evaluation = argparse.ArgumentParser(add_help=False)
    evaluation.add_argument("--data", type=Path, default=Path("data/USD_JPY_H1.csv"))
    evaluation.add_argument(
        "--eval-start", default="2024-06-26", help="この日以降を評価する（それより前は学習にだけ使う）"
    )
    evaluation.add_argument("--test-size", type=int, default=500, help="何本ごとに再学習するか")
    evaluation.add_argument(
        "--fee", type=float, default=0.002, help="片道の取引手数料（価格単位）。GMOコインAPIは1通貨0.002円"
    )
    evaluation.add_argument("--pool", type=Path, nargs="*", default=[], help=POOL_HELP)

    fetch = sub.add_parser("fetch", parents=[common], help="過去データを取得してCSV保存")
    # GMOコインの足データは 2023-10-27 以降のみ提供（取得は開始日の前日分からなので翌日を既定にする）
    fetch.add_argument("--start", default="2023-10-28")
    fetch.add_argument("--out", type=Path, default=Path("data/USD_JPY_H1.csv"))
    fetch.set_defaults(func=cmd_fetch)

    bt = sub.add_parser("backtest", parents=[common, evaluation], help="ウォークフォワードでバックテスト")
    # 既定値は tune で検証期間から選び、最終確認期間・再学習間隔・開始日の違いでも成績が崩れなかった設定
    bt.add_argument("--horizon", type=int, default=4, help="何本先の上下を予測するか")
    bt.add_argument(
        "--train-window", type=int, default=1_000_000, help="直近何本で学習するか（全本数以上なら全データ）"
    )
    bt.add_argument("--threshold", type=float, default=0.52, help="エントリーする上昇確率の閾値")
    bt.add_argument("--max-spread-ratio", type=float, default=1.0, help=SPREAD_RATIO_HELP)
    bt.add_argument("--equity-out", type=Path, default=Path("data/equity.csv"))
    bt.set_defaults(func=cmd_backtest)

    tn = sub.add_parser("tune", parents=[common, evaluation], help="検証期間で設定を選び、最終確認期間で評価")
    tn.add_argument("--horizons", type=int, nargs="+", default=[1, 2, 4])
    tn.add_argument("--train-windows", type=int, nargs="+", default=[4000, 1_000_000])
    tn.add_argument("--thresholds", type=float, nargs="+", default=[0.52, 0.55, 0.58, 0.6])
    tn.add_argument("--max-spread-ratios", type=float, nargs="+", default=[1.0, 1.5, 3.0, 1000.0])
    tn.add_argument("--holdout-ratio", type=float, default=0.4, help="予測期間のうち最終確認に取っておく割合")
    tn.add_argument("--min-trades", type=int, default=200, help="選ぶ設定に必要な検証期間の最低売買回数")
    tn.set_defaults(func=cmd_tune)

    tr = sub.add_parser("train", parents=[common], help="全データで学習してモデル保存")
    tr.add_argument("--data", type=Path, default=Path("data/USD_JPY_H1.csv"))
    tr.add_argument("--horizon", type=int, default=4)
    tr.add_argument("--train-window", type=int, default=1_000_000)
    tr.add_argument("--pool", type=Path, nargs="*", default=[], help=POOL_HELP)
    tr.add_argument("--model", type=Path, default=Path("models/model.joblib"))
    tr.set_defaults(func=cmd_train)

    lv = sub.add_parser("live", parents=[common], help="口座で自動売買を実行")
    lv.add_argument("--model", type=Path, default=Path("models/model.joblib"))
    lv.add_argument("--units", type=int, default=100, help="1回の注文数量（通貨単位）")
    lv.add_argument("--threshold", type=float, default=0.52)
    lv.add_argument("--max-spread-ratio", type=float, default=1.0, help=SPREAD_RATIO_HELP)
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
