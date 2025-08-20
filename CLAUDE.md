# Memory Fragments App - プロジェクト概要

## プロジェクト背景
- 3週間かけて構築した個人の思い出を記録・管理するWebアプリケーション
- Firebase Authentication/Firestore/Storageを使用
- Stripe決済システムを統合（プレミアム機能）
- Three.jsによる3D背景エフェクト

## 現在の問題
- 本番サイト（www.memory-fragments.com）で背景が白く表示される
- デフォルトのテーマカラーをパープルにしたいが反映されない

## 技術スタック
- Frontend: HTML, CSS (Tailwind), JavaScript
- Backend: Firebase (Auth, Firestore, Storage)
- 決済: Stripe
- 3Dグラフィックス: Three.js
- ホスティング: Vercel

## 主要機能
1. ユーザー認証（メール/パスワード）
2. 記憶の保存（タイトル、内容、画像、位置情報、タグ）
3. 検索・フィルター機能
4. エクスポート機能（HTML形式）
5. プレミアム機能（Stripe決済）
6. テーマカスタマイズ機能
7. 3D背景アニメーション

## ディレクトリ構造
- `/js/` - JavaScriptモジュール群
  - `auth-manager.js` - 認証管理
  - `storage-manager.js` - データ保存管理
  - `stripe-payment.js` - 決済処理
  - `export-manager.js` - エクスポート機能
  - その他多数のモジュール
- `/css/` - スタイルシート
- `/functions/` - Firebase Functions

## 重要な設定ファイル
- `firebase.json` - Firebase設定
- `firestore.rules` - Firestoreセキュリティルール
- `storage.rules` - Storageセキュリティルール
- `cors.json` - CORS設定
- `manifest.json` - PWA設定
- `sw.js` - Service Worker

## 最近の作業内容
1. パープルテーマをデフォルトに設定しようとしている
2. 背景色の問題を解決中

## 注意事項
- 本番環境への変更は慎重に行う
- Firebase関連の設定変更時は特に注意
- Stripe決済のテストは必ずテストモードで実施

## デプロイ方法
- Vercelを使用（自動デプロイ設定済み）
- GitHubリポジトリへのpushで自動デプロイ

## 連絡先・参考資料
- 本番サイト: https://www.memory-fragments.com/