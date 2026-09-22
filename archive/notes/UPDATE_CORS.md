# CORS設定を更新する方法

## 現在の問題
現在のCORS設定は `https://www.memory-fragments.com` のみ許可されています。
これを全てのオリジンから許可するように変更します。

## Google Cloud Shellで実行

### 方法1: 全てのオリジンを許可（開発用）

```bash
# 新しいCORS設定ファイルを作成
cat > cors-updated.json << 'EOF'
[{
  "origin": ["*"],
  "method": ["GET", "PUT", "POST", "DELETE", "HEAD"],
  "maxAgeSeconds": 3600,
  "responseHeader": ["Content-Type", "Authorization"]
}]
EOF

# 適用
gsutil cors set cors-updated.json gs://memory-fragments.appspot.com

# 確認
gsutil cors get gs://memory-fragments.appspot.com
```

### 方法2: 特定のオリジンを追加（より安全）

```bash
# 複数のオリジンを許可
cat > cors-multi.json << 'EOF'
[{
  "origin": [
    "https://www.memory-fragments.com",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "file://*"
  ],
  "method": ["GET", "PUT", "POST", "DELETE", "HEAD"],
  "maxAgeSeconds": 3600,
  "responseHeader": ["Content-Type", "Authorization"]
}]
EOF

# 適用
gsutil cors set cors-multi.json gs://memory-fragments.appspot.com

# 確認
gsutil cors get gs://memory-fragments.appspot.com
```

## どちらを選ぶべき？

- **開発中なら方法1**（`"origin": ["*"]`）が簡単
- **本番環境なら方法2**で必要なオリジンだけ許可

## 設定後の確認

1. ブラウザのキャッシュをクリア
2. テストページを再読み込み
3. 画像アップロードを実行

これで必ず動くはずです！