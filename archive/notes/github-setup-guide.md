# GitHubへの保存とNetlify公開手順

## 1. GitHubリポジトリ作成

```bash
# プロジェクトフォルダで実行
cd /Users/suwahiroyuki/claude/hirosuwa-simple-blog/hirosuwa-simple-blog
git init
git add .
git commit -m "初回コミット：ダークモダンブログ"
```

## 2. GitHubで新規リポジトリ作成

1. https://github.com/new にアクセス
2. リポジトリ名: `hirosuwa-blog`
3. PublicかPrivateを選択
4. 「Create repository」をクリック

## 3. リモートリポジトリに接続

```bash
git remote add origin https://github.com/YOUR-USERNAME/hirosuwa-blog.git
git branch -M main
git push -u origin main
```

## 4. Netlifyで自動公開（無料）

1. https://www.netlify.com/ にアクセス
2. GitHubでログイン
3. 「New site from Git」をクリック
4. GitHubリポジトリを選択
5. そのままデプロイ

## メリット

✅ **バージョン管理** - 変更履歴が残る
✅ **バックアップ** - GitHubがバックアップに
✅ **自動公開** - pushするだけでサイト更新
✅ **無料** - GitHub + Netlifyは無料
✅ **カスタムドメイン** - lightech.co.jpも使える

## 今後の更新方法

```bash
# 変更後
git add .
git commit -m "記事を追加"
git push

# → 自動的にサイトが更新される！
```

## .gitignoreファイル

```
.DS_Store
node_modules/
.env
```

これで安心してブログ運営できます！