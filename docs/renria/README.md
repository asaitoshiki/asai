# 恋リア登場人物データベース

GitHub Pages の `/renria/` で公開される静的サイト。データはすべて `data.json` に記載する。

- `shows`: 番組とシーズン（`seasons[].id` は人物・関係から参照される）
- `people`: 人物。`appearances[].season` で出演シーズンを、`sources` で出典 URL を持つ
- `relations`: 人物間の関係（`from` / `to` は人物 ID、`season` はシーズン ID、`source` は出典 URL）

未定義の ID を参照すると読み込み時にエラーになる。出典のない情報は載せない。

ローカル確認: `python3 -m http.server` を実行して http://localhost:8000/ を開く。
