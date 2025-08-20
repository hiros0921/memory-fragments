# Firebase セキュリティルールのデプロイガイド

## 🚨 重要：セキュリティルールの更新が必要です

Firebaseから「テストモードの期限切れ」の通知を受け取った場合、以下の手順でセキュリティルールを更新してください。

## 📋 前提条件

1. Firebase CLIがインストールされていること
2. Firebaseプロジェクトにログイン済みであること

## 🔧 セットアップ（初回のみ）

```bash
# Firebase CLIのインストール（未インストールの場合）
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# プロジェクトの初期化（すでに完了している場合はスキップ）
firebase init
```

## 📝 セキュリティルールの更新手順

### 1. 現在のルールを確認

このリポジトリには更新済みのセキュリティルールが含まれています：
- `firestore.rules` - Firestoreデータベースのルール
- `storage.rules` - Cloud Storageのルール

### 2. ルールをデプロイ

```bash
# プロジェクトのルートディレクトリで実行
cd /Users/suwahiroyuki/claude/memory-fragments-app

# Firestoreルールのみデプロイ
firebase deploy --only firestore:rules

# Storageルールのみデプロイ  
firebase deploy --only storage:rules

# 両方同時にデプロイ
firebase deploy --only firestore:rules,storage:rules
```

### 3. デプロイの確認

デプロイが成功したら、以下のメッセージが表示されます：
```
✔  Deploy complete!
```

## 🔒 セキュリティルールの内容

### Firestoreルール
- ✅ ユーザーは自分のデータのみアクセス可能
- ✅ 記憶（memories）は作成者のみ編集・削除可能
- ✅ リマインダーは本人のみアクセス可能
- ✅ サブスクリプション情報は読み取りのみ（書き込みはサーバーサイド）
- ❌ テストモード（全アクセス許可）は完全に削除

### Storageルール
- ✅ 画像は認証されたユーザーのみアップロード可能
- ✅ ファイルサイズ制限（10MB以下）
- ✅ 画像ファイルのみ許可
- ✅ ユーザーは自分のフォルダのみ書き込み可能
- ❌ 無制限アクセスは削除

## 🔍 動作確認

1. アプリにログインして、記憶の保存・読み込みができることを確認
2. 画像のアップロードが正常に動作することを確認
3. 他のユーザーのデータにアクセスできないことを確認

## ⚠️ トラブルシューティング

### エラー: Permission denied
- ルールが正しくデプロイされていない可能性があります
- `firebase deploy --only firestore:rules` を再実行してください

### エラー: Firebase CLI not found
```bash
npm install -g firebase-tools
```

### エラー: Not in a Firebase project directory
```bash
firebase init
# Firestore と Storage を選択
# 既存のルールファイルを使用
```

## 📞 サポート

問題が解決しない場合は、以下を確認してください：
1. [Firebase Console](https://console.firebase.google.com) でルールが更新されているか
2. ブラウザのコンソールでエラーメッセージを確認
3. Firebase Consoleの「Rules Playground」でルールをテスト

## 🎯 今後の対応

1. **即座に実行**: セキュリティルールをデプロイ
2. **24時間以内**: アプリの動作確認
3. **定期的に**: セキュリティルールの見直しと更新