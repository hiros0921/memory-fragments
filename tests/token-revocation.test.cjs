const { test } = require('node:test');
const assert = require('node:assert/strict');
const { revocationRequest, assertSameData } = require('../scripts/revoke-photo-tokens.cjs');

const object = { bucket: 'memory-fragments.firebasestorage.app', name: 'memories/alice/photo.jpg', generation: '100', metageneration: '3', size: '123', crc32c: 'checksum', metadata: { firebaseStorageDownloadTokens: 'private-test-token', caption: 'unchanged' } };

test('revocation removes only the sharing token and disables caching with generation guards', () => {
  const request = revocationRequest(object);
  assert.deepEqual(request.body, { metadata: { firebaseStorageDownloadTokens: null }, cacheControl: 'private, no-store' });
  assert.deepEqual(request.queryParams, { ifGenerationMatch: '100', ifMetagenerationMatch: '3' });
  assert.ok(request.path.endsWith('memories%2Falice%2Fphoto.jpg'));
  assert.equal(object.metadata.caption, 'unchanged');
});

test('refuse another bucket or an incomplete snapshot', () => {
  assert.throws(() => revocationRequest({ ...object, bucket: 'other' }));
  assert.throws(() => revocationRequest({ ...object, metageneration: undefined }));
});

test('data integrity guard allows metadata changes but rejects replaced or changed content', () => {
  assert.doesNotThrow(() => assertSameData(object, { ...object, metageneration: '4' }));
  for (const key of ['name', 'bucket', 'generation', 'size', 'crc32c']) {
    assert.throws(() => assertSameData(object, { ...object, [key]: 'changed' }));
  }
});
