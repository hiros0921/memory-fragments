const { test, before, after } = require('node:test');
const { readFileSync } = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

// All requests go to an isolated demo emulator, never the production bucket.
let env;
const image = Buffer.from('synthetic-image-data');
const metadata = { contentType: 'image/jpeg' };
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-memory-fragments',
    storage: { host: '127.0.0.1', port: 9299, rules: readFileSync('storage.rules', 'utf8') }
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const path of ['memories/alice/photo.jpg', 'images/alice/photo.jpg', 'profiles/alice/photo.jpg', 'shared/old-link/photo.jpg']) {
      await ctx.storage().ref(path).put(image, metadata);
    }
  });
});
after(async () => { if (env) await env.cleanup(); });

for (const folder of ['memories', 'images', 'profiles']) {
  test(`${folder}: owner can read existing photos`, async () => {
    await assertSucceeds(env.authenticatedContext('alice').storage().ref(`${folder}/alice/photo.jpg`).getMetadata());
  });
  for (const [name, context] of [
    ['another user', () => env.authenticatedContext('bob')],
    ['signed-out visitor', () => env.unauthenticatedContext()]
  ]) {
    test(`${folder}: ${name} cannot read owner photos`, async () => {
      await assertFails(context().storage().ref(`${folder}/alice/photo.jpg`).getMetadata());
    });
    test(`${folder}: ${name} cannot enumerate owner photos`, async () => {
      await assertFails(context().storage().ref(`${folder}/alice`).listAll());
    });
    test(`${folder}: ${name} cannot overwrite owner photos`, async () => {
      await assertFails(context().storage().ref(`${folder}/alice/photo.jpg`).put(image, metadata));
    });
    test(`${folder}: ${name} cannot delete owner photos`, async () => {
      await assertFails(context().storage().ref(`${folder}/alice/photo.jpg`).delete());
    });
  }
  test(`${folder}: owner can upload, replace and delete their photo`, async () => {
    const ref = env.authenticatedContext('alice').storage().ref(`${folder}/alice/lifecycle.jpg`);
    await assertSucceeds(ref.put(image, metadata));
    await assertSucceeds(ref.put(Buffer.from('replacement-image'), metadata));
    await assertSucceeds(ref.delete());
  });
  test(`${folder}: owner cannot upload non-image files`, async () => {
    await assertFails(env.authenticatedContext('alice').storage().ref(`${folder}/alice/not-image.txt`).put(image, { contentType: 'text/plain' }));
  });
  test(`${folder}: owner cannot exceed the image size limit`, async () => {
    const limit = (folder === 'profiles' ? 5 : 10) * 1024 * 1024;
    await assertFails(env.authenticatedContext('alice').storage().ref(`${folder}/alice/large.jpg`).put(Buffer.alloc(limit), metadata));
  });
}

for (const [name, context] of [
  ['signed-in user', () => env.authenticatedContext('alice')],
  ['signed-out visitor', () => env.unauthenticatedContext()]
]) {
  test(`retired shared folder: ${name} cannot read`, async () => {
    await assertFails(context().storage().ref('shared/old-link/photo.jpg').getMetadata());
  });
  test(`retired shared folder: ${name} cannot write`, async () => {
    await assertFails(context().storage().ref('shared/old-link/new.jpg').put(image, metadata));
  });
}
test('unknown folders remain inaccessible', async () => {
  await assertFails(env.authenticatedContext('alice').storage().ref('unknown/alice/photo.jpg').put(image, metadata));
});

test('private image transport downloads bytes through authenticated Storage rules', async () => {
  const vm = require('node:vm');
  const { createMockUserToken } = require('@firebase/util');
  const window = {};
  vm.runInNewContext(readFileSync('js/app/services/image-service.js', 'utf8'),
    { window, URL, Blob, AbortController, setTimeout, clearTimeout, console });
  const user = { uid: 'alice', getIdToken: async () => createMockUserToken({ sub: 'alice' }, 'demo-memory-fragments') };
  const service = new window.AppServices.ImageService({ storage: {}, auth: { currentUser: user },
    bucket: 'demo-memory-fragments',
    fetchImpl: (url, options) => fetch(url.replace('https://firebasestorage.googleapis.com', 'http://127.0.0.1:9299'), options)
  });
  const memory = { userId: 'alice', imageUrl: 'gs://demo-memory-fragments/memories/alice/photo.jpg' };
  const url = await service.loadPrivateImage(memory, user);
  const assertBytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  require('node:assert/strict').deepEqual(assertBytes, image);
  service.clearPrivateImages();
  // Client owner checks cannot grant access: the actual token is checked by the emulator.
  user.getIdToken = async () => createMockUserToken({ sub: 'bob' }, 'demo-memory-fragments');
  await require('node:assert/strict').rejects(service.loadPrivateImage(memory, user));
});
