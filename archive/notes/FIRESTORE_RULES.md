# Firestore セキュリティルール設定ガイド

## 現在のエラーについて

`FirebaseError: Missing or insufficient permissions` エラーが発生している場合、Firestoreのセキュリティルールが正しく設定されていない可能性があります。

## 推奨ルール設定

Firebase Console（https://console.firebase.google.com/）にアクセスして、以下の手順でルールを設定してください：

1. プロジェクトを選択
2. 左メニューから「Firestore Database」を選択
3. 「ルール」タブをクリック
4. 以下のルールをコピーして貼り付け

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザー自身のドキュメントのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // ユーザーのメモリーサブコレクション
      match /memories/{memoryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## ルールの説明

- `request.auth != null`: ユーザーがログインしていることを確認
- `request.auth.uid == userId`: ユーザーが自分のデータのみアクセスできることを保証
- メモリーはユーザーごとのサブコレクションとして保存されます

## Storage ルールも設定

Firebase Storage のルールも設定が必要です：

1. Firebase Console で「Storage」を選択
2. 「ルール」タブをクリック
3. 以下のルールを設定

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // ユーザーの画像フォルダへのアクセス
    match /images/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## テスト環境用の一時的なルール（開発中のみ）

開発中で認証をテストしている場合は、一時的に以下のルールを使用できます：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**警告**: 本番環境では絶対に使用しないでください！

## ルール適用後の確認

1. ルールを公開後、数分待つ
2. ブラウザをリロード
3. 再度ログインして動作確認

## トラブルシューティング

- ルール公開後も権限エラーが出る場合は、ブラウザのキャッシュをクリア
- Firebase Authenticationでユーザーが正しく作成されているか確認
- コンソールでユーザーのUIDが正しく取得できているか確認