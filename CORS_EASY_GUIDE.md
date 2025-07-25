# 🚀 Google Cloud Console CORS設定 - 超簡単ガイド

## たった3ステップで完了！

### ステップ1: Google Cloud Consoleを開く

1. **このリンクをクリック**: [Google Cloud Console](https://console.cloud.google.com/)
2. Googleアカウントでログイン（Firebaseと同じアカウント）
3. 上部のプロジェクト選択で「**memory-fragments**」を選択

### ステップ2: Cloud Shellを開く

1. 画面右上の「**ターミナルアイコン**」をクリック
   - `>_` このような形のアイコンです
   - 「Cloud Shellをアクティブにする」と表示されます

2. 下部に黒い画面（ターミナル）が開きます

### ステップ3: コマンドをコピペして実行

以下のコマンドを**1行ずつ**コピーして貼り付けてEnterを押すだけ：

```bash
# 1. CORSファイルを作成（これをコピペ）
cat > cors.json << 'EOF'
[{
  "origin": ["*"],
  "method": ["GET", "PUT", "POST", "DELETE"],
  "maxAgeSeconds": 3600
}]
EOF
```

Enterを押したら、次のコマンド：

```bash
# 2. CORSを適用（これをコピペ）
gsutil cors set cors.json gs://memory-fragments.appspot.com
```

最後に確認：

```bash
# 3. 設定を確認（これをコピペ）
gsutil cors get gs://memory-fragments.appspot.com
```

## ✅ 完了！

これで設定完了です。以下のようなメッセージが表示されれば成功：

```
[{"maxAgeSeconds": 3600, "method": ["GET", "PUT", "POST", "DELETE"], "origin": ["*"]}]
```

## よくある質問

**Q: 英語が分からなくても大丈夫？**
A: 大丈夫です！コピペするだけです。

**Q: 間違えたらどうなる？**
A: 何度でもやり直せます。壊れることはありません。

**Q: 料金はかかる？**
A: かかりません。無料です。

**Q: Cloud Shellが開かない**
A: ブラウザの広告ブロッカーを一時的にOFFにしてください。

## 設定後のテスト

1. Memory Fragmentsアプリに戻る
2. ブラウザを完全に再読み込み（Cmd+Shift+R）
3. 画像アップロードを試す

## それでも動かない場合

私に教えてください。別の方法を考えます！

---

**所要時間: 3〜5分**
**難易度: ★☆☆☆☆（超簡単）**
**必要なスキル: コピペができること**