# Memory Fragments 修正まとめ

## 現在の問題と解決策

### 1. ログイン認証エラー (auth/invalid-login-credentials)

**原因**: メールアドレスとパスワードが間違っているか、ユーザーが存在しない

**解決方法**:
1. テストページで「新規登録」ボタンをクリック
2. 新しいメールアドレスとパスワード（6文字以上）で登録
3. その後、同じ情報でログイン

### 2. Firestore権限エラー

**原因**: Firestoreのセキュリティルールが厳しすぎる

**即座の解決方法**:
Firebase Console → Firestore Database → Rules で以下を設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 開発中のみ：全アクセス許可
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**本番用の解決方法** (セキュア):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /memories/{memoryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 3. Storage URLの不一致

**確認済み**: firebase-config.jsは正しく設定されています
- storageBucket: "memory-fragments.appspot.com" ✅

## 今すぐできる対処法

### Step 1: テストページで新規ユーザー作成
```
1. test-upload.htmlをリロード
2. 「新規登録」ボタンをクリック
3. テスト用メールアドレス（例: test@test.com）
4. パスワード（例: test123）
5. 登録成功を確認
```

### Step 2: Firebase ConsoleでFirestoreルールを更新
```
1. https://console.firebase.google.com/
2. memory-fragmentsプロジェクト選択
3. Firestore Database → Rules
4. 上記の「開発中のみ」ルールをコピペ
5. 「公開」ボタンをクリック
```

### Step 3: 画像アップロードテスト
```
1. test-upload.htmlで「テスト画像生成＆アップロード」
2. 成功したら本番サイトでも試す
```

## 本番サイト（memory-fragments.com）での確認

1. **ブラウザキャッシュをクリア**
   - Chrome: Cmd+Shift+Delete → キャッシュされた画像とファイル
   
2. **LocalStorageをクリア**
   - Console: `localStorage.clear()`
   
3. **再ログイン**
   - 新規登録したアカウントでログイン
   
4. **画像アップロードテスト**
   - 小さい画像（1MB以下）から試す

## デバッグコマンド

ブラウザのコンソールで実行：

```javascript
// 現在の設定を確認
console.log('Storage Bucket:', firebase.app().options.storageBucket);
console.log('Current User:', firebase.auth().currentUser);

// Firestoreテスト
async function testFirestore() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('ログインしてください');
        return;
    }
    
    try {
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .set({ test: true }, { merge: true });
        console.log('Firestore書き込み成功！');
    } catch (error) {
        console.error('Firestoreエラー:', error);
    }
}

testFirestore();
```

これらの手順を順番に実行してください。