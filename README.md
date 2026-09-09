# submix

Netflix の字幕を、行ごとに「日本語 / 英語 / 非表示」へ確率的に振り分ける Chrome 拡張機能。

字幕のオン・オフしかない状態を、負荷スライダー1本の連続的なつまみに変える。
行単位で松葉杖の強さを混ぜるのが唯一の差分。

## 開発

```sh
npm install
npm run build      # dist/ に出力
npm run watch      # 変更を監視してビルド
npm run typecheck
npm run test
```

`chrome://extensions` で「パッケージ化されていない拡張機能を読み込む」から `dist/` を指定する。
