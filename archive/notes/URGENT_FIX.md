# 🚨 緊急：本番環境の修正手順

## 問題
本番サイトのファイルがまだ古い設定（appspot.com）を使っています。
正しい設定（firebasestorage.app）に変更する必要があります。

## 修正が必要なファイル

### 1. js/firebase-config.js
```javascript
// 現在（間違い）
storageBucket: "memory-fragments.appspot.com",

// 修正後（正しい）
storageBucket: "memory-fragments.firebasestorage.app",
```

### 2. js/cloud-sync-manager.js 
storage.ref() の部分も確認が必要

## デプロイ方法

### オプション1: GitHubにプッシュ（Vercelを使用している場合）
```bash
cd /Users/suwahiroyuki/claude/memory-fragments-app
git add .
git commit -m "Fix Firebase Storage bucket URL"
git push origin main
```

### オプション2: 手動でファイルをアップロード
1. FTPクライアントまたはホスティングサービスの管理画面を使用
2. js/firebase-config.js をアップロード
3. キャッシュをクリア

### オプション3: Vercel CLIを使用
```bash
vercel --prod
```

## 確認方法
1. 本番サイトのソースを確認
2. ブラウザの開発者ツールで Network タブを開く
3. firebase-config.js が新しいバージョンか確認
4. storageBucket が "memory-fragments.firebasestorage.app" になっているか確認

## 重要な注意点
- **ブラウザキャッシュ**: Ctrl+Shift+R で完全リロード
- **CDNキャッシュ**: 数分待つ必要がある場合がある
- **Service Worker**: 更新に時間がかかる場合がある

## もしまだ動かない場合
Firebase Consoleで直接確認：
1. https://console.firebase.google.com/
2. プロジェクト: memory-fragments
3. Storage → Rules で権限を確認

現在のルール（推奨）：
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```