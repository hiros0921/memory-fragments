# Firebase Storage 画像アップロード修正ガイド

## 問題の原因

1. **storageBucket URLの間違い**
   - 現在: `memory-fragments.firebasestorage.app`
   - 正しい: `memory-fragments.appspot.com`

2. **インポートの問題**
   - Firebase v9のモジュラーSDKとv8の名前空間APIが混在

3. **CORSエラー**
   - Firebase Storageのクロスオリジンポリシー設定

## 修正手順

### 1. Firebase設定を修正

`js/firebase-config.js`を以下のように修正：

```javascript
// Firebase設定と初期化
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyBqOMyegX7nfUrtVtTSpVNYpiqlBJTAM0k",
    authDomain: "memory-fragments.firebaseapp.com",
    projectId: "memory-fragments",
    storageBucket: "memory-fragments.appspot.com", // ← これを修正
    messagingSenderId: "798156189875",
    appId: "1:798156189875:web:404069566f9fa68a8580c6",
    measurementId: "G-8T2KT0Z9ZE"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// サービスの初期化
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// グローバル変数として設定（既存コードとの互換性のため）
window.firebase = {
    auth: () => auth,
    firestore: () => db,
    storage: () => storage
};
```

### 2. CORSを設定

Firebase CLIで以下を実行：

```bash
# cors.jsonをデプロイ
gsutil cors set cors.json gs://memory-fragments.appspot.com
```

### 3. Storage Rulesを更新

Firebase Console > Storage > Rules で以下を設定：

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
                     request.auth.uid == userId &&
                     request.resource.size < 10 * 1024 * 1024 && // 10MB以下
                     request.resource.contentType.matches('image/.*');
    }
  }
}
```

### 4. デバッグ用のテストコード

```javascript
// テスト用：認証状態を確認
console.log('Auth state:', firebase.auth().currentUser);

// テスト用：画像アップロード
async function testUpload() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('User not logged in');
        return;
    }
    
    // テスト用の小さな画像を作成
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    
    canvas.toBlob(async (blob) => {
        const file = new File([blob], 'test.png', { type: 'image/png' });
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(`images/${user.uid}/test_${Date.now()}.png`);
        
        try {
            const snapshot = await imageRef.put(file);
            const url = await snapshot.ref.getDownloadURL();
            console.log('Upload successful:', url);
        } catch (error) {
            console.error('Upload failed:', error);
        }
    });
}
```

## 即座の対処法

現在のコードを修正するには：

1. `storage-manager.js`の一番最初に以下を追加：

```javascript
// Firebase Storageのエラーハンドリングを改善
window.onerror = function(msg, url, lineNo, columnNo, error) {
    if (msg.includes('storage/unauthorized')) {
        console.error('Storage permission error. Re-authenticating...');
        // 再認証を試みる
        if (window.authManager) {
            window.authManager.refreshToken();
        }
    }
    return false;
};
```

2. アップロード前にユーザー認証を再確認：

```javascript
// アップロード前に認証状態を確認
const currentUser = firebase.auth().currentUser;
if (!currentUser) {
    // 再ログインを促す
    throw new Error('Please login again to upload images');
}

// トークンをリフレッシュ
await currentUser.getIdToken(true);
```

これらの修正で画像アップロードが正常に動作するはずです。