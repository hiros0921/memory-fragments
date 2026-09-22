# 軽量でSEO/LLMO最強のブログ構築ガイド

## なぜAstroが最適か？

1. **超軽量** - JavaScriptを最小限に
2. **SEO最強** - 静的HTML生成
3. **LLMO対応** - 構造化データ自動生成
4. **書きやすい** - Markdownで記事作成

## セットアップ手順

```bash
# 1. Astroプロジェクト作成
npm create astro@latest my-blog -- --template blog

# 2. 依存関係インストール
cd my-blog
npm install

# 3. 開発サーバー起動
npm run dev
```

## ブログ記事の書き方

`src/content/blog/`に`.md`ファイルを作成：

```markdown
---
title: '記事タイトル'
description: 'SEO用の説明文'
pubDate: '2024-01-20'
heroImage: '/blog-placeholder-1.jpg'
---

# 見出し1

本文をMarkdownで書きます。

## 見出し2

- リスト項目
- とても簡単
```

## SEO/LLMO最適化の設定

`src/layouts/BlogPost.astro`に追加：

```astro
---
// 構造化データ（LLMO対応）
const structuredData = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": title,
  "description": description,
  "datePublished": pubDate,
  "author": {
    "@type": "Person",
    "name": "Hiro Suwa"
  },
  "image": heroImage
};
---

<script type="application/ld+json" set:html={JSON.stringify(structuredData)} />
```

## 最小限の機能だけ

- ✅ Markdown記事
- ✅ 自動的にHTML生成
- ✅ SEOメタタグ
- ✅ RSS/サイトマップ
- ❌ 複雑な機能なし

## デプロイ（無料）

```bash
# Vercelでデプロイ
npm i -g vercel
vercel

# またはNetlifyでデプロイ
# GitHubにpushするだけ
```

## 記事の追加は超簡単

1. `src/content/blog/`にMarkdownファイル作成
2. frontmatterにタイトルと日付を書く
3. 本文を書く
4. 保存すると自動的にサイトに反映

これ以上シンプルにはできません！