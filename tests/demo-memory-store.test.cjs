const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadStore() {
  const window = {};
  vm.runInNewContext(
    fs.readFileSync('js/app/demo/demo-memory-store.js', 'utf8'),
    { window, crypto: { randomUUID: () => 'new-id' } }
  );
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
  assert.equal(store.add({
    userId: 'demo-session',
    title: '追加',
    content: '本文',
    category: '日常',
    tags: []
  }).id, 'new-id');
  assert.equal(store.list().length, 4);
  assert.equal(store.reset().length, 3);
});
