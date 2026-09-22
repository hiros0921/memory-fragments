# Memory Fragments Public Demo Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ログイン不要で架空の日記・合成写真を安全に操作できる公開デモを追加し、本物の利用者データと分離した状態で本番公開する。

**Architecture:** `/?demo=true` をページ初期化の最初に判定し、デモ時はFirebase認証監視・Firestore・Storage・Analytics・位置情報を起動しない。デモデータは依存のない `DemoMemoryStore` のページ内メモリだけに保持し、既存の一覧・検索・統計UIへ渡す。

**Tech Stack:** HTML、Tailwind CSS、Vanilla JavaScript、JSDOM、Node.js test runner、Firebase互換SDK（通常モードのみ）、Vercel static hosting

**Spec:** `docs/superpowers/specs/2026-09-22-public-demo-mode-design.md`

## Global Constraints

- デモは `/?demo=true`、通常画面は `/`、デモ終了先は `/` とする。
- 初期データは架空の日記3件と人物を含まない合成画像3枚とする。
- デモでは追加、写真添付、検索、カテゴリー・タグ絞り込み、詳細表示、削除を操作できる。
- デモの変更はページ内メモリだけに保持し、再読み込みで初期データ3件へ戻す。
- デモ中はFirebase Authentication、Firestore、Storage、Analytics、位置情報、個人用日記保存領域を読み書きしない。
- 共有、書き出し、課金、クラウド同期を示す操作をデモ中は表示しない。
- 通常ログイン時の既存の日記、写真、会員状態、保存・書き出し機能を変更しない。
- Firebaseルール、Storageルール、Cloud Functions、既存データを変更・デプロイしない。
- 本番への反映対象はVercelの静的Web資産だけとする。

## Review Focus

- ログイン済みのブラウザーでデモURLを開いても、認証監視を登録せず個人の日記・メールアドレスを表示しないことをTask 2の統合テストで固定する。
- `?demo=false` やパラメーターなしでは通常の認証監視が1回だけ登録されることをTask 2の統合テストで固定する。
- タイトル・本文・タグにHTML文字列を入力しても実行されず文字として表示されることをTask 3の操作テストで固定する。
- 非画像または上限超過画像ではデモ件数を増やさず、入力内容と選択ファイルを残して理由を表示することをTask 3の操作テストで固定する。
- デモ詳細画面への存在しないID指定と一覧への復帰で通常Firestoreへフォールバックせず、デモURLを維持することをTask 3の操作テストで固定する。

---

## File Structure

- Create `js/app/demo/demo-memory-store.js`: 架空の初期データと、メモリ内だけの一覧・追加・削除・リセットを提供する。
- Create `tests/demo-memory-store.test.cjs`: ストアのコピー分離、CRUD、リセット、入力防御を単体検証する。
- Create `tests/demo-mode.test.cjs`: 実際の `index.html` をJSDOMで起動し、外部サービス非接触と一連のデモ操作を統合検証する。
- Modify `index.html`: トップ説明、デモ導線、デモバナー、モード分岐、既存UIとの接続を実装する。
- Create `assets/demo/demo-sunset.png`: 人物なしの夕方の海辺の合成画像。
- Create `assets/demo/demo-cafe.png`: 人物なしの本と飲み物があるカフェの合成画像。
- Create `assets/demo/demo-goal.png`: 人物なしの付箋とノートがある机の合成画像。
- Modify `scripts/build-static.cjs`: デモ用コードと3画像を公開アセット許可リストへ追加する。
- Modify `tests/static-build.test.cjs`: デモ資産、トップ説明、外部画像URL不在を検証する。
- Create `docs/public-demo.md`: 公開デモの利用方法、データ分離、リセット動作、検証結果を記録する。

---

### Task 1: Page-Memory Demo Store

**Files:**
- Create: `js/app/demo/demo-memory-store.js`
- Create: `tests/demo-memory-store.test.cjs`

**Interfaces:**
- Consumes: なし。ブラウザー標準の `structuredClone` がなくてもJSON互換データを複製できること。
- Produces: `window.AppDemo.DEFAULT_MEMORIES: ReadonlyArray<DemoMemory>`、`window.AppDemo.DemoMemoryStore`。メソッドは `list(): DemoMemory[]`、`add(memory): DemoMemory`、`remove(id): boolean`、`getById(id): DemoMemory|null`、`reset(): DemoMemory[]`。

- [ ] **Step 1: Write the failing store tests**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadStore() {
  const window = {};
  vm.runInNewContext(fs.readFileSync('js/app/demo/demo-memory-store.js', 'utf8'), { window, crypto: { randomUUID: () => 'new-id' } });
  return window.AppDemo;
}

test('starts from three independent fictional memories', () => {
  const { DemoMemoryStore } = loadStore();
  const first = new DemoMemoryStore();
  const second = new DemoMemoryStore();
  assert.equal(first.list().length, 3);
  first.remove('demo-sunset');
  assert.equal(first.list().length, 2);
  assert.equal(second.list().length, 3);
});

test('returns copies and resets additions and deletions', () => {
  const { DemoMemoryStore } = loadStore();
  const store = new DemoMemoryStore();
  const copy = store.list();
  copy[0].title = '外から変更';
  assert.notEqual(store.list()[0].title, '外から変更');
  assert.equal(store.add({ userId: 'demo-session', title: '追加', content: '本文', category: '日常', tags: [] }).id, 'new-id');
  assert.equal(store.list().length, 4);
  assert.equal(store.reset().length, 3);
});
```

- [ ] **Step 2: Run the focused tests and confirm the missing-file failure**

Run: `node --test tests/demo-memory-store.test.cjs`

Expected: FAIL because `js/app/demo/demo-memory-store.js` does not exist.

- [ ] **Step 3: Implement the dependency-free store and seed data**

```js
(function (global) {
  const DEMO_USER_ID = 'demo-session';
  const DEFAULT_MEMORIES = [
    { id: 'demo-sunset', userId: DEMO_USER_ID, title: '海辺で見た夕焼け', content: '週末に海辺を歩き、空の色がゆっくり変わる時間を楽しみました。', category: '旅行', tags: ['海', '夕焼け', '週末'], createdAt: '2026-09-20T09:30:00.000Z', demoImageUrl: '/assets/demo/demo-sunset.png', demoImageAlt: 'デモ用合成画像：夕方の海辺' },
    { id: 'demo-cafe', userId: DEMO_USER_ID, title: '静かなカフェで読書', content: '気になっていた本を開き、落ち着いた時間を過ごしました。', category: '趣味', tags: ['読書', 'カフェ', '休日'], createdAt: '2026-09-19T05:00:00.000Z', demoImageUrl: '/assets/demo/demo-cafe.png', demoImageAlt: 'デモ用合成画像：本と飲み物がある静かなカフェ' },
    { id: 'demo-goal', userId: DEMO_USER_ID, title: '小さな目標を達成した日', content: '今日やると決めたことを一つ終え、次の目標をノートに書きました。', category: '日常', tags: ['目標', '振り返り', '成長'], createdAt: '2026-09-18T11:15:00.000Z', demoImageUrl: '/assets/demo/demo-goal.png', demoImageAlt: 'デモ用合成画像：付箋とノートがある机' }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  class DemoMemoryStore {
    constructor(seed = DEFAULT_MEMORIES) { this.seed = clone(seed); this.reset(); }
    list() { return clone(this.memories); }
    getById(id) { return clone(this.memories.find(memory => memory.id === id) || null); }
    add(memory) { const stored = { ...clone(memory), id: memory.id || crypto.randomUUID() }; this.memories.unshift(stored); return clone(stored); }
    remove(id) { const before = this.memories.length; this.memories = this.memories.filter(memory => memory.id !== id); return before !== this.memories.length; }
    reset() { this.memories = clone(this.seed); return this.list(); }
  }
  global.AppDemo = { DEMO_USER_ID, DEFAULT_MEMORIES: clone(DEFAULT_MEMORIES), DemoMemoryStore };
})(window);
```

- [ ] **Step 4: Run the focused tests and confirm they pass**

Run: `node --test tests/demo-memory-store.test.cjs`

Expected: all store tests PASS.

- [ ] **Step 5: Commit the store**

```bash
git add js/app/demo/demo-memory-store.js tests/demo-memory-store.test.cjs
git commit -m "feat: add in-memory public demo store"
```

---

### Task 2: Demo Boot and External-Service Isolation

**Files:**
- Modify: `index.html:601-716`
- Modify: `index.html:2201-2268`
- Create: `tests/demo-mode.test.cjs`

**Interfaces:**
- Consumes: `window.AppDemo.DemoMemoryStore` and `window.AppDemo.DEMO_USER_ID` from Task 1.
- Produces: page constants `isDemoMode`, `demoStore`, functions `startDemoMode()` and `isCurrentMemoryOwner(memory)`; normal mode retains its existing auth callback.

- [ ] **Step 1: Write failing boot-isolation tests**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

function setupDemo(t, query = '?demo=true') {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
    url: `https://www.memory-fragments.com/${query}`,
    runScripts: 'outside-only'
  });
  t.after(() => dom.window.close());
  const window = dom.window;
  const context = dom.getInternalVMContext();
  const calls = { auth: 0, authObserver: 0, firestore: 0, storage: 0, analytics: 0, geolocation: 0 };
  const auth = {
    currentUser: { uid: 'alice', email: 'alice@example.invalid' },
    onAuthStateChanged(callback) { calls.authObserver += 1; this.callback = callback; }
  };
  window.firebase = {
    initializeApp() {},
    auth() { calls.auth += 1; return auth; },
    firestore() { calls.firestore += 1; return {}; },
    storage() { calls.storage += 1; return {}; }
  };
  window.Analytics = {
    init() { calls.analytics += 1; },
    track() { calls.analytics += 1; }
  };
  Object.defineProperty(window.navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition() { calls.geolocation += 1; }
  } });
  window.fetch = async () => { throw new Error('Unexpected network access'); };
  window.URL.createObjectURL = URL.createObjectURL;
  window.URL.revokeObjectURL = URL.revokeObjectURL;
  vm.runInContext(fs.readFileSync('js/app/demo/demo-memory-store.js', 'utf8'), context);
  for (const name of ['memory-repository', 'memory-service', 'premium-service', 'image-service', 'location-service']) {
    vm.runInContext(fs.readFileSync(`js/app/services/${name}.js`, 'utf8'), context);
  }
  vm.runInContext([...window.document.querySelectorAll('script:not([src])')].at(-1).textContent, context);
  const onload = window.onload;
  window.onload = null;
  window.localStorage.setItem('memories:alice', 'private-sentinel');
  const run = source => vm.runInContext(source, context);
  return {
    window,
    document: window.document,
    calls,
    auth,
    run,
    runPageLoad() {
      run('generateStars = () => {}; init3DScene = () => {}; checkPaymentResult = () => {};');
      onload();
    },
    fill({ title, content, category, tags }) {
      window.document.getElementById('title').value = title;
      window.document.getElementById('content').value = content;
      window.document.getElementById('category').value = category;
      window.document.getElementById('tags').value = tags;
    },
    attachFile(file) {
      Object.defineProperty(window.document.getElementById('imageFile'), 'files', {
        configurable: true,
        value: [file]
      });
    }
  };
}

test('demo starts without reading authentication or Firebase data', t => {
  const f = setupDemo(t, '?demo=true');
  f.runPageLoad();
  assert.deepEqual(f.calls, { auth: 0, authObserver: 0, firestore: 0, storage: 0, analytics: 0, geolocation: 0 });
  assert.equal(f.document.getElementById('authSection').style.display, 'none');
  assert.equal(f.document.querySelectorAll('#memoriesGrid > div').length, 3);
  assert.doesNotMatch(f.document.body.textContent, /alice@example\.invalid/);
});

test('normal routes register authentication exactly once', t => {
  for (const query of ['', '?demo=false']) {
    const f = setupDemo(t, query);
    assert.equal(f.calls.auth, 1);
    assert.equal(f.calls.authObserver, 1);
  }
});

test('a real diary id in demo never falls back to Firestore', t => {
  const f = setupDemo(t, '?demo=true&id=private-real-id');
  f.runPageLoad();
  assert.match(f.document.getElementById('memoriesGrid').textContent, /見つかりません/);
  assert.equal(f.calls.firestore, 0);
});
```

- [ ] **Step 2: Run the isolation tests and confirm they fail**

Run: `node --test tests/demo-mode.test.cjs --test-name-pattern="demo starts|normal routes|real diary id"`

Expected: FAIL because the existing page always calls `firebase.auth()`, `firebase.firestore()`, `firebase.storage()`, and registers the auth observer.

- [ ] **Step 3: Add the demo script and mode-first initialization**

Add before the final inline application script:

```html
<script src="/js/app/demo/demo-memory-store.js"></script>
```

Initialize external services only for normal mode:

```js
const isDemoMode = new URLSearchParams(window.location.search).get('demo') === 'true';
const auth = isDemoMode ? { currentUser: null } : firebase.auth();
const storage = isDemoMode ? null : firebase.storage();
const db = isDemoMode ? null : firebase.firestore();
const demoStore = isDemoMode ? new window.AppDemo.DemoMemoryStore() : null;
const demoUser = Object.freeze({ uid: window.AppDemo?.DEMO_USER_ID || 'demo-session' });

if (!isDemoMode) {
  auth.onAuthStateChanged(handleAuthStateChanged);
}
```

Move the existing callback body unchanged into `handleAuthStateChanged(user)`. In `window.onload`, call `startDemoMode()` when `isDemoMode`; otherwise leave loading to the auth observer. `startDemoMode()` sets `currentUser = demoUser`, copies the store list into `memories`, hides auth/premium/export/location controls, shows upload/search/filter/stat sections, then displays either the requested demo ID or the list.

```js
function startDemoMode() {
  currentUser = demoUser;
  memories = demoStore.list();
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('uploadSection').style.display = 'block';
  document.getElementById('demoBanner')?.classList.remove('hidden');
  document.getElementById('premiumStatusContainer').style.display = 'none';
  document.getElementById('locationControl')?.classList.add('hidden');
  document.getElementById('exportButton')?.classList.add('hidden');
  for (const id of ['searchSection', 'statsSection', 'filterSection']) {
    document.getElementById(id).classList.remove('hidden');
  }
  const memoryId = new URLSearchParams(window.location.search).get('id');
  if (!memoryId) displayMemories();
  else {
    const memory = demoStore.getById(memoryId);
    memory ? displaySingleMemoryView(memory) : displayNotFound();
  }
}
```

- [ ] **Step 4: Add ownership and navigation boundaries**

```js
function isCurrentMemoryOwner(memory) {
  if (isDemoMode) return memory?.userId === demoUser.uid;
  return Boolean(currentUser && auth.currentUser === currentUser && memory?.userId === currentUser.uid);
}

function demoHomeUrl() {
  return isDemoMode ? `${window.location.pathname}?demo=true` : window.location.pathname;
}
```

Use `isCurrentMemoryOwner` in single-memory display and use `demoHomeUrl()` in back/list navigation. A missing demo ID calls `displayNotFound()` directly and never `loadSingleMemory()`.

- [ ] **Step 5: Run focused and privacy regression tests**

Run: `node --test tests/demo-mode.test.cjs tests/photo-ui.test.cjs tests/premium-state.test.cjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit boot isolation**

```bash
git add index.html tests/demo-mode.test.cjs
git commit -m "feat: isolate login-free demo startup"
```

---

### Task 3: Demo CRUD, Search, Photo, and Detail Operations

**Files:**
- Modify: `index.html:825-968`
- Modify: `index.html:1003-1402`
- Modify: `tests/demo-mode.test.cjs`

**Interfaces:**
- Consumes: `demoStore`, `demoUser`, `isDemoMode`, `isCurrentMemoryOwner(memory)` from Task 2.
- Produces: `saveDemoMemory()`, `readDemoImage(file)`, demo branches in `deleteMemory`, `displaySingleMemory`, and `renderPrivatePhoto`.

- [ ] **Step 1: Write failing end-to-end demo operation tests**

```js
test('demo add, search, tag filter, details and delete stay in memory', async t => {
  const f = setupDemo(t, '?demo=true');
  f.runPageLoad();
  f.fill({ title: '<img src=x onerror=alert(1)>', content: '<script>bad()</script>', category: '日常', tags: '確認 安全' });
  await f.run('saveMemory()');
  assert.equal(f.run('memories.length'), 4);
  assert.equal(f.document.querySelector('#memoriesGrid script'), null);
  assert.match(f.document.getElementById('memoriesGrid').textContent, /<script>bad\(\)<\/script>/);
  f.document.getElementById('searchText').value = '安全';
  f.run('applyFilters()');
  assert.match(f.document.getElementById('memoriesGrid').textContent, /1件の記憶/);
  const id = f.run('memories[0].id');
  f.run(`displaySingleMemory(${JSON.stringify(id)})`);
  assert.match(f.document.getElementById('memoriesGrid').textContent, /確認/);
  f.window.confirm = () => true;
  await f.run(`deleteMemory(${JSON.stringify(id)})`);
  assert.equal(f.run('demoStore.list().length'), 3);
  assert.equal(f.calls.firestore, 0);
  assert.equal(f.calls.analytics, 0);
  f.run('returnToAllMemories()');
  assert.equal(new URL(f.window.location.href).searchParams.get('demo'), 'true');
});

test('demo photo is a page-memory data URL and a reload restores three seeds', async t => {
  const f = setupDemo(t, '?demo=true');
  f.runPageLoad();
  f.fill({ title: '写真テスト', content: '本文', category: '日常', tags: '' });
  f.attachFile(new f.window.File(['image'], 'sample.png', { type: 'image/png' }));
  await f.run('saveMemory()');
  assert.match(f.run('memories[0].demoImageUrl'), /^data:image\/png;base64,/);
  assert.equal(f.window.localStorage.getItem('memories:alice'), 'private-sentinel');
  const fresh = setupDemo(t, '?demo=true');
  fresh.runPageLoad();
  assert.equal(fresh.run('memories.length'), 3);
});

test('invalid and oversized demo photos retain the draft and do not add a memory', async t => {
  for (const input of [
    { bytes: new Uint8Array(4), name: 'note.txt', type: 'text/plain' },
    { bytes: new Uint8Array(5_000_001), name: 'large.png', type: 'image/png' }
  ]) {
    const f = setupDemo(t, '?demo=true');
    f.runPageLoad();
    f.fill({ title: '残す下書き', content: '消さない本文', category: '日常', tags: '' });
    f.attachFile(new f.window.File([input.bytes], input.name, { type: input.type }));
    await f.run('saveMemory()');
    assert.equal(f.run('memories.length'), 3);
    assert.equal(f.document.getElementById('title').value, '残す下書き');
    assert.match(f.document.getElementById('status').textContent, /画像|サイズ/);
  }
});
```

- [ ] **Step 2: Run the operation tests and confirm they fail**

Run: `node --test tests/demo-mode.test.cjs --test-name-pattern="demo add|demo photo|invalid and oversized"`

Expected: FAIL because `saveMemory`, `deleteMemory`, and private-photo rendering still require a real authenticated user.

- [ ] **Step 3: Implement demo save and image validation**

At the top of `saveMemory()`:

```js
if (isDemoMode) return saveDemoMemory();
```

Add a dedicated path that uses the existing text validation, accepts only `image/jpeg`, `image/png`, and `image/webp`, rejects files above 5,000,000 bytes, uses `FileReader.readAsDataURL`, and stores the result as `demoImageUrl`. It must call `clearForm()` only after `demoStore.add()` succeeds, replace `memories` from `demoStore.list()`, redraw, and show `デモに追加しました。再読み込みすると消えます。` It must not call `memoryService`, Analytics, location, localStorage, Firestore, or Storage.

```js
function readDemoImage(file) {
  if (!file) return Promise.resolve(null);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('JPEG、PNG、WebP形式の画像を選択してください'));
  }
  if (file.size > 5_000_000) {
    return Promise.reject(new Error('デモでは5MB以下の画像を選択してください'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('画像を読み込めませんでした'));
    reader.readAsDataURL(file);
  });
}

async function saveDemoMemory() {
  if (activeMemorySave) return;
  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  const category = document.getElementById('category').value;
  const tags = document.getElementById('tags').value.trim().split(/\s+/).filter(Boolean);
  const imageFile = document.getElementById('imageFile').files[0];
  const validation = memoryService.validateMemoryInput({ title, content, category });
  if (!validation.ok) {
    showStatus('status', validation.message, true, 0);
    return;
  }
  const operation = { cancelled: false, releaseUI() { activeMemorySave = null; } };
  activeMemorySave = operation;
  try {
    const demoImageUrl = await readDemoImage(imageFile);
    const stored = demoStore.add({
      userId: demoUser.uid,
      title,
      content,
      category,
      tags,
      createdAt: new Date().toISOString(),
      ...(demoImageUrl ? { demoImageUrl, demoImageAlt: `デモで追加した画像：${title}` } : {})
    });
    memories = demoStore.list();
    clearForm();
    displayMemories();
    showStatus('status', '✅ デモに追加しました。再読み込みすると消えます。', false, 0);
    return stored;
  } catch (error) {
    showStatus('status', `❌ ${error.message}`, true, 0);
    return null;
  } finally {
    operation.releaseUI();
  }
}
```

- [ ] **Step 4: Implement safe demo delete, detail, and image rendering**

```js
if (isDemoMode) {
  if (!confirm('このデモ記憶を削除しますか？')) return;
  demoStore.remove(id);
  memories = demoStore.list();
  displayMemories();
  return;
}
```

In `renderPrivatePhoto`, render `memory.demoImageUrl` directly only when `isDemoMode && isCurrentMemoryOwner(memory)`. Use `memory.demoImageAlt || 'デモ用合成画像'` as `alt`; on an image `error` event replace it with `デモ画像を表示できませんでした。` Never pass demo data to `imageService`.

- [ ] **Step 5: Preserve demo mode through detail and list navigation**

Use `history.pushState({}, '', '?demo=true')` when returning to all demo memories. A detail route may use `?demo=true&id=<encoded id>`; an unknown ID displays not-found and keeps the demo banner and exit control visible.

- [ ] **Step 6: Run operation and existing save/export/photo tests**

Run: `node --test tests/demo-mode.test.cjs tests/memory-save.test.cjs tests/memory-export.test.cjs tests/photo-ui.test.cjs tests/image-access.test.cjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit demo operations**

```bash
git add index.html tests/demo-mode.test.cjs
git commit -m "feat: add safe demo diary interactions"
```

---

### Task 4: Landing Explanation, Demo Banner, Generated Assets, and Public Build

**Files:**
- Modify: `index.html:225-345`
- Create: `assets/demo/demo-sunset.png`
- Create: `assets/demo/demo-cafe.png`
- Create: `assets/demo/demo-goal.png`
- Modify: `scripts/build-static.cjs:5-15`
- Modify: `tests/static-build.test.cjs`

**Interfaces:**
- Consumes: `isDemoMode` and `startDemoMode()` from Task 2; asset paths from Task 1 seeds.
- Produces: `#appIntro`, `#startDemoLink`, `#demoBanner`, `#exitDemoLink`, `#locationControl`, `#exportButton` selectors used by JSDOM and browser verification.

- [ ] **Step 1: Write failing public UI and build tests**

```js
test('public landing explains the app and offers a login-free demo', () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'));
  const body = dom.window.document.body;
  assert.match(body.textContent, /日記と写真を記録/);
  assert.match(body.textContent, /本人認証付き写真表示/);
  assert.equal(body.querySelector('#startDemoLink').getAttribute('href'), '/?demo=true');
  assert.match(body.querySelector('#startDemoLink').textContent, /ログイン不要/);
});

test('public build includes only local demo code and three generated images', () => {
  const { buildStatic } = require('../scripts/build-static.cjs');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-fragments-demo-'));
  buildStatic(output);
  for (const asset of ['js/app/demo/demo-memory-store.js', 'assets/demo/demo-sunset.png', 'assets/demo/demo-cafe.png', 'assets/demo/demo-goal.png']) {
    assert.ok(fs.statSync(path.join(output, asset)).size > 0, asset);
  }
  const source = fs.readFileSync(path.join(output, 'js/app/demo/demo-memory-store.js'), 'utf8');
  assert.doesNotMatch(source, /https?:\/\//);
});
```

- [ ] **Step 2: Run the UI/build tests and confirm they fail**

Run: `node --test tests/static-build.test.cjs --test-name-pattern="public landing|public build includes"`

Expected: FAIL because the landing content and demo assets are not yet in the public build.

- [ ] **Step 3: Generate three people-free synthetic demo images**

Use the `imagegen` skill with these exact prompts and save the three results as PNG:

1. `人物や文字を含まない、夕暮れの静かな海辺。日記アプリのデモ写真。自然な写真表現、落ち着いた紫と橙、横長4:3。ロゴ、透かし、看板なし。`
2. `人物や文字を含まない、静かなカフェの木製テーブルに閉じた本と温かい飲み物。日記アプリのデモ写真。自然な写真表現、柔らかな光、横長4:3。ロゴ、透かしなし。`
3. `人物や文字を含まない、付箋とペンとノートが整った机。日記アプリのデモ写真。自然な写真表現、達成感のある朝の光、横長4:3。付箋やノートに読める文字、ロゴ、透かしなし。`

Visually inspect every image before use. Reject any output containing a person, readable private-looking text, logo, or watermark.

- [ ] **Step 4: Add the landing card and demo banner**

The landing card must contain:

```html
<section id="appIntro" aria-labelledby="appIntroTitle">
  <h2 id="appIntroTitle">写真と一緒に、日々の記憶を残す</h2>
  <p>日記と写真を記録し、検索・分類・振り返りができる個人向けWebアプリです。</p>
  <p>本人認証付き写真表示、クラウド保存と端末内フォールバック、検索・統計、個人データと公開デモの分離を実装しています。</p>
  <a id="startDemoLink" href="/?demo=true">デモを試す（ログイン不要）</a>
  <p>操作内容は保存されず、架空データだけを使用します。</p>
</section>
```

The demo banner must be visible only in demo mode, use `role="status"`, say `デモモード — 架空データのみ。変更は再読み込みでリセットされます`, and provide `<a id="exitDemoLink" href="/">デモを終了</a>`. Add stable IDs to the location row and export button so `startDemoMode()` can hide them.

- [ ] **Step 5: Add responsive and reduced-motion styles**

At 360px width, intro text, banner, buttons, upload form, filters, and cards must remain within the viewport. Give start/exit controls a minimum 44px tap height. Under `@media (prefers-reduced-motion: reduce)`, disable floating/scale animations for the intro and demo controls without hiding functionality.

- [ ] **Step 6: Publish demo assets through the allowlist build**

Add the script and three image paths to the exact `assets` array in `scripts/build-static.cjs`. Do not add the design docs, tests, Firebase rules, functions, historical HTML files, or image source prompts to public output.

- [ ] **Step 7: Run UI, build, and full automated tests**

Run: `node --test tests/demo-memory-store.test.cjs tests/demo-mode.test.cjs tests/static-build.test.cjs`

Then run: `npm test`

Then run: `npm run build`

Expected: focused tests PASS, the complete emulator-backed suite PASS, and the static build completes without unexpected files.

- [ ] **Step 8: Commit the public UI and assets**

```bash
git add index.html assets/demo js/app/demo/demo-memory-store.js scripts/build-static.cjs tests/static-build.test.cjs
git commit -m "feat: present the public demo experience"
```

---

### Task 5: Documentation, Whole-Branch Review, PR, and Production Release

**Files:**
- Create: `docs/public-demo.md`
- Verify: all files changed since `cefb6c8b11f1327d039ce126a76733abab587358`

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: reviewed branch, stacked GitHub PR based on `fix/portfolio-no-checkout`, Vercel production deployment, recorded deployment ID and verification evidence.

- [ ] **Step 1: Document behavior and privacy boundary**

Create `docs/public-demo.md` with these concrete sections: public URL `https://www.memory-fragments.com/?demo=true`, available operations, `再読み込みで3件へ戻る`, synthetic-image disclosure, services never contacted in demo, normal-account behavior unchanged, and the automated/manual verification commands used.

- [ ] **Step 2: Run the final local verification from a clean build directory**

Run:

```bash
git diff --check cefb6c8b11f1327d039ce126a76733abab587358..HEAD
npm test
demo_backup_dir=$(mktemp -d /tmp/memory-fragments-build-backup.XXXXXX)
test ! -e dist || mv dist "$demo_backup_dir/dist"
npm run build
```

Before moving `dist`, resolve it to `/Users/suwahiroyuki/Projects/memory-fragments-security/dist` and confirm it contains only generated static output. Keep the temporary backup until production verification finishes. Expected: no whitespace errors, full suite PASS, build PASS.

- [ ] **Step 3: Verify in local browsers at desktop and iPhone widths**

Serve `dist` with a temporary local static server. Check normal `/` and `/?demo=true` at desktop width and 390×844:

- landing explanation and login-free button are visible;
- demo banner and exit are always understandable;
- exactly three synthetic-photo diaries load;
- add, photo attach, search, tag, category, details, delete work;
- reload restores exactly three diaries;
- login form, export, location, premium, sharing, personal email, and personal diary data are absent in demo;
- browser console has no uncaught error and Network shows no Firestore/Storage/Analytics/geolocation request caused by demo actions.

- [ ] **Step 4: Request an independent whole-branch code review**

Use `superpowers:requesting-code-review` against base `cefb6c8b11f1327d039ce126a76733abab587358`. Resolve every Critical or Important finding, rerun the focused and full test suites, and commit each correction with a descriptive `fix:` message.

- [ ] **Step 5: Create the stacked pull request**

Push `feature/public-demo-mode` and create a PR targeting `fix/portfolio-no-checkout`. The PR body must list the four requested outcomes, privacy boundary, generated-image disclosure, tests, browser checks, and state that Firebase rules/functions were not changed.

- [ ] **Step 6: Confirm production has not changed underneath the branch**

Fetch `https://www.memory-fragments.com/` with cache bypass and compare its current app asset hashes/content against the previously recorded production deployment for commit `cefb6c8b11f1327d039ce126a76733abab587358`. Stop before deployment if the production app contains conflicting external changes.

- [ ] **Step 7: Deploy only the verified static build to Vercel production**

Use the repository's existing Vercel project binding and deploy the clean `dist` produced by the verified commit. Do not run `firebase deploy`. Record the exact Git commit and returned Vercel deployment ID/URL in `docs/public-demo.md`, then commit the documentation update if it does not alter the deployed app assets.

- [ ] **Step 8: Verify production behavior and rollback readiness**

Check `https://www.memory-fragments.com/` and `https://www.memory-fragments.com/?demo=true` with cache bypass. Confirm HTTP 200 for the three images and demo script, all Task 5 browser behaviors, absence of purchase controls, and no personal data in logged-out or logged-in demo sessions. If any check fails, roll back to deployment `dpl_7tPEwcpU3A6tCJhwPr6SND5LsXjM` and report the failed condition rather than leaving a partially working demo live.

- [ ] **Step 9: Report the finished release**

Provide the PR URL, production URL, commit, deployment ID, automated test totals, browser/device widths checked, and any explicitly unverified behavior. Do not claim completion without fresh command output and production evidence.
