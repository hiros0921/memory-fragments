#!/bin/bash

# Firebase Storage CORS設定スクリプト

echo "Firebase Storage CORSを設定します..."

# 1. Google Cloud SDKがインストールされているか確認
if ! command -v gcloud &> /dev/null; then
    echo "Google Cloud SDKがインストールされていません"
    echo "インストール: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# 2. プロジェクトIDを設定
PROJECT_ID="memory-fragments"

# 3. 現在のプロジェクトを設定
gcloud config set project $PROJECT_ID

# 4. cors.jsonファイルを作成
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "User-Agent",
      "x-goog-resumable",
      "x-goog-api-version",
      "x-goog-api-client",
      "x-firebase-auth-token",
      "x-firebase-storage-version",
      "x-goog-upload-content-type",
      "x-goog-upload-protocol"
    ]
  }
]
EOF

echo "cors.jsonを作成しました"

# 5. CORSを適用
echo "CORSを適用中..."
gsutil cors set cors.json gs://$PROJECT_ID.appspot.com

# 6. 確認
echo "現在のCORS設定:"
gsutil cors get gs://$PROJECT_ID.appspot.com

echo "完了！"