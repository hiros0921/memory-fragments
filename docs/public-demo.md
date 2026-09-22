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

最終確認では、通常画面とデモ画面をデスクトップ幅および390×844で表示し、デモの追加・写真添付・検索・絞り込み・詳細・削除・再読み込みを確認します。また、デモ中に個人情報と非公開機能が表示されず、外部データサービスへ接触しないことを確認します。

## 本番反映記録

本番反映後に、Gitコミット、VercelデプロイID、デプロイURL、確認結果をここへ追記します。
