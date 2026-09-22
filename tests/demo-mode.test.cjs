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
  const calls = {
    auth: 0,
    authObserver: 0,
    firestore: 0,
    storage: 0,
    analytics: 0,
    geolocation: 0
  };
  const auth = {
    currentUser: { uid: 'alice', email: 'alice@example.invalid' },
    onAuthStateChanged(callback) {
      calls.authObserver += 1;
      this.callback = callback;
    }
  };
  window.firebase = {
    initializeApp() {},
    auth() {
      calls.auth += 1;
      return auth;
    },
    firestore() {
      calls.firestore += 1;
      return {};
    },
    storage() {
      calls.storage += 1;
      return {};
    }
  };
  window.Analytics = {
    init() {
      calls.analytics += 1;
    },
    track() {
      calls.analytics += 1;
    }
  };
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition() {
        calls.geolocation += 1;
      }
    }
  });
  window.fetch = async () => {
    throw new Error('Unexpected network access');
  };
  window.URL.createObjectURL = URL.createObjectURL;
  window.URL.revokeObjectURL = URL.revokeObjectURL;
  vm.runInContext(fs.readFileSync('js/app/demo/demo-memory-store.js', 'utf8'), context);
  for (const name of [
    'memory-repository',
    'memory-service',
    'premium-service',
    'image-service',
    'location-service'
  ]) {
    vm.runInContext(fs.readFileSync(`js/app/services/${name}.js`, 'utf8'), context);
  }
  vm.runInContext(
    [...window.document.querySelectorAll('script:not([src])')].at(-1).textContent,
    context
  );
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
  assert.deepEqual(f.calls, {
    auth: 0,
    authObserver: 0,
    firestore: 0,
    storage: 0,
    analytics: 0,
    geolocation: 0
  });
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

test('demo add, search, tag filter, details and delete stay in memory', async t => {
  const f = setupDemo(t, '?demo=true');
  f.runPageLoad();
  f.fill({
    title: '<img src=x onerror=alert(1)>',
    content: '<script>bad()</script>',
    category: '日常',
    tags: '確認 安全'
  });
  await f.run('saveMemory()');
  assert.equal(f.run('memories.length'), 4);
  assert.equal(f.document.querySelector('#memoriesGrid script'), null);
  assert.match(
    f.document.getElementById('memoriesGrid').textContent,
    /<script>bad\(\)<\/script>/
  );
  f.document.getElementById('searchText').value = 'bad';
  f.run('applyFilters()');
  assert.match(f.document.getElementById('memoriesGrid').textContent, /1件の記憶/);
  f.run('resetSearch(); toggleTagFilter("安全")');
  assert.match(f.document.getElementById('memoriesGrid').textContent, /1件の記憶/);
  const id = f.run('memories[0].id');
  const detailsButton = f.document.querySelector(`[data-memory-details="${id}"]`);
  assert.ok(detailsButton, '一覧から詳細を開く操作が必要です');
  detailsButton.click();
  assert.match(f.document.getElementById('memoriesGrid').textContent, /確認/);
  assert.match(f.document.getElementById('memoriesGrid').textContent, /デモ用の架空データ/);
  assert.doesNotMatch(f.document.getElementById('memoriesGrid').textContent, /ログインした本人/);
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

module.exports = { setupDemo };
