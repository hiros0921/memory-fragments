const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

test('public build contains the current app and its assets, not backups, rules or logs', () => {
  assert.ok(fs.existsSync('scripts/build-static.cjs'), 'a public asset allowlist build is required');
  const { buildStatic } = require('../scripts/build-static.cjs');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-fragments-static-test-'));
  buildStatic(output);
  assert.ok(fs.existsSync(path.join(output, 'index.html')));
  assert.ok(fs.existsSync(path.join(output, 'sw.js')));
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  for (const [, asset] of html.matchAll(/src="\/(js\/[^"?]+)(?:\?[^\"]*)?"/g)) {
    assert.ok(fs.existsSync(path.join(output, asset)), `missing ${asset}`);
  }
  for (const privatePath of ['app.html', 'index-old.html', 'index-backup.html', 'storage.rules',
    'firebase-debug.log', 'tests', 'PHOTO_PRIVACY_STATUS.md', 'node_modules', '.git']) {
    assert.equal(fs.existsSync(path.join(output, privatePath)), false, `must not publish ${privatePath}`);
  }
});

test('retirement service worker does not cache pages/photos or erase diary storage', async () => {
  const vm = require('node:vm');
  const events = new Map();
  const deleted = [];
  let unregistered = false;
  const self = { addEventListener: (name, handler) => events.set(name, handler),
    skipWaiting: async () => {}, clients: { claim: async () => {} },
    registration: { unregister: async () => { unregistered = true; } } };
  vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), { self, caches: {
    keys: async () => ['memory-fragments-v1', 'memory-fragments-v2', 'unrelated-cache'],
    delete: async key => deleted.push(key)
  } });
  assert.equal(events.has('fetch'), false, 'must not intercept or cache authenticated requests');
  assert.equal(events.has('sync'), false, 'must not replay obsolete writes');
  let activation;
  events.get('activate')({ waitUntil: task => { activation = task; } });
  await activation;
  assert.deepEqual(deleted.sort(), ['memory-fragments-v1', 'memory-fragments-v2']);
  assert.equal(unregistered, true);
});
