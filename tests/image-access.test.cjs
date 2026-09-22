const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(fetchImpl = async () => new Response(new Blob(['photo'], { type: 'image/png' }))) {
  const user = { uid: 'alice', getIdToken: async () => 'test-id-token' };
  const auth = { currentUser: user };
  const window = {};
  vm.runInNewContext(fs.readFileSync('js/app/services/image-service.js', 'utf8'),
    { window, URL, Blob, fetch: fetchImpl, AbortController, setTimeout, clearTimeout, console });
  const service = new window.AppServices.ImageService({
    storage: {}, auth, bucket: 'memory-fragments.firebasestorage.app', fetchImpl
  });
  return { service, auth, user };
}

const legacy = 'https://firebasestorage.googleapis.com/v0/b/memory-fragments.firebasestorage.app/o/memories%2Falice%2Fphoto.jpg?alt=media&token=old-public-token';

test('legacy shared URL is read using owner authentication without the shared token', async () => {
  let request;
  const { service, user } = setup(async (url, options) => {
    request = { url, options };
    return new Response(new Blob(['photo'], { type: 'image/png' }));
  });
  assert.equal(typeof service.loadPrivateImage, 'function', 'authenticated image loading is missing');
  const url = await service.loadPrivateImage({ userId: 'alice', imageUrl: legacy }, user);
  assert.match(url, /^blob:/);
  assert.equal(await (await fetch(url)).text(), 'photo');
  assert.equal(request.url, 'https://firebasestorage.googleapis.com/v0/b/memory-fragments.firebasestorage.app/o/memories%2Falice%2Fphoto.jpg?alt=media');
  assert.equal(request.options.headers.Authorization, 'Firebase test-id-token');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.redirect, 'error');
  service.clearPrivateImages();
  await assert.rejects(fetch(url));
});

for (const [name, memory] of [
  ['another owner', { userId: 'bob', imageUrl: legacy }],
  ['another owner path', { userId: 'alice', imageUrl: legacy.replace('alice', 'bob') }],
  ['another bucket', { userId: 'alice', imageUrl: legacy.replace('memory-fragments.firebasestorage.app', 'other.appspot.com') }],
  ['untrusted website', { userId: 'alice', imageUrl: 'https://example.com/photo.jpg' }],
  ['unmapped legacy upload', { userId: 'alice', imageUrl: 'gs://memory-fragments.firebasestorage.app/uploads/photo.jpg' }],
  ['missing ownership', { imageData: 'data:image/png;base64,cGhvdG8=' }]
]) {
  test(`reject ${name} before sending credentials or displaying local data`, async () => {
    let requests = 0;
    const { service, user } = setup(async () => { requests++; throw new Error('must not request'); });
    assert.equal(typeof service.loadPrivateImage, 'function');
    assert.equal(await service.loadPrivateImage(memory, user), null);
    assert.equal(requests, 0);
  });
}

test('signed out users cannot display even locally cached photo data', async () => {
  const { service, auth, user } = setup();
  auth.currentUser = null;
  assert.equal(typeof service.loadPrivateImage, 'function');
  assert.equal(await service.loadPrivateImage({ userId: 'alice', imageData: 'data:image/png;base64,cGhvdG8=' }, user), null);
});

test('account change while network request is running discards its result', async () => {
  let finish;
  const { service, auth, user } = setup(() => new Promise(resolve => { finish = resolve; }));
  assert.equal(typeof service.loadPrivateImage, 'function');
  const pending = service.loadPrivateImage({ userId: 'alice', imageUrl: legacy }, user);
  await new Promise(resolve => setImmediate(resolve));
  auth.currentUser = { uid: 'bob' };
  finish(new Response(new Blob(['photo'], { type: 'image/png' })));
  assert.equal(await pending, null);
});

test('rerender invalidates an in-flight photo even for the same account', async () => {
  let finish;
  const { service, user } = setup(() => new Promise(resolve => { finish = resolve; }));
  assert.equal(typeof service.loadPrivateImage, 'function');
  const pending = service.loadPrivateImage({ userId: 'alice', imageUrl: legacy }, user);
  await new Promise(resolve => setImmediate(resolve));
  service.clearPrivateImages();
  finish(new Response(new Blob(['photo'], { type: 'image/png' })));
  assert.equal(await pending, null);
});

test('denied response does not fall back to a shared URL', async () => {
  let requests = 0;
  const { service, user } = setup(async () => { requests++; return new Response('denied', { status: 403 }); });
  assert.equal(typeof service.loadPrivateImage, 'function');
  await assert.rejects(service.loadPrivateImage({ userId: 'alice', imageUrl: legacy }, user), error => error.status === 403);
  assert.equal(requests, 1, 'permission denials must not be retried');
});

test('transient network failure is retried using the same private authenticated request', async () => {
  let requests = 0;
  const { service, user } = setup(async (url, options) => {
    assert.ok(!url.includes('token='));
    assert.equal(options.headers.Authorization, 'Firebase test-id-token');
    if (++requests === 1) throw new TypeError('Failed to fetch');
    return new Response(new Blob(['photo'], { type: 'image/png' }));
  });
  const url = await service.loadPrivateImage({ userId: 'alice', imageUrl: legacy }, user);
  assert.match(url, /^blob:/);
  assert.equal(requests, 2);
  service.clearPrivateImages();
});

test('response cleanup failure cannot turn a permission denial into a retry', async () => {
  let requests = 0;
  const { service, user } = setup(async () => {
    requests++;
    return { ok: false, status: 403, body: { cancel: async () => { throw new TypeError('cleanup failed'); } } };
  });
  await assert.rejects(service.loadPrivateImage({ userId: 'alice', imageUrl: legacy }, user), error => error.status === 403);
  assert.equal(requests, 1);
});

test('retries are bounded and never fall back to the old shared URL', async () => {
  let requests = 0;
  const { service, user } = setup(async url => {
    assert.ok(!url.includes('token='));
    requests++;
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(service.loadPrivateImage({ userId: 'alice', imageUrl: legacy }, user));
  assert.equal(requests, 3);
});

test('logout after a failed request prevents any retry or image display', async () => {
  let requests = 0;
  const context = setup(async () => {
    requests++;
    context.auth.currentUser = null;
    throw new TypeError('Failed to fetch');
  });
  assert.equal(await context.service.loadPrivateImage({ userId: 'alice', imageUrl: legacy }, context.user), null);
  assert.equal(requests, 1);
});

test('new uploads return an owner path, never a bearer download URL', async () => {
  const { service, user } = setup();
  service.storage = { ref(path) {
    return { put() { return { cancel() {}, snapshot: { ref: {
      fullPath: path, getDownloadURL() { throw new Error('public URL must not be issued'); }
    } }, on(event, progress, failure, success) { success(); } }; } };
  } };
  const result = await service.uploadToFirebase({ currentUser: user, file: { name: 'photo.jpg' } });
  assert.match(result || '', /^gs:\/\/memory-fragments\.firebasestorage\.app\/memories\/alice\//);
});

test('owner can still view raster base64 stored in the legacy imageUrl field', async () => {
  const { service, user } = setup(fetch);
  const url = await service.loadPrivateImage({ userId: 'alice', imageUrl: 'data:image/png;base64,cGhvdG8=' }, user);
  assert.match(url || '', /^blob:/);
  assert.equal(await (await fetch(url)).text(), 'photo');
  service.clearPrivateImages();
});
