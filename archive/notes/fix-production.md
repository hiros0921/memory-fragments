# 本番環境での修正手順

## 成功した要因
1. ✅ CORS設定を `gs://memory-fragments.firebasestorage.app` に適用
2. ✅ すべてのオリジン (`*`) からのアクセスを許可
3. ✅ ローカルサーバー経由でテスト（file:// ではなく http://）

## 本番サイトで確認すべきこと

### 1. Firebase設定の確認
```javascript
// js/firebase-config.js
storageBucket: "memory-fragments.firebasestorage.app"  // ← これが正しい
```

### 2. エラーハンドリングの改善
本番サイトの storage-manager.js に以下の改善を追加：

```javascript
// より詳細なエラーログ
catch (error) {
    console.error('Firebase Storage Error:', {
        code: error.code,
        message: error.message,
        serverResponse: error.serverResponse,
        customData: error.customData
    });
    
    // ユーザーにわかりやすいエラーメッセージ
    if (error.code === 'storage/unauthorized') {
        throw new Error('アップロード権限がありません。ログインしてください。');
    } else if (error.code === 'storage/canceled') {
        throw new Error('アップロードがキャンセルされました。');
    } else if (error.code === 'storage/unknown') {
        throw new Error('ネットワークエラーが発生しました。再度お試しください。');
    }
    throw error;
}
```

### 3. 本番環境でのテスト手順
1. https://www.memory-fragments.com にアクセス
2. ログイン（既存のアカウントを使用）
3. 画像付きの記憶を保存
4. 正常に動作することを確認

## 最終確認事項
- [ ] 本番サイトでログインできる
- [ ] 画像のアップロードが成功する
- [ ] 「記憶を保存」ボタンが正常に動作する
- [ ] 保存した記憶が表示される

## もし本番でも動かない場合
1. ブラウザのキャッシュをクリア
2. シークレット/プライベートウィンドウで試す
3. コンソールのエラーメッセージを確認

## 成功のポイント
- Firebase Storage のバケット名は `firebasestorage.app` ドメインを使用
- CORS設定は Google Cloud Console (gsutil) で行う必要がある
- ローカルテストは http:// 経由で行う（file:// ではダメ）