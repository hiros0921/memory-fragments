# GitHub Portfolio Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memory Fragments を、旧版を安全に保存したまま、説明・画面例・検証結果が短時間で伝わる GitHub ポートフォリオへ整える。

**Architecture:** 現行の本番ファイルは変更せず、未使用資産を `archive/` に隔離する。README と画面画像をポートフォリオの入口にし、リポジトリ構成・説明・CI の整合性を Node.js の回帰テストで固定する。

**Tech Stack:** HTML / CSS / JavaScript、Node.js test runner、Firebase Emulator、GitHub Actions、Vercel static allowlist build

**Spec:** `docs/superpowers/specs/2026-09-22-github-portfolio-polish-design.md`

## Global Constraints

- 既存ファイルを削除しない。旧版は `archive/` へ移動する。
- `index.html` と現行サービス層の挙動を変更しない。
- スクリーンショットには架空データだけを使用する。
- README は実装済み、検証済み、制約・未対応を区別する。
- 現在は新規課金を受け付けていないことを明記する。
- 公開ビルドへ `archive/`、`docs/`、`.github/` を含めない。
- 既存の全自動テストを維持する。

## Review Focus

- アーカイブ移動後も、現行 `index.html` が参照する全ローカル資産が元の場所に残ること。
- 過去の Stripe / Cloud Functions 実装を「現在稼働中」と誤認させないこと。
- README の画面画像に個人データが含まれないこと。
- `npm ci` だけで Firebase Emulator を使うテストが再現できること。
- GitHub Actions とローカルの Node.js / Java 条件が一致すること。

---

### Task 1: 旧版ファイルを削除せずアーカイブへ分離する

**Files:**
- Create: `tests/repository-presentation.test.cjs`
- Create: `archive/README.md`
- Move: 旧画面・試験ページ → `archive/legacy-app/`
- Move: 未使用 JavaScript/CSS → `archive/legacy-app/js/`, `archive/legacy-app/css/`
- Move: 過去の手順・障害対応メモ → `archive/notes/`
- Move: `functions/` → `archive/payment-reference/functions/`
- Move: 未使用設定 → `archive/config/`
- Move: `hirosuwa-blog`, `hirosuwa-simple-blog-repo` → `archive/external-references/`
- Modify: `docs/portfolio-no-checkout.md`
- Modify: `tests/static-build.test.cjs`

**Interfaces:**
- Consumes: `scripts/build-static.cjs` の公開資産許可リスト
- Produces: `archive/` の分類、後続READMEから参照できる `archive/README.md`

- [ ] **Step 1: リポジトリ構成の失敗テストを書く**

`tests/repository-presentation.test.cjs` に次を追加する。

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('legacy artifacts are preserved under a documented archive', () => {
  const moved = [
    ['index-old.html', 'archive/legacy-app/index-old.html'],
    ['test-upload.html', 'archive/legacy-app/test-upload.html'],
    ['js/storage-manager.js', 'archive/legacy-app/js/storage-manager.js'],
    ['STRIPE_SETUP.md', 'archive/notes/STRIPE_SETUP.md'],
    ['functions/index.js', 'archive/payment-reference/functions/index.js'],
    ['vite.config.js', 'archive/config/vite.config.js']
  ];
  for (const [oldPath, archivedPath] of moved) {
    assert.equal(fs.existsSync(oldPath), false, `${oldPath} must leave the active root`);
    assert.equal(fs.existsSync(archivedPath), true, `${archivedPath} must be preserved`);
  }
  const manifest = fs.readFileSync('archive/README.md', 'utf8');
  assert.match(manifest, /本番では使用していません/);
  assert.match(manifest, /削除せず保存/);
});
```

`tests/static-build.test.cjs` の非公開パスに `archive`、`docs`、`.github` を追加する。

- [ ] **Step 2: 失敗を確認する**

Run: `node --test tests/repository-presentation.test.cjs tests/static-build.test.cjs`

Expected: `index-old.html must leave the active root` で FAIL。

- [ ] **Step 3: 旧版資産を用途別に移動する**

次の分類で `git mv` する。

```text
archive/legacy-app/
  3d.html, app.html, auth-test.html, base64-solution.html, clear-cache.html,
  cloudinary-solution.html, dark-blog-template.html, force-sw-update.html,
  index-3d-backup.html, index-3d.html, index-backup.html, index-modern.html,
  index-old.html, index-ultimate.html, landing.html, login-test.html,
  memory-app-fixed.html, minimal-blog-example.html, new.html, quick-fix.html,
  simple-working-app.html, test-final-solution.html, test-upload-final.html,
  test-upload-v2.html, test-upload.html, alternative-solution.js,
  fix-authmanager.js, debug_code_snippets.txt, manifest.json, start-server.sh

archive/legacy-app/js/
  advanced-search.js, ai-emotion-pro.js, auth-manager.js, auth-ui.js,
  cloud-sync-manager.js, collaboration-manager.js, collaboration-ui.js,
  export-button-fix.js, export-manager.js, firebase-config.js,
  indexed-db-storage.js, local-image-storage.js, premium-features.js,
  storage-manager-browser.js, storage-manager-fixed.js,
  storage-manager-ultimate.js, storage-manager.js, stripe-payment.js,
  upgrade-hooks.js

archive/legacy-app/css/
  auth-styles.css, premium-features.css

archive/notes/
  CORS_EASY_GUIDE.md, FIREBASE_AUTH_FIX.md, FIREBASE_DEPLOY_GUIDE.md,
  FIREBASE_STORAGE_CORS_SETUP.md, FIREBASE_STORAGE_FIX.md, FIRESTORE_RULES.md,
  FIX_SUMMARY.md, LOGIN_INSTRUCTIONS.md, PAYMENT_SOLUTIONS_COMPARISON.md,
  PHOTO_PRIVACY_STATUS.md, STRIPE_APPROVAL_GUIDE.md, STRIPE_FINAL_SETUP.md,
  STRIPE_IMPLEMENTATION_GUIDE.md, STRIPE_SETUP.md, SUCCESS_STORY.md,
  UPDATE_CORS.md, URGENT_FIX.md, cloud-shell-alternatives.md,
  fix-production.md, github-setup-guide.md, launch-checklist.md,
  mobile-features.md, production-fix.md, setup-guide.md,
  simple-astro-setup.md

archive/config/
  .netlify/netlify.toml, CORS_FIX_COMMANDS.sh, cors.json,
  update-cors-headers.json, vite.config.js

archive/payment-reference/functions/
  現在の functions/ 一式

archive/external-references/
  hirosuwa-blog, hirosuwa-simple-blog-repo
```

`archive/README.md` には分類、保存理由、本番未使用、復元時の注意を記載する。`docs/portfolio-no-checkout.md` の旧 `functions/index.js` 参照を新しい保存先へ直す。

- [ ] **Step 4: 構成テストを通す**

Run: `node --test tests/repository-presentation.test.cjs tests/static-build.test.cjs`

Expected: PASS。

- [ ] **Step 5: 現行画面の参照先が残っていることを確認する**

Run: `node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');for(const m of h.matchAll(/src=\"\/(js\/[^\"?]+)/g)){if(!fs.existsSync(m[1]))throw Error(m[1])}console.log('active assets present')"`

Expected: `active assets present`。

- [ ] **Step 6: コミットする**

```bash
git add -A
git commit -m "chore: archive legacy portfolio artifacts"
```

### Task 2: 架空データだけの画面例を保存する

**Files:**
- Create: `docs/images/public-landing-desktop.png`
- Create: `docs/images/public-demo-mobile.png`
- Modify: `tests/repository-presentation.test.cjs`

**Interfaces:**
- Consumes: `https://www.memory-fragments.com/` と `https://www.memory-fragments.com/?demo=true`
- Produces: README が参照する2枚のPNG画像

- [ ] **Step 1: 画像要件の失敗テストを書く**

```js
test('portfolio screenshots are valid non-empty PNG files', () => {
  for (const image of [
    'docs/images/public-landing-desktop.png',
    'docs/images/public-demo-mobile.png'
  ]) {
    const data = fs.readFileSync(image);
    assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(data.length > 20_000, `${image} must contain a readable screenshot`);
  }
});
```

- [ ] **Step 2: 画像が未作成で失敗することを確認する**

Run: `node --test tests/repository-presentation.test.cjs`

Expected: `ENOENT` で FAIL。

- [ ] **Step 3: 本番画面を取得する**

トップページをPC幅、`?demo=true` をスマートフォン幅で開く。デモはログインせず、架空データである表示を確認してからPNGを保存する。画像にブラウザのアカウント情報、メールアドレス、個人の日記が含まれていないことを目視確認する。

- [ ] **Step 4: 画像テストを通す**

Run: `node --test tests/repository-presentation.test.cjs`

Expected: PASS。

- [ ] **Step 5: コミットする**

```bash
git add docs/images tests/repository-presentation.test.cjs
git commit -m "docs: add public demo screenshots"
```

### Task 3: README を実動作と改善実績に合わせる

**Files:**
- Modify: `README.md`
- Modify: `tests/repository-presentation.test.cjs`

**Interfaces:**
- Consumes: Task 1 の `archive/README.md`、Task 2 の画面画像、既存の `docs/*.md`
- Produces: GitHub のポートフォリオ入口

- [ ] **Step 1: README整合性の失敗テストを書く**

```js
test('README describes the current portfolio truthfully', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  assert.match(readme, /https:\/\/www\.memory-fragments\.com\/\?demo=true/);
  assert.match(readme, /実装済み/);
  assert.match(readme, /自動テストで検証済み/);
  assert.match(readme, /制約・未対応/);
  assert.match(readme, /問題.*原因.*対応.*検証/s);
  assert.match(readme, /docs\/images\/public-landing-desktop\.png/);
  assert.match(readme, /docs\/images\/public-demo-mobile\.png/);
  assert.match(readme, /新規課金.*受け付けていません/s);
  assert.doesNotMatch(readme, /51件目からは月額制に移行/);
  assert.doesNotMatch(readme, /Stripe Checkout で決済する/);
});
```

- [ ] **Step 2: 古いREADMEで失敗することを確認する**

Run: `node --test tests/repository-presentation.test.cjs`

Expected: デモURLまたは「実装済み」が見つからず FAIL。

- [ ] **Step 3: READMEを全面更新する**

次の順序で記載する。

```text
タイトルと一文説明
本番URL / ログイン不要デモURL / CIバッジ
PC・スマートフォン画面例
実装済み機能
自動テストで検証済み
技術構成とデータフロー
改善事例（問題 → 原因 → 対応 → 検証）
制約・未対応
ローカル実行・テスト・ビルド手順
アーカイブと決済コードの位置づけ
作者情報
```

制約には、公開デモがメモリ内だけで動き再読み込みで戻ること、現在は新規課金を受け付けていないこと、端末やブラウザ条件により位置情報・通知が利用できない場合があることを明記する。

- [ ] **Step 4: READMEテストを通す**

Run: `node --test tests/repository-presentation.test.cjs`

Expected: PASS。

- [ ] **Step 5: コミットする**

```bash
git add README.md tests/repository-presentation.test.cjs
git commit -m "docs: present memory fragments as a verified portfolio"
```

### Task 4: GitHub Actions でテストとビルドを自動化する

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tests/repository-presentation.test.cjs`

**Interfaces:**
- Consumes: `npm test`、`npm run build`、`firebase.test.json`
- Produces: README のCIバッジが参照する `CI` ワークフロー

- [ ] **Step 1: CI要件の失敗テストを書く**

```js
test('GitHub CI installs reproducible tools and verifies tests plus build', () => {
  const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.match(workflow, /node-version:\s*22/);
  assert.match(workflow, /java-version:\s*['"]?21/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.match(pkg.devDependencies['firebase-tools'], /^\d+\.\d+\.\d+$/);
});
```

- [ ] **Step 2: CI未作成で失敗することを確認する**

Run: `node --test tests/repository-presentation.test.cjs`

Expected: `.github/workflows/ci.yml` の `ENOENT` で FAIL。

- [ ] **Step 3: Firebase CLI を固定依存へ追加する**

Run: `npm install --save-dev --save-exact firebase-tools@15.7.0`

Expected: `package.json` と `package-lock.json` に `firebase-tools: 15.7.0` が追加される。

- [ ] **Step 4: CIワークフローを追加する**

`.github/workflows/ci.yml` を次の条件で作る。

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main, master]
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
```

- [ ] **Step 5: CI構成テストを通す**

Run: `node --test tests/repository-presentation.test.cjs`

Expected: PASS。

- [ ] **Step 6: コミットする**

```bash
git add .github/workflows/ci.yml package.json package-lock.json tests/repository-presentation.test.cjs
git commit -m "ci: verify tests and static build"
```

### Task 5: 全体を検証してPRへ反映する

**Files:**
- Modify if needed: `README.md`, `archive/README.md`, tests/configuration found by verification

**Interfaces:**
- Consumes: Tasks 1-4 の全成果物
- Produces: 検証済みの PR #6 更新

- [ ] **Step 1: 全自動テストを実行する**

Run: `npm test`

Expected: 全テスト PASS、失敗 0。

- [ ] **Step 2: 本番用静的ビルドを実行する**

Run: `npm run build`

Expected: `Built 25 public assets in dist/`、exit 0。

- [ ] **Step 3: 公開物へ私有・アーカイブ資産が入っていないことを確認する**

Run: `find dist -type f | sort`

Expected: 許可リストの25ファイルだけで、`archive/`、`docs/`、`.github/`、`functions/` を含まない。

- [ ] **Step 4: 差分とREADME表示を確認する**

Run: `git diff --check HEAD~4..HEAD && git status --short`

Expected: 空白エラーなし、意図しない未追跡ファイルなし。

- [ ] **Step 5: PR #6 のブランチへpushする**

Run: `git push origin feature/public-demo-mode`

Expected: push 成功後、PR #6 の CI が開始する。

- [ ] **Step 6: GitHubのCI結果を確認する**

Run: `gh pr checks 6 --watch`

Expected: 新しい `CI` と既存の Vercel チェックが PASS。
