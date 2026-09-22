# Firebase認証エラーの解決方法

## エラー: "This operation is restricted to administrators only"

このエラーは、Firebaseプロジェクトの認証設定に問題があることを示しています。

## 解決手順

### 1. Firebase Consoleで認証方法を有効化

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. `memory-fragments` プロジェクトを選択
3. 左メニューから「Authentication」をクリック
4. 「Sign-in method」タブをクリック
5. 以下の認証方法を有効にする：
   - **メール/パスワード** - 有効にする
   - **匿名** - 有効にする（オプション）

### 2. テストユーザーを作成

1. Authentication > Users タブ
2. 「ユーザーを追加」をクリック
3. テスト用のメールアドレスとパスワードを入力
   ```
   例：test@example.com / testpass123
   ```

### 3. Firebase Storageの設定確認

1. Firebase Console > Storage
2. 「Rules」タブで以下を確認：

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

3. 「公開」ボタンをクリックして反映

### 4. CORSの設定（Google Cloud Console）

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択
3. Cloud Shellを開く（右上のターミナルアイコン）
4. 以下のコマンドを実行：

```bash
# cors.jsonを作成
cat > cors.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization"]
  }
]
EOF

# CORSを適用
gsutil cors set cors.json gs://memory-fragments.appspot.com
```

### 5. 本番アプリでの確認

1. Memory Fragmentsアプリ（https://www.memory-fragments.com/）を開く
2. ブラウザのキャッシュをクリア（Cmd+Shift+R）
3. 再度ログイン
4. 画像を選択して保存

## デバッグ方法

ブラウザのコンソールで以下を実行：

```javascript
// 現在のユーザーを確認
console.log(firebase.auth().currentUser);

// Storage bucketを確認
console.log(firebase.storage().ref().bucket);

// テストアップロード
async function testStorageAccess() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('ログインしてください');
        return;
    }
    
    try {
        const testRef = firebase.storage().ref(`test/${user.uid}/test.txt`);
        const blob = new Blob(['Hello World'], {type: 'text/plain'});
        await testRef.put(blob);
        console.log('アップロード成功！');
        const url = await testRef.getDownloadURL();
        console.log('URL:', url);
    } catch (error) {
        console.error('エラー:', error);
    }
}

// 実行
testStorageAccess();
```

## それでも解決しない場合

1. Firebaseプロジェクトの請求先アカウントが設定されているか確認
2. Storage の使用量制限に達していないか確認
3. プロジェクトのオーナー権限があるか確認

これらの設定を確認後、再度テストしてください。