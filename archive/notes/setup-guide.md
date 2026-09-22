# Memory Fragments - セットアップガイド

## 🚀 Firebase設定手順

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名を入力（例：memory-fragments）
4. Google Analyticsは任意（推奨：有効）

### 2. Authentication設定

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. サインイン方法タブで以下を有効化：
   - メール/パスワード
   - Google

### 3. Firestore Database設定

1. 左メニューから「Firestore Database」を選択
2. 「データベースの作成」をクリック
3. 「本番環境モード」を選択
4. リージョンを選択（推奨：asia-northeast1）

### 4. セキュリティルールの設定

Firestoreのルールタブで以下を設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみアクセス可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // ユーザーの記憶コレクション
      match /memories/{memoryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 5. Firebase設定の取得

1. プロジェクト設定 → 全般
2. 「アプリを追加」→ Webアプリ
3. アプリ名を入力
4. Firebase SDKの設定をコピー

### 6. プロジェクトへの設定適用

`js/firebase-config.js`を開いて、取得した設定を貼り付け：

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## 💳 Stripe設定（決済システム）

### 1. Stripeアカウント作成
- [Stripe](https://stripe.com/jp)でアカウント作成
- ダッシュボードからAPIキーを取得

### 2. 商品とプランの作成
1. 商品 → 新規作成
2. 商品名：「Memory Fragments Premium」
3. 価格：¥500/月（定期支払い）

### 3. 決済リンクの作成
1. 支払いリンク → 新規作成
2. 商品を選択
3. リンクをコピー

## 🌐 デプロイ方法

### GitHub Pages
```bash
# リポジトリにプッシュ
git add .
git commit -m "Add authentication system"
git push origin main

# GitHub設定でPages有効化
```

### Netlify
1. [Netlify](https://www.netlify.com/)にログイン
2. GitHubリポジトリを接続
3. 自動デプロイ設定

## 🔒 環境変数の管理

本番環境では、Firebaseの設定を環境変数として管理することを推奨：

1. `.env`ファイルを作成（.gitignoreに追加）
2. 環境変数を設定
3. ビルド時に置換

## 📱 動作確認

1. ローカルでテスト
   ```bash
   # HTTPサーバーを起動
   python -m http.server 8000
   # または
   npx http-server
   ```

2. 以下を確認：
   - ユーザー登録・ログイン
   - 無料版の50件制限
   - プレミアムアップグレード促進
   - データのクラウド保存

## 🎯 収益化のポイント

1. **無料版の制限**
   - 50件の保存制限で価値を体感
   - 制限に近づくと自然にアップグレード促進

2. **プレミアム機能**
   - 無制限保存
   - クラウドバックアップ
   - 複数デバイス同期

3. **アップグレードフック**
   - 容量80%で警告
   - 定期的なリマインダー
   - プレミアム機能使用時の案内

## 📞 サポート

問題が発生した場合：
1. Firebaseコンソールでエラーログ確認
2. ブラウザのデベロッパーツールでコンソール確認
3. セキュリティルールの確認

---

これで月額500円のサブスクリプションサービスとして運用開始できます！