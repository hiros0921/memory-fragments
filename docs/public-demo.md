# Memory Fragments 公開デモ

## 公開URL

- 通常画面: https://www.memory-fragments.com/
- ログイン不要デモ: https://www.memory-fragments.com/?demo=true

## デモで試せる操作

- 架空の日記3件と合成写真の閲覧
- 日記の追加と任意の写真添付
- キーワード検索
- カテゴリーとタグによる絞り込み
- 詳細表示
- 日記の削除

追加・削除した内容はページ内メモリだけに保持されます。再読み込みで3件へ戻り、個人用の日記には保存されません。

## 写真と個人情報

初期表示する3枚は、人物・文字・ロゴ・透かしを含まないよう生成し、目視確認した合成画像です。日記の内容もすべて架空で、実在する利用者の情報は使用していません。

## データ分離

`?demo=true` では、Firebase Authenticationの認証監視、Firestore、Firebase Storage、Analytics、位置情報を起動しません。共有、書き出し、課金、クラウド同期の操作も表示しません。デモURLに実在する日記IDを指定しても、通常のデータ取得へ切り替わりません。

通常画面のログイン、本人認証付き写真表示、クラウド保存、端末内フォールバック、検索、統計、書き出しの動作は変更していません。Firebaseルール、Storageルール、Cloud Functions、既存データも今回の公開対象には含めません。

## 検証

自動検証:

```bash
node --test tests/demo-memory-store.test.cjs tests/demo-mode.test.cjs tests/static-build.test.cjs
npm test
npm run build
```

最終確認では、通常画面とデモ画面をデスクトップ幅、390×844、360×800で表示しました。追加・写真添付・検索・カテゴリー／タグ絞り込み・詳細・再読み込みを本番画面で確認し、削除は自動テストで確認しています。デモ中に個人情報、ログイン、位置情報、書き出し、課金の各機能が表示されず、Firebaseや位置情報を起動しないことも自動テストで確認しました。

## 本番反映記録

- 反映日: 2026-09-22
- 公開デモ実装コミット: `e07655a61fb36274880f7708ae8cd5ba07cf23c5`
- GitHub PR: https://github.com/hiros0921/memory-fragments/pull/6
- VercelデプロイID: `dpl_3So3sKVNc4ze9sm5YszPwgvd55f1`
- デプロイURL: https://memory-fragments-v2-n1f81ro1y-hiroyuki-suwas-projects.vercel.app
- 本番URL: https://www.memory-fragments.com/?demo=true
- ロールバック先: `dpl_7tPEwcpU3A6tCJhwPr6SND5LsXjM`

確認結果:

- `npm test`: 165件すべて成功
- `npm run build`: 公開対象25ファイルを生成
- GitHub連携のVercelプレビュー3件: すべて成功
- 本番のHTML、デモ用JavaScript、画像3枚: 検証済み`dist`とSHA-256が一致
- 通常画面、デモ画面、デモ用JavaScript、画像3枚: すべてHTTP 200
- 本番操作: 日記追加、写真添付、検索、カテゴリー／タグ絞り込み、詳細、再読み込みリセットを確認
- 390×844: viewport 390px、scrollWidth 382px、削除ボタン44×44px
- 360×800: viewport 360px、scrollWidth 352px、カード右端336px
- 本番ブラウザのコンソールエラー: 0件
- 購入・アップグレード・決済の表示: なし
- Firebaseルール、Storageルール、Cloud Functions: デプロイしていない
