# Stripe決済機能セットアップ手順

## 1. Stripeダッシュボードで商品を作成

1. [Stripe Dashboard](https://dashboard.stripe.com/test/products)にログイン
2. 「商品」→「新しい商品を追加」をクリック
3. 以下の情報を入力：
   - 商品名: Memory Fragments プレミアム
   - 説明: 無制限の記憶保存、クラウド同期、高度な検索機能
   - 価格: ¥500
   - 請求期間: 月次
   - 価格ID: 自動生成される（例: `price_1234567890abcdef`）

4. 価格IDをコピーして保存

## 2. Firebase Functionsの設定

### 必要なツールのインストール
```bash
npm install -g firebase-tools
```

### Firebase Functionsの初期化
```bash
cd memory-fragments-app
firebase init functions
```

### Stripe秘密キーとWebhook秘密キーの設定
```bash
firebase functions:config:set stripe.secret_key="sk_test_51RltmW2L9dU9a..." 
firebase functions:config:set stripe.webhook_secret="whsec_..."
```

### 依存関係のインストール
```bash
cd functions
npm install
```

### Firebase Functionsのデプロイ
```bash
firebase deploy --only functions
```

## 3. Stripe Webhookの設定

1. [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)にアクセス
2. 「エンドポイントを追加」をクリック
3. エンドポイントURL: `https://[YOUR-REGION]-[YOUR-PROJECT].cloudfunctions.net/stripeWebhook`
4. リッスンするイベント:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
5. Webhook署名シークレットをコピー

## 4. HTMLファイルの更新

`index.html`の以下の部分を更新：

```javascript
// 価格IDを実際のものに置き換える
const { data } = await createCheckoutSession({
    priceId: 'price_XXXXXX', // ← ここを実際の価格IDに置き換える
    successUrl: window.location.origin + '?success=true',
    cancelUrl: window.location.origin + '?canceled=true',
});
```

## 5. テスト

### テストカード番号
- カード番号: `4242 4242 4242 4242`
- 有効期限: 任意の未来の日付
- CVC: 任意の3桁
- 郵便番号: 任意

## トラブルシューティング

### エラー: "Firebase Functions not found"
```bash
firebase init functions
```

### エラー: "Stripe is not defined"
HTMLに以下が含まれているか確認：
```html
<script src="https://js.stripe.com/v3/"></script>
```

### エラー: "Price not found"
Stripeダッシュボードで価格IDが正しいか確認

## セキュリティ注意事項

⚠️ **重要**: 
- シークレットキー（`sk_test_...`）は絶対にクライアントサイドのコードに含めない
- Firebase Functions内でのみ使用する
- 本番環境では`sk_live_...`を使用

## サポート

問題が発生した場合は、以下を確認：
1. Firebase Console のログ
2. Stripe Dashboard のログ
3. ブラウザのコンソールエラー