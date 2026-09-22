const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

function setup(t, query = '') {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
    url: `https://www.memory-fragments.com/${query}`, runScripts: 'outside-only'
  });
  t.after(() => dom.window.close());
  const window = dom.window;
  const context = dom.getInternalVMContext();
  const user = { uid: 'alice', email: 'test@example.invalid', getIdToken: async () => 'test-token' };
  let authCallback;
  const auth = { currentUser: user, onAuthStateChanged(cb) { authCallback = cb; } };
  window.firebase = { initializeApp() {}, auth: () => auth, storage: () => ({}),
    firestore: () => ({}), functions: () => ({}) };
  window.Stripe = () => ({});
  window.fetch = async () => new Response(new Blob(['photo'], { type: 'image/png' }));
  window.URL.createObjectURL = URL.createObjectURL;
  window.URL.revokeObjectURL = URL.revokeObjectURL;
  for (const name of ['memory-repository', 'memory-service', 'premium-service', 'image-service', 'location-service']) {
    vm.runInContext(fs.readFileSync(`js/app/services/${name}.js`, 'utf8'), context);
  }
  const scripts = [...window.document.querySelectorAll('script:not([src])')];
  vm.runInContext(scripts.at(-1).textContent, context);
  // No WebGL or payment side effects: call individual application entrypoints below.
  const onload = window.onload;
  window.onload = null;
  window.fixture = { id: 'photo', userId: 'alice', title: 'Private title', content: 'Private diary',
    category: '日常', tags: [], createdAt: '2026-09-22',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/memory-fragments.firebasestorage.app/o/memories%2Falice%2Fphoto.jpg?alt=media&token=old-token' };
  const run = code => vm.runInContext(code, context);
  const grid = window.document.getElementById('memoriesGrid');
  return { window, run, grid, auth, authCallback, user, onload };
}

test('owner grid shows an authenticated blob, never the stored bearer URL or share button', async t => {
  const { run, grid } = setup(t);
  run('currentUser = auth.currentUser; memories = [window.fixture]; displayMemories();');
  assert.equal(grid.querySelector('img[src*="token="]'), null);
  await new Promise(resolve => setImmediate(resolve));
  assert.match(grid.querySelector('img').src, /^blob:/);
  assert.equal(grid.querySelector('[onclick^="shareMemory"]'), null);
});

test('unauthenticated single-memory links never expose a cached private photo', async t => {
  const { window, run, grid, auth, authCallback } = setup(t, '?id=photo');
  window.localStorage.setItem('memories', JSON.stringify([window.fixture]));
  auth.currentUser = null;
  authCallback(null);
  await run('loadSingleMemory("photo")');
  assert.equal(grid.querySelector('img'), null);
  assert.ok(!grid.textContent.includes('Private diary'));
  assert.equal(window.document.getElementById('authSection').style.display, 'block');
});

test('logout removes existing private photos and diary from the screen', async t => {
  const { run, grid, auth, authCallback } = setup(t);
  run('currentUser = auth.currentUser; memories = [window.fixture]; displaySingleMemoryView(window.fixture);');
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(grid.textContent.includes('Private diary'));
  auth.currentUser = null;
  authCallback(null);
  assert.equal(grid.querySelector('img'), null);
  assert.ok(!grid.textContent.includes('Private diary'));
});

test('a late cloud response after logout cannot restore the private view', async t => {
  const { window, run, grid, auth, authCallback } = setup(t);
  let finish;
  window.delayedList = () => new Promise(resolve => { finish = resolve; });
  run('currentUser = auth.currentUser; memoryRepository.listForUser = window.delayedList;');
  const pending = run('loadMemories()');
  auth.currentUser = null;
  authCallback(null);
  finish([window.fixture]);
  await pending;
  assert.equal(grid.querySelector('img'), null);
  assert.ok(!grid.textContent.includes('Private diary'));
});

test('page load of a private link keeps the login form available', t => {
  const { window, run, grid, auth, authCallback, onload } = setup(t, '?id=photo');
  window.localStorage.setItem('memories', JSON.stringify([window.fixture]));
  auth.currentUser = null;
  authCallback(null);
  run('init3DScene = () => {}; generateStars = () => {}; checkPaymentResult = () => {};');
  onload();
  assert.equal(window.document.getElementById('authSection').style.display, 'block');
  assert.notEqual(window.document.getElementById('authSection').style.visibility, 'hidden');
  assert.equal(grid.querySelector('img'), null);
});

test('legacy share action does not offer a public diary link', t => {
  const { window, run } = setup(t);
  run('currentUser = auth.currentUser; memories = [window.fixture]; shareMemory("photo");');
  assert.equal(window.document.querySelector('#shareContent a'), null);
});

test('account change clears a previous account draft, not just its saved photos', t => {
  const { window, run, auth, authCallback } = setup(t);
  run('currentUser = auth.currentUser;');
  window.document.getElementById('title').value = 'Alice private draft';
  window.document.getElementById('content').value = 'Not for Bob';
  auth.currentUser = null;
  authCallback(null);
  assert.equal(window.document.getElementById('title').value, '');
  assert.equal(window.document.getElementById('content').value, '');
});

test('account change during save cannot write a photo to the next account', async t => {
  const { window, run, auth, authCallback } = setup(t);
  let finish;
  window.delayedLocation = () => new Promise(resolve => { finish = resolve; });
  const saves = [];
  window.recordSave = async value => saves.push(value);
  run('currentUser = auth.currentUser; memoryService.attachLocation = window.delayedLocation; memoryService.saveForUser = window.recordSave;');
  window.document.getElementById('title').value = 'Alice draft';
  window.document.getElementById('content').value = 'Alice private diary';
  const category = window.document.getElementById('category');
  category.selectedIndex = 1;
  window.document.getElementById('locationPermission').checked = true;
  const pending = run('saveMemory()');
  auth.currentUser = null;
  authCallback(null);
  // Simulate the following account already signed in without unrelated network effects.
  auth.currentUser = { uid: 'bob' };
  run('currentUser = auth.currentUser;');
  finish(window.fixture);
  await pending;
  assert.equal(saves.length, 0);
});
