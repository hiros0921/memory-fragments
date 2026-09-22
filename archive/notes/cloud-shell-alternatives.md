# Cloud Shellが使えない場合の代替方法

## 方法1: ローカルでgcloud CLIを使う（推奨）

### 1. gcloud CLIをインストール
```bash
# macOSの場合
brew install google-cloud-sdk

# または公式インストーラー
# https://cloud.google.com/sdk/docs/install
```

### 2. 認証とプロジェクト設定
```bash
gcloud auth login
gcloud config set project memory-fragments
```

### 3. CORSを設定
```bash
# CORSファイルを作成
echo '[{"origin": ["*"],"method": ["GET", "PUT", "POST", "DELETE"],"maxAgeSeconds": 3600}]' > cors.json

# 適用
gsutil cors set cors.json gs://memory-fragments.appspot.com

# 確認
gsutil cors get gs://memory-fragments.appspot.com
```

## 方法2: Firebase CLIを使う

### 1. Firebase CLIをインストール
```bash
npm install -g firebase-tools
```

### 2. ログインとプロジェクト設定
```bash
firebase login
firebase use memory-fragments
```

### 3. storage.rules を作成
```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. cors.json を作成してデプロイ
```json
[{
  "origin": ["*"],
  "method": ["GET", "PUT", "POST", "DELETE"],
  "maxAgeSeconds": 3600
}]
```

## 方法3: 一時的な回避策

### 本番サイトで直接テスト
CORSは https://www.memory-fragments.com では動作するはずなので：

1. テストコードを本番サイトに一時的にデプロイ
2. 本番環境でテストして動作確認
3. 問題が解決したら開発環境のCORS設定を後で修正

### ローカルサーバーを使う
```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx http-server -p 8000

# そして http://localhost:8000 でアクセス
```

## 方法4: Google Cloud Supportに連絡

Cloud Shellが使えない場合：
1. Google Cloud Console の右上「?」マーク
2. 「サポートを受ける」をクリック
3. Cloud Shell の問題を報告

## 最も簡単な解決策

**今すぐ動かしたい場合：**

1. 本番サイト（https://www.memory-fragments.com）で直接テスト
2. そこでは既にCORSが設定されているため動作するはず
3. ローカル開発環境のCORS設定は後日対応

これでCloud Shellを使わずに問題を解決できます！