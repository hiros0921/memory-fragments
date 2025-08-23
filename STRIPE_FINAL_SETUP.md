# 🎯 Stripe決済機能 最終設定ガイド

## 📊 現在の実装状況

### ✅ すでに実装済み
1. **Stripeライブラリ** - index.htmlに組み込み済み
2. **テスト用公開キー** - 設定済み（pk_test_51RltmW...）
3. **決済処理のコード** - stripe-payment.js実装済み
4. **Firebase Functions** - Checkout Session作成機能実装済み
5. **無料プラン制限** - 50件まで（実装済み）

### ❌ 未設定（あと少し！）
1. **Stripe商品の作成**
2. **価格IDの設定**
3. **Firebase Functions環境変数**
4. **Webhookエンドポイント**

---

## 🚀 設定手順（30分で完了）

### ステップ1: Stripeダッシュボードで商品作成（5分）

1. [Stripe Dashboard](https://dashboard.stripe.com/test/products)にログイン
2. 「商品」→「新しい商品を追加」をクリック
3. 以下の情報を入力：
   ```
   商品名: Memory Fragments プレミアムプラン
   説明: 無制限記憶保存、AI分析、複数画像対応
   価格: ¥500（定期的）
   請求期間: 月次
   ```
4. 作成後、**価格ID**（price_xxxxx形式）をコピー

### ステップ2: コードに価格IDを設定（2分）

```javascript
// js/stripe-payment.js の7行目を更新
this.priceId = 'price_ここに価格IDを貼り付け';
```

### ステップ3: Firebase Functions設定（10分）

```bash
# ターミナルで実行
cd /Users/suwahiroyuki/claude/memory-fragments-app

# Stripe秘密鍵を設定（Stripeダッシュボードから取得）
firebase functions:config:set stripe.secret_key="sk_test_xxxxxx"

# Webhook署名シークレットを設定（後で取得）
firebase functions:config:set stripe.webhook_secret="whsec_xxxxxx"

# Firebase Functionsをデプロイ
firebase deploy --only functions
```

### ステップ4: Webhookエンドポイント設定（5分）

1. [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)にアクセス
2. 「エンドポイントを追加」をクリック
3. エンドポイントURL:
   ```
   https://us-central1-memory-fragments.cloudfunctions.net/stripeWebhook
   ```
4. リッスンするイベント:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.deleted`
5. 署名シークレットをコピーして、Firebase設定に追加

### ステップ5: 動作確認（5分）

1. アプリにアクセス
2. 50件以上記憶を保存しようとする
3. アップグレードモーダルが表示される
4. 「プレミアムにアップグレード」をクリック
5. Stripeの決済ページにリダイレクトされる

---

## 💳 テストカード番号

```
カード番号: 4242 4242 4242 4242
有効期限: 任意の将来の日付
CVC: 任意の3桁
郵便番号: 任意の5桁
```

---

## 🎨 宣伝用コピー

### 無料プランの魅力を強調

```
【完全無料で始められる！】
✅ 登録無料
✅ 50件まで記憶を保存
✅ 基本的なAI感情分析
✅ カレンダービュー
✅ クレジットカード不要

もっと使いたくなったら...
プレミアムプラン（月額500円）で無制限に！
```

### X（Twitter）投稿例

```
思い出管理アプリ「Memory Fragments」

無料で始められます！
・50件まで保存OK
・AI感情分析付き
・写真も文章も一緒に

使ってみて気に入ったら
月額500円で無制限に📝

まずは無料でお試し→
memory-fragments.com

#無料アプリ #日記
```

### プレミアムの価値訴求

```
月額500円 = 1日あたり約17円

コーヒー1杯より安い値段で
あなたの一生の思い出を
永遠に残せます☕️

【プレミアム限定機能】
📸 複数画像（最大10枚）
🤖 高度なAI分析
📅 カレンダービュー
🔔 記念日リマインダー
☁️ 自動バックアップ
```

---

## 🔍 よくある質問

### Q: 無料プランで十分使える？
A: はい！50件まで保存でき、基本機能は全て使えます。日記を始めてみたい方には十分です。

### Q: いつプレミアムにすべき？
A: 50件に近づいたら、または複数画像やリマインダー機能が欲しくなったら。

### Q: 解約は簡単？
A: はい、いつでもワンクリックで解約可能。日割り返金はありませんが、期間終了まで使えます。

---

## 📈 収益シミュレーション

| ユーザー数 | 有料転換率 | 有料ユーザー | 月額収益 |
|-----------|-----------|------------|---------|
| 100人 | 10% | 10人 | ¥5,000 |
| 500人 | 10% | 50人 | ¥25,000 |
| 1000人 | 15% | 150人 | ¥75,000 |
| 5000人 | 20% | 1000人 | ¥500,000 |

---

## ✅ チェックリスト

- [ ] Stripeアカウント作成
- [ ] 商品・価格作成
- [ ] 価格IDをコードに設定
- [ ] Firebase Functions環境変数設定
- [ ] Functionsデプロイ
- [ ] Webhookエンドポイント設定
- [ ] テスト決済実行
- [ ] 本番環境切り替え（準備完了後）

---

## 🆘 トラブルシューティング

### エラー: "Stripe is not configured"
→ Firebase Functions環境変数が設定されていない

### エラー: "価格が見つかりません"
→ 価格IDが正しくない、またはテスト/本番の不一致

### 決済ページにリダイレクトされない
→ ブラウザのポップアップブロッカーを確認

---

## 🎉 完了後の宣伝開始！

設定が完了したら、以下の順番で宣伝：

1. **友人・家族に使ってもらう**（無料）
2. **SNSで「無料で使える」を強調**
3. **使用感レビューを集める**
4. **noteで詳細記事を書く**
5. **有料転換率を測定・改善**

頑張ってください！🚀