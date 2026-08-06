# 冷蔵庫キーパー（FridgeKeeper）

食品ロスを減らす Android アプリ。賞味期限・消費期限を管理し、**腐らせる前に気づかせる**ことを目的とする。
サーバー通信・外部 API・AI を一切使わず、すべて端末内で完結する。

- 仕様書: [`docs/fridge-app-spec.md`](docs/fridge-app-spec.md)
- 開発方針: [`CLAUDE.md`](CLAUDE.md)

## 技術構成

Kotlin / Jetpack Compose / Room / Hilt / Coroutines・Flow（v1.0 では以降のフェーズで DataStore・WorkManager・CameraX・ML Kit・Glance を追加）。

- `compileSdk` / `targetSdk`: 35
- `minSdk`: 26（`java.time.LocalDate` をデシュガリングなしで使うため）
- JDK 17

## パッケージ構成

```
com.asaitoshiki.fridgekeeper
├── ui/          Compose 画面 + ViewModel
├── domain/      期限計算などのビジネスロジック
│   ├── model/   FoodCategory / StorageLocation / ExpiryType / ConsumptionType
│   └── expiry/  PresetExpiryTable（カテゴリ × 保管場所 → 目安日数）
├── data/
│   ├── local/   Room の Database / Entity / DAO / TypeConverter
│   └── repository/
└── di/          Hilt モジュール
```

## ビルド

```sh
./gradlew :app:assembleDebug   # APK
./gradlew :app:testDebugUnitTest   # ユニットテスト
```

Android SDK が必要。`local.properties` に `sdk.dir` を設定するか、`ANDROID_HOME` を通しておくこと。

## 実装状況

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 1 | 基盤（Room、Repository、Hilt、Enum、プリセット期限テーブル） | ✅ 完了 |
| Phase 2 | コア機能（手動登録／編集／削除、期限順ホーム、緊急度の色分け、推定期限の導出） | 未着手 |
| Phase 3 | 消費とストリーク | 未着手 |
| Phase 4 | 通知（WorkManager） | 未着手 |
| Phase 5 | 入力削減（バーコード、JAN 辞書、テンプレート） | 未着手 |
| Phase 6 | 仕上げ（ウィジェット、エクスポート／インポート、免責同意、設定） | 未着手 |

Phase 1 時点のホーム画面は、Room と Hilt の配線が通っていることを確認するための在庫件数表示のみ。

## 免責

本アプリが表示する期限および目安日数は一般的な参考情報であり、食品の実際の安全性を保証するものではありません。
実際の日持ちは、購入時の鮮度・開封の有無・保管温度等により大きく変動します。
喫食の可否は、必ずご自身で食品の状態（見た目・におい等）を確認してご判断ください。
