# Stripe審査対応ガイド - Memory Fragments

## ✅ 対応完了項目

### 1. 特定商取引法に基づく表記ページ
- ✅ `transaction-law.html` を作成
- ✅ 必要な項目をすべて記載
- ✅ フッターからリンク設置

### 2. ランディングページ（一般公開用）
- ✅ `landing.html` を作成
- ✅ 認証なしでアクセス可能
- ✅ サービス内容の説明
- ✅ 料金プランの明記

### 3. アクセシビリティ対応
- ✅ メインアプリ（index.html）にフッター追加
- ✅ 特定商取引法へのリンク設置

## 📝 Stripeへの回答テンプレート

```
Stripe審査チーム 御中

ご指摘いただいた点について、以下の通り対応いたしました。

1. ウェブサイトのアクセシビリティについて
- ランディングページ（https://[あなたのドメイン]/landing.html）を作成し、
  ログイン不要でサービス内容を確認できるようにしました。
- サービス名「Memory Fragments」および内容が明確に表示されています。

2. 特定商取引法に基づく表記について
- 特定商取引法ページ（https://[あなたのドメイン]/transaction-law.html）を作成しました。
- すべてのページのフッターからアクセス可能です。
- 必要な項目（販売者名、連絡先、価格、支払方法等）をすべて記載しています。

ご確認のほど、よろしくお願いいたします。
```

## 🚀 デプロイ時の注意事項

### Vercelの場合
1. `vercel.json` に以下を追加して、すべてのHTMLファイルが正しくルーティングされるようにする：

```json
{
  "routes": [
    {
      "src": "/landing",
      "dest": "/landing.html"
    },
    {
      "src": "/transaction-law",
      "dest": "/transaction-law.html"
    }
  ]
}
```

### ドメイン設定
- Stripeに登録したドメインが正しくアクセスできることを確認
- HTTPSが有効になっていることを確認

## 📋 最終チェックリスト

- [ ] ランディングページがログインなしで表示される
- [ ] 特定商取引法ページが表示される
- [ ] すべてのページにフッターが表示される
- [ ] フッターから特定商取引法ページへリンクできる
- [ ] サービス名「Memory Fragments」が明記されている
- [ ] 料金（月額480円）が明記されている
- [ ] 連絡先情報が記載されている

## ⚠️ 注意事項

1. **個人情報の保護**
   - 住所や電話番号は「お問い合わせいただいた方にのみ開示」と記載
   - これは個人事業主の場合に認められる対応です

2. **メールアドレス**
   - contact@memory-fragments.app は実際に受信可能なアドレスに変更してください
   - または、実際のメールアドレスを記載してください

3. **更新忘れ防止**
   - 料金変更時は特定商取引法ページも更新
   - 連絡先変更時も同様に更新

これで審査に必要な要件は満たされているはずです！