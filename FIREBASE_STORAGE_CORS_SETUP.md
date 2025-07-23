# Firebase Storage CORS設定手順

## 概要
Firebase Storageから画像を読み込む際のCORSエラーを解決するための設定手順です。

## エラー内容
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'https://www.memory-fragments.com' has been blocked by CORS policy
```

## 設定手順

### 1. Google Cloud SDKのインストール（未インストールの場合）

**macOS:**
```bash
brew install google-cloud-sdk
```

**その他のOS:**
https://cloud.google.com/sdk/docs/install を参照

### 2. Google Cloudにログイン
```bash
gcloud auth login
```

### 3. プロジェクトを設定
```bash
gcloud config set project memory-fragments
```

### 4. CORS設定を適用
プロジェクトのルートディレクトリで以下を実行：
```bash
gsutil cors set cors.json gs://memory-fragments.appspot.com
```

### 5. 設定確認
```bash
gsutil cors get gs://memory-fragments.appspot.com
```

## cors.jsonの内容
```json
[
  {
    "origin": ["https://www.memory-fragments.com", "http://localhost:3000", "http://localhost:5000"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"]
  }
]
```

## 注意事項
- 本番環境では `"origin": ["*"]` は使用しないでください（セキュリティリスク）
- 設定反映には数分かかる場合があります
- ブラウザのキャッシュをクリア（Ctrl+Shift+R）して確認してください

## トラブルシューティング
1. 設定後もCORSエラーが出る場合
   - ブラウザのキャッシュを完全にクリア
   - シークレットウィンドウで確認
   - 5-10分待ってから再度確認

2. gsutilコマンドが見つからない場合
   - Google Cloud SDKをインストール
   - または、Firebase CLIからプロジェクトを初期化して設定

## 確認方法
Developer Toolsのネットワークタブで画像リクエストを確認：
- Status: 200 OK
- Response Headers に `Access-Control-Allow-Origin` が含まれていること