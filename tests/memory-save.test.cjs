const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

// Run the real form, MemoryService and MemoryRepository. Only Firebase/network
// and browser image decoding are replaced; persistence uses jsdom localStorage.
function setup(t, { rejectCloud = false, pauseCloud = false } = {}) {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
    url: 'https://www.memory-fragments.com/', runScripts: 'outside-only'
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  const user = { uid: 'alice', email: 'alice@example.invalid' };
  let onAuth, finish;
  const auth = { currentUser: user, onAuthStateChanged(fn) { onAuth = fn; } };
  const writes = [];
  const collection = {
    async add(memory) {
      if (pauseCloud) await new Promise(resolve => { finish = resolve; });
      if (rejectCloud) throw new Error('Cloud unavailable');
      writes.push({ ...memory });
      return { id: 'saved-diary' };
    },
    orderBy() { return { async get() {
      return { docs: writes.map(data => ({ id: 'saved-diary', data: () => data })) };
    } }; }
  };
  const db = { collection(name) {
    assert.equal(name, 'users');
    return { doc(uid) {
      assert.equal(uid, 'alice');
      return { collection(name) { assert.equal(name, 'memories'); return collection; } };
    } };
  } };
  w.firebase = { initializeApp() {}, auth: () => auth, storage: () => ({}),
    firestore: () => db, functions: () => ({}) };
  w.Stripe = () => ({});
  w.fetch = async () => new Response(new Blob(['photo'], { type: 'image/jpeg' }));
  w.URL.createObjectURL = URL.createObjectURL;
  w.URL.revokeObjectURL = URL.revokeObjectURL;
  const context = dom.getInternalVMContext();
  for (const name of ['memory-repository', 'memory-service', 'premium-service', 'image-service', 'location-service']) {
    vm.runInContext(fs.readFileSync(`js/app/services/${name}.js`, 'utf8'), context);
  }
  vm.runInContext([...w.document.querySelectorAll('script:not([src])')].at(-1).textContent, context);
  w.onload = null;
  const run = code => vm.runInContext(code, context);
  run('currentUser = auth.currentUser;');
  const el = id => w.document.getElementById(id);
  el('title').value = '失いたくない日記';
  el('content').value = '写真と一緒に残したい内容';
  el('category').selectedIndex = 1;
  const button = w.document.querySelector('button[onclick="saveMemory()"]');
  const local = () => JSON.parse(w.localStorage.getItem('memories:alice') || '[]');
  const save = () => run('saveMemory()');
  function photo() {
    const file = new w.File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(el('imageFile'), 'files', { configurable: true, value: [file] });
    return file;
  }
  function fullStorage() {
    w.Storage.prototype.setItem = () => { throw new w.DOMException('Full', 'QuotaExceededError'); };
  }
  return { w, run, el, button, writes, save, local, photo, fullStorage, auth,
    logout: () => { auth.currentUser = null; onAuth(null); }, finish: () => finish() };
}

test('cloud save remains successful when analytics throws, without a local-only duplicate', async t => {
  const f = setup(t);
  f.w.Analytics = { track() { throw new Error('Analytics failed'); } };
  await f.save();
  assert.equal(f.writes.length, 1);
  assert.equal(f.local().filter(m => m.localOnly).length, 0);
  assert.equal(f.el('title').value, '');
  assert.match(f.el('status').textContent, /クラウド.*保存/);
  assert.equal(f.button.disabled, false);
});

test('cloud failure saves only to this device, clears saved draft and keeps legacy records intact', async t => {
  const f = setup(t, { rejectCloud: true });
  const legacy = JSON.stringify([{ id: 'old', userId: 'alice', title: '既存の日記',
    content: '以前の内容', category: '日常', tags: [], createdAt: '2026-09-01T00:00:00.000Z' }]);
  f.w.localStorage.setItem('memories', legacy);
  await f.save();
  assert.equal(f.writes.length, 0);
  assert.equal(f.local().filter(m => m.localOnly).length, 1);
  assert.ok(f.local().some(m => m.id === 'old'));
  assert.equal(f.w.localStorage.getItem('memories'), legacy);
  assert.match(f.el('status').textContent, /この端末.*のみ/);
  assert.match(f.el('status').textContent, /未同期|同期されていません/);
  assert.equal(f.el('title').value, '');
  assert.equal(f.button.disabled, false);
});

test('cloud and device failure retain text and selected photo and always release the busy state', async t => {
  const f = setup(t, { rejectCloud: true });
  const file = f.photo();
  f.run(`imageService.resizeImage = async file => ({file});
    imageService.uploadToFirebase = async () => null;
    imageService.toBase64 = async () => 'data:image/jpeg;base64,cGhvdG8=';`);
  f.fullStorage();
  await assert.doesNotReject(f.save());
  assert.equal(f.el('title').value, '失いたくない日記');
  assert.equal(f.el('imageFile').files[0], file);
  assert.match(f.el('status').textContent, /保存できません/);
  assert.equal(f.el('uploadProgress').style.display, 'none');
  assert.equal(f.button.disabled, false);
});

test('repeated save clicks write once and freeze the submitted fields until complete', async t => {
  const f = setup(t, { pauseCloud: true });
  const first = f.save();
  assert.equal(f.button.disabled, true);
  for (const id of ['title', 'content', 'category', 'tags', 'imageFile', 'locationPermission']) {
    assert.equal(f.el(id).disabled, true, id);
  }
  await f.save();
  f.finish();
  await first;
  assert.equal(f.writes.length, 1);
  assert.equal(f.button.disabled, false);
  assert.equal(f.el('content').disabled, false);
});

test('an unreadable photo is never silently discarded to save a text-only diary', async t => {
  const f = setup(t);
  const file = f.photo();
  f.run(`imageService.resizeImage = async file => ({file});
    imageService.uploadToFirebase = async () => null;
    imageService.toBase64 = async () => null;`);
  await f.save();
  assert.equal(f.writes.length, 0);
  assert.equal(f.local().length, 0);
  assert.equal(f.el('imageFile').files[0], file);
  assert.equal(f.el('title').value, '失いたくない日記');
  assert.match(f.el('status').textContent, /保存できません/);
  assert.equal(f.button.disabled, false);
});

test('cloud-confirmed diary remains visible and successful when local cache is full', async t => {
  const f = setup(t);
  f.fullStorage();
  await f.save();
  assert.equal(f.writes.length, 1);
  assert.match(f.el('memoriesGrid').textContent, /失いたくない日記/);
  assert.match(f.el('status').textContent, /クラウド.*保存/);
  assert.equal(f.el('title').value, '');
});

test('late save failure cannot save to, clear or report failure in the next account', async t => {
  const f = setup(t, { rejectCloud: true, pauseCloud: true });
  const pending = f.save();
  f.logout();
  f.auth.currentUser = { uid: 'bob' };
  f.run('currentUser = auth.currentUser;');
  f.el('title').value = 'Bobの下書き';
  f.el('status').textContent = 'Bobの画面';
  f.finish();
  await pending;
  assert.equal(f.el('title').value, 'Bobの下書き');
  assert.equal(f.el('status').textContent, 'Bobの画面');
  assert.equal(f.w.localStorage.getItem('memories:bob'), null);
  assert.equal(f.button.disabled, false);
  assert.equal(f.el('uploadProgress').style.display, 'none');
});

test('a list response started before saving preserves both the new and previously saved diaries', async t => {
  const f = setup(t);
  let finishList;
  f.w.delayedGet = () => new Promise(resolve => { finishList = resolve; });
  f.run(`memoryRepository.db = { collection: () => ({doc: () => ({collection: () => ({
    orderBy: () => ({get: window.delayedGet}),
    add: async () => ({id: 'saved-diary'})
  })})}) };`);
  const pending = f.run('loadMemories()');
  await f.save();
  finishList({ docs: [{ id: 'old-cloud-diary', data: () => ({
    userId: 'alice', title: '以前のクラウド日記', content: '以前の本文',
    category: '日常', tags: [], createdAt: '2026-09-01T00:00:00.000Z'
  }) }] });
  await pending;
  assert.match(f.el('memoriesGrid').textContent, /失いたくない日記/);
  assert.ok(f.local().some(m => m.id === 'saved-diary'));
  assert.match(f.el('memoriesGrid').textContent, /以前のクラウド日記/);
  assert.ok(f.local().some(m => m.id === 'old-cloud-diary'));
});

test('an older notification timer cannot erase the device-only save warning', async t => {
  const f = setup(t, { rejectCloud: true });
  const timers = new Map();
  let nextId = 0;
  f.w.setTimeout = fn => { timers.set(++nextId, fn); return nextId; };
  f.w.clearTimeout = id => timers.delete(id);
  f.run(`showStatus('status', '以前の通知', false);`);
  await f.save();
  for (const fn of [...timers.values()]) fn();
  assert.match(f.el('status').textContent, /この端末.*のみ/);
});

test('a late list cache failure cannot replace the newer device-only save warning', async t => {
  const f = setup(t);
  let finishList;
  f.w.delayedGet = () => new Promise(resolve => { finishList = resolve; });
  f.run(`memoryRepository.db = {collection: () => ({doc: () => ({collection: () => ({
    orderBy: () => ({get: window.delayedGet}),
    add: async () => { throw new Error('Cloud unavailable'); }
  })})})};`);
  const pending = f.run('loadMemories()');
  await f.save();
  f.fullStorage();
  finishList({docs: []});
  await pending;
  assert.match(f.el('status').textContent, /この端末.*のみ/);
  assert.match(f.el('status').textContent, /未同期/);
});

test('rendering failure after device save never retains a resubmittable duplicate draft', async t => {
  const f = setup(t, { rejectCloud: true });
  f.run(`displayMemories = () => { throw new Error('Render failed'); };`);
  await assert.doesNotReject(f.save());
  assert.equal(f.local().filter(m => m.localOnly).length, 1);
  assert.equal(f.el('title').value, '');
  assert.match(f.el('status').textContent, /この端末.*のみ/);
  assert.match(f.el('status').textContent, /再保存せず/);
});

test('logout releases a pending save UI and its late result cannot unlock a newer save', async t => {
  const f = setup(t, { pauseCloud: true });
  const first = f.save();
  f.logout();
  assert.equal(f.button.disabled, false);
  assert.equal(f.el('title').disabled, false);
  assert.equal(f.el('status').textContent, '');
  f.auth.currentUser = { uid: 'bob' };
  f.run('currentUser = auth.currentUser;');
  let finishSecond;
  f.w.saveSecond = () => new Promise(resolve => { finishSecond = resolve; });
  f.run(`memoryRepository.db = {collection: () => ({doc: () => ({collection: () => ({add: window.saveSecond})})})};`);
  f.el('title').value = 'Bobの下書き';
  f.el('content').value = 'Bobの本文';
  f.el('category').selectedIndex = 1;
  const second = f.save();
  f.finish();
  await first;
  assert.equal(f.button.disabled, true);
  assert.equal(f.el('title').value, 'Bobの下書き');
  finishSecond({ id: 'bob-diary' });
  await second;
  assert.equal(f.button.disabled, false);
  assert.equal(f.el('title').value, '');
  assert.equal(JSON.parse(f.w.localStorage.getItem('memories:bob'))[0].userId, 'bob');
});
