# fx_autotrader

機械学習でFXの値動きを予測し、OANDA の口座で自動売買する Python ボットです。
まずは **バックテスト → デモ口座での自動売買** までを対象にしています。

## しくみ

```
OANDA API ──▶ 過去データ(CSV) ──▶ 特徴量 ──▶ 勾配ブースティングで「N本先が上がるか」を予測
                                                   │
                     ┌─────────────────────────────┴───────────────┐
                     ▼                                             ▼
          ウォークフォワード・バックテスト                    ライブ売買（確定足ごと）
          （再学習しながら未学習期間だけ評価）              上昇確率 > 閾値 → 買い
                                                            上昇確率 < 1-閾値 → 売り
                                                            それ以外 → ノーポジ
```

| ファイル | 役割 |
| --- | --- |
| `fxbot/oanda.py` | OANDA v20 REST API クライアント（ローソク足取得・口座情報・成行注文） |
| `fxbot/features.py` | 特徴量（リターン、移動平均乖離、RSI、ボラティリティ、ATR、時刻）とラベル |
| `fxbot/model.py` | モデルの学習・予測・保存、確率→ポジション変換 |
| `fxbot/backtest.py` | ウォークフォワード検証とスプレッド込みの成績評価 |
| `fxbot/live.py` | 自動売買ループ（損切り注文付き、最大損失で全決済して停止） |
| `fxbot/cli.py` | コマンドライン入口 |

## セットアップ

1. [OANDA](https://www.oanda.com/) でデモ口座（fxTrade Practice）を開設し、API トークンを発行
2. 依存パッケージをインストール

```bash
python -m venv .venv && source .venv/bin/activate
```

```bash
pip install -r requirements.txt
```

3. 認証情報を環境変数に設定（`.env.example` を参照）

```bash
export OANDA_API_TOKEN=xxxx OANDA_ACCOUNT_ID=101-xxx OANDA_ENV=practice
```

## 使い方

### 1. 過去データを取得

```bash
python -m fxbot.cli fetch --instrument USD_JPY --granularity H1 --start 2022-01-01 --out data/USD_JPY_H1.csv
```

### 2. バックテスト

```bash
python -m fxbot.cli backtest --data data/USD_JPY_H1.csv --horizon 4 --threshold 0.55 --spread 0.002
```

4000本で学習 → 次の500本を予測、を繰り返して評価します。出力の見方:

- `total_return` / `buy_and_hold`: 戦略と単純保有の累積リターン
- `sharpe`: 年率シャープレシオ（1以上が一つの目安）
- `max_drawdown`: 最大下落率
- `trades` / `exposure`: 売買回数とポジション保有率

`--spread` は1回の売買コストです（USD/JPY で 0.2銭なら `0.002`）。
**コストを過小に設定するとバックテストだけ良く見えるので注意してください。**

### 3. 学習してモデルを保存

```bash
python -m fxbot.cli train --data data/USD_JPY_H1.csv --horizon 4 --model models/model.joblib
```

### 4. デモ口座で自動売買

```bash
python -m fxbot.cli live --model models/model.joblib --units 1000 --threshold 0.55 --stop-loss 0.5 --max-loss 0.05
```

- 確定足が更新されるたびに予測し、目標ポジション（+units / 0 / -units）に建て直します
- 新規注文には必ず損切り（`--stop-loss`、価格単位）を付けます
- 起動時の NAV から `--max-loss`（既定5%）以上減ると全決済して停止します
- API エラーなどは握りつぶさずに停止します。常時稼働させる場合は systemd などで再起動を管理してください

## テスト

```bash
pytest
```

合成データで、特徴量が未来を参照しないこと、バックテストのコスト計算、注文内容、売買ループの挙動を確認しています。

## 注意

- FX の値動き予測は非常に難しく、バックテストで勝てても将来の利益は保証されません。
  まず必ずデモ口座で十分な期間動かしてください
- 本番口座（`OANDA_ENV=live`）で使う場合は、損失が出ても問題ない金額で、自己責任で運用してください
- 改善の余地: 特徴量の追加、閾値・ホライズンの調整、ATR 連動の損切り幅、資金に応じたロット計算、通知機能 など
