# Archive

このフォルダーには、Memory Fragments の開発過程で作成した旧版、手動試験ページ、設定メモ、決済実装の参考コードを**削除せず保存**しています。

ここにあるファイルは、現在の本番サイトでは使用していません。現行の公開対象は、ルートの `index.html` と `scripts/build-static.cjs` に明示された許可リストだけです。

## 分類

| フォルダー | 内容 | 現在の扱い |
|---|---|---|
| `legacy-app/` | 旧画面、アップロード試験、過去の JavaScript / CSS | 履歴確認専用。動作保証なし |
| `notes/` | 過去の設定手順、障害対応、検討資料 | 当時の記録。現在の手順ではない |
| `payment-reference/` | Stripe / Firebase Functions の過去実装 | 実装参考。新規課金には使用していない |
| `config/` | 旧 Netlify、Vite、CORS 設定 | 現在の Vercel 配信では未使用 |
| `external-references/` | 開発初期に参照していた別 Git リポジトリへのリンク | Memory Fragments 本体では未使用 |

## 注意

- 旧画面から参照される相対パスは、移動前の構成を前提としている場合があります。
- 復元や再利用を行う場合は、当時の Git コミットと依存関係を確認してください。
- 現在の仕様・安全対策・動作確認結果は、ルートの [`README.md`](../README.md) と [`docs/`](../docs/) を参照してください。
