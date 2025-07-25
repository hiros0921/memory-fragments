# Memory Fragments ログイン手順

## 現在の状況
- `hsuwa36@gmail.com` は既に登録済み
- パスワードが不明または間違っている

## 解決方法

### 方法1: パスワードリセット（推奨）

1. **test-upload.htmlで「パスワードリセット」ボタンをクリック**
2. `hsuwa36@gmail.com` を入力
3. メールが届くのを待つ
4. メール内のリンクから新しいパスワードを設定
5. 新しいパスワードでログイン

### 方法2: Firebase Consoleで確認

1. **Firebase Console → Authentication → Users**
   - 現在のURLから既にここにいます
   
2. **ユーザー一覧で`hsuwa36@gmail.com`を探す**
   - 右側の「⋮」メニューから「パスワードをリセット」

### 方法3: 別のテストアカウントを作成

```
メール: test2025@test.com
パスワード: test123456
```

test-upload.htmlで：
1. 「新規登録」ボタン
2. 上記の情報で登録
3. 同じ情報でログイン

## ログイン成功後のテスト手順

1. **認証状態確認**
   - 「認証状態確認」ボタンでログイン状態を確認

2. **画像アップロードテスト**
   - 「テスト画像生成＆アップロード」ボタン
   - 成功すれば画像URLが表示される

3. **本番サイトでテスト**
   - https://www.memory-fragments.com/
   - 同じアカウントでログイン
   - 画像を選択して「記憶を保存」

## Firebase Consoleでの追加確認

### Firestore Rules（重要！）

1. Firestore Database → Rules
2. 以下のルールに更新：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 一時的に全アクセス許可（開発用）
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. 「公開」ボタンをクリック

### Storage Rules

1. Storage → Rules
2. 以下を確認：

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## トラブルシューティング

### エラー: "invalid-login-credentials"
→ パスワードが間違っています。パスワードリセットを実行

### エラー: "permission-denied"
→ Firestoreルールを上記の通り更新

### エラー: "storage/unauthorized"
→ ログイン状態を確認、またはStorageルールを確認

これで必ず動作するはずです！