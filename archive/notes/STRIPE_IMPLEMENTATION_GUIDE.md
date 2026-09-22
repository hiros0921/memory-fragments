# Stripe決済実装ガイド - Memory Fragments

## 🚀 クイックスタート（最短実装）

### 1. Stripeアカウント設定（15分）

```bash
# 1. Stripeアカウント作成
# https://dashboard.stripe.com/register

# 2. APIキーを取得
# Dashboard → Developers → API keys
# - Publishable key (公開可能)
# - Secret key (サーバー側のみ)
```

### 2. Firebase Functions設定（30分）

```bash
# Firebase Functionsをセットアップ
cd memory-fragments-app
firebase init functions

# Stripe SDKをインストール
cd functions
npm install stripe
```

### 3. 決済エンドポイント作成

`functions/index.js`:
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret);

admin.initializeApp();

// Checkout Session作成
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    // ユーザー認証チェック
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'ログインが必要です');
    }

    const userId = context.auth.uid;
    
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: 'price_xxxxx', // Stripeダッシュボードで作成した価格ID
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${functions.config().app.url}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${functions.config().app.url}/cancel`,
            metadata: {
                userId: userId
            }
        });

        return { sessionId: session.id };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Webhook処理（決済完了時）
exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            functions.config().stripe.webhook_secret
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 決済成功時の処理
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.userId;

        // ユーザーをプレミアムプランに更新
        await admin.firestore().collection('users').doc(userId).update({
            plan: 'premium',
            subscriptionId: session.subscription,
            subscribedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`User ${userId} upgraded to premium`);
    }

    res.status(200).send('OK');
});
```

### 4. フロントエンド実装

`js/stripe-payment.js`:
```javascript
class StripePayment {
    constructor() {
        // Publishable keyを設定（公開しても安全）
        this.stripe = Stripe('pk_test_xxxxx');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 既存のアップグレードボタンに決済機能を追加
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.upgrade-to-premium')) {
                e.preventDefault();
                await this.startCheckout();
            }
        });
    }

    async startCheckout() {
        try {
            // ローディング表示
            this.showLoading('決済ページを準備中...');

            // Cloud Functionを呼び出し
            const createCheckoutSession = firebase.functions().httpsCallable('createCheckoutSession');
            const { data } = await createCheckoutSession();

            // Stripeの決済ページへリダイレクト
            const result = await this.stripe.redirectToCheckout({
                sessionId: data.sessionId
            });

            if (result.error) {
                this.showError(result.error.message);
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showError('決済の開始に失敗しました');
        }
    }

    showLoading(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification show';
    }

    showError(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification show error';
    }
}

// 初期化
window.stripePayment = new StripePayment();
```

### 5. premium-features.jsを更新

```javascript
// startUpgrade メソッドを更新
startUpgrade() {
    // Stripe決済を開始
    if (window.stripePayment) {
        window.stripePayment.startCheckout();
    } else {
        console.error('Stripe決済が初期化されていません');
    }
}
```

### 6. 環境変数設定

```bash
# Firebase Functions設定
firebase functions:config:set stripe.secret="sk_test_xxxxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxxxx"
firebase functions:config:set app.url="https://memory-fragments-app.vercel.app"

# デプロイ
firebase deploy --only functions
```

## 💰 料金プラン設定

Stripeダッシュボードで商品を作成:

1. **商品作成**
   - 名前: "Memory Fragments プレミアムプラン"
   - 説明: "無制限の記憶保存、大容量画像対応"

2. **価格設定**
   - 料金: 480円/月
   - 請求期間: 月次
   - 無料トライアル: 7日間

## 🎯 実装チェックリスト

- [ ] Stripeアカウント作成
- [ ] Firebase Functions設定
- [ ] Checkout Session作成関数
- [ ] Webhook処理実装
- [ ] フロントエンド統合
- [ ] テスト決済実行
- [ ] 本番環境へデプロイ

## 📱 スマホ最適化

Apple Pay/Google Pay対応:
```javascript
payment_method_types: ['card', 'apple_pay', 'google_pay']
```

## 🧪 テスト用カード番号

- 成功: `4242 4242 4242 4242`
- 失敗: `4000 0000 0000 0002`
- 要認証: `4000 0025 0000 3155`

## 📊 実装後の確認

1. **決済フロー**
   - 無料ユーザーがアップグレードボタンをクリック
   - Stripe決済ページへ遷移
   - カード情報入力（またはApple Pay/Google Pay）
   - 決済完了後、自動的にプレミアムプランへ

2. **サブスクリプション管理**
   - 月次自動更新
   - ユーザーはいつでも解約可能
   - 解約後も期間終了まで利用可能

これで最小限の実装が完了です！週末で十分実装可能な内容です。