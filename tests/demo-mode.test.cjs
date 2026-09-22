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

module.exports = { setupDemo };
