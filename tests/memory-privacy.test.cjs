const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const records = [{ id: 'a', userId: 'alice', imageData: 'private-a' },
    { id: 'b', userId: 'bob', imageData: 'private-b' }, { id: 'old', imageData: 'unknown' }];
  const values = new Map([['memories', JSON.stringify(records)]]);
  const localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const auth = { currentUser: { uid: 'alice' } };
  const window = {};
  vm.runInNewContext(fs.readFileSync('js/app/services/memory-repository.js', 'utf8'), { window, localStorage });
  const repo = new window.AppServices.MemoryRepository({ db: {}, auth });
  return { repo, auth, values };
}

test('legacy cached photos are only returned to their identified owner', () => {
  const { repo, auth } = setup();
  assert.deepEqual(Array.from(repo.listLocal(), m => m.id), ['a']);
  assert.equal(repo.getLocalById('b'), null);
  auth.currentUser = null;
  assert.equal(repo.listLocal().length, 0);
  assert.equal(repo.getLocalById('a'), null);
});

test('caching server records cannot overwrite another owner or unknown legacy data', () => {
  const { repo, auth, values } = setup();
  const original = values.get('memories');
  assert.equal(typeof repo.cacheForUser, 'function');
  repo.cacheForUser({ uid: 'alice', memories: [{ id: 'new', userId: 'alice' }] });
  assert.equal(values.get('memories'), original);
  assert.deepEqual(Array.from(repo.listLocal(), m => m.id), ['new']);
  auth.currentUser = { uid: 'bob' };
  assert.deepEqual(Array.from(repo.listLocal(), m => m.id), ['b']);
});

test('late saves cannot attach old owner data to the new account', () => {
  const { repo, auth } = setup();
  auth.currentUser = { uid: 'bob' };
  assert.throws(() => repo.saveLocal({ id: 'late', userId: 'alice' }));
  assert.deepEqual(Array.from(repo.listLocal(), m => m.id), ['b']);
});

test('cloud reads use the authorized document path as ownership, even for legacy records without userId', async () => {
  const { repo } = setup();
  const doc = { id: 'cloud', exists: true, data: () => ({ imageData: 'photo' }) };
  const chain = { collection: () => chain, doc: () => chain, orderBy: () => chain,
    get: async () => ({ ...doc, docs: [doc] }) };
  repo.db = chain;
  assert.equal((await repo.listForUser({ uid: 'alice' }))[0].userId, 'alice');
  assert.equal((await repo.getForUserById({ uid: 'alice', id: 'cloud' })).userId, 'alice');
});

test('cloud refresh preserves pending local-only photos until an explicit deletion', () => {
  const { repo } = setup();
  repo.saveLocal({ id: 'offline', userId: 'alice', imageData: 'private offline photo' });
  repo.cacheForUser({ uid: 'alice', memories: [{ id: 'cloud', userId: 'alice' }] });
  assert.ok(repo.getLocalById('offline'));
  assert.equal(typeof repo.removeLocal, 'function');
  repo.removeLocal('offline');
  assert.equal(repo.getLocalById('offline'), null);
});
