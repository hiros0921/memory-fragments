# Memory Fragments

感情とともに日々を記録し、後から振り返る日記アプリ。子供や自分の成長の記録に使う。

**https://www.memory-fragments.com**

50件まで無料で使え、51件目からは月額制に移行する。決済は Stripe、認証は Firebase、
オフライン時の保存には IndexedDB を使っている。

---

## できること

| | |
|---|---|
| 記録 | タイトル・本文・感情・写真（複数枚）・場所を1件として保存する |
| 検索 | 全文検索と、感情や期間による絞り込み |
| 振り返り | カレンダー表示。過去の同じ日を後から見返す |
| 分析 | 記録された感情の傾向を集計する |
| 通知 | 記録を促すリマインダー |
| 書き出し | 記録の一括エクスポート |
| 同期 | ログインすると複数端末で同じ記録を見られる |
| 課金 | 50件を超えると月額プランへ。Stripe Checkout で決済する |

## 構成

```
index.html / app.html      画面
js/app/                    新しく整理した層（services / config）
  services/                memory-repository, memory-service,
                           image-service, location-service, premium-service
js/                        機能ごとのモジュール（認証・同期・検索・分析ほか）
css/                       スタイル
functions/                 Firebase Cloud Functions
  index.js                 createCheckoutSession / stripeWebhook
```

**サーバー側は Firebase Cloud Functions の2つの関数だけ**で成り立っている。

- `createCheckoutSession` — Stripe の決済画面を作る（呼び出し可能関数）
- `stripeWebhook` — 決済完了の通知を受けて、課金状態を反映する（HTTPS関数）

Stripe の秘密鍵はクライアント側に置かず、関数の環境変数から読む。

## 保存の仕組み

記録は端末内の **IndexedDB** に保存する。当初は localStorage を使っていたが、
写真を複数枚保存すると容量制限（5MB前後）に達して `QuotaExceededError` で
書き込みが失敗したため、IndexedDB へ移行した。

ログインしている場合は Firestore と同期し、複数端末で同じ記録を扱える。

## 技術

```
フロントエンド   HTML / CSS / JavaScript（フレームワークなし）
認証             Firebase Authentication
データベース      Firestore ＋ IndexedDB（オフライン保存）
決済             Stripe Checkout ＋ Webhook
サーバー         Firebase Cloud Functions
配信             独自ドメイン（www.memory-fragments.com）
```

## 開発の経緯について

このリポジトリには、開発中に書いた作業メモ（`STRIPE_SETUP.md`、`FIX_SUMMARY.md`、
`URGENT_FIX.md` など）と、実装を試行した際の複数版のファイル
（`storage-manager*.js` が4種類など）がそのまま残っている。整理の途上にある。

---

株式会社LIGHTECH　諏訪裕之
