// Administrative one-time migration. Never shipped in dist/ or run by the app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const BUCKET = 'memory-fragments.firebasestorage.app';

function revocationRequest(object) {
  assert.equal(object.bucket, BUCKET);
  assert.ok(object.name && object.generation && object.metageneration);
  return {
    path: `/storage/v1/b/${BUCKET}/o/${encodeURIComponent(object.name)}`,
    body: { metadata: { firebaseStorageDownloadTokens: null }, cacheControl: 'private, no-store' },
    queryParams: { ifGenerationMatch: object.generation, ifMetagenerationMatch: object.metageneration }
  };
}

function assertSameData(before, after) {
  for (const key of ['bucket', 'name', 'generation', 'size', 'crc32c']) assert.equal(after[key], before[key], `Content identity changed: ${key}`);
}

async function main() {
  const [mode, snapshotPath, limitArg] = process.argv.slice(2);
  assert.ok(['--snapshot', '--revoke', '--verify'].includes(mode), 'Choose --snapshot, --revoke or --verify');
  const base = process.env.FIREBASE_TOOLS_PATH;
  assert.ok(base, 'Set FIREBASE_TOOLS_PATH to the installed firebase-tools package');
  await require(base).projects.list({ nonInteractive: true });
  const { Client } = require(path.join(base, 'lib/apiv2'));
  const client = new Client({ urlPrefix: 'https://storage.googleapis.com' });
  const quiet = { skipLog: { body: true, resBody: true } };
  const objects = [];
  let pageToken;
  do {
    const result = await client.get(`/storage/v1/b/${BUCKET}/o`, { ...quiet, queryParams: pageToken ? { pageToken } : {} });
    objects.push(...result.body.items || []);
    pageToken = result.body.nextPageToken;
  } while (pageToken);

  if (mode === '--snapshot') {
    assert.equal(objects.length, 38, 'Review unexpected object count before migrating');
    objects.forEach(revocationRequest);
    // Outside repository and cloud-synced Desktop; credentials never enter published files.
    const parent = path.join(os.homedir(), 'Library/Application Support/MemoryFragments-security');
    fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
    const dir = fs.mkdtempSync(path.join(parent, 'photo-tokens-'));
    fs.chmodSync(dir, 0o700);
    const target = path.join(dir, 'metadata-before.json');
    fs.writeFileSync(target, JSON.stringify({ bucket: BUCKET, createdAt: new Date().toISOString(), objects }), { mode: 0o600, flag: 'wx' });
    assert.equal(JSON.parse(fs.readFileSync(target, 'utf8')).objects.length, 38);
    console.log(JSON.stringify({ snapshotPath: target, objects: objects.length, mode: '0600' }));
    return;
  }

  assert.ok(snapshotPath && path.isAbsolute(snapshotPath), 'Explicit absolute snapshot path required');
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  assert.equal(snapshot.bucket, BUCKET);
  assert.equal(snapshot.objects.length, 38);
  assert.equal(objects.length, snapshot.objects.length, 'Object set changed; review before continuing');
  const current = new Map(objects.map(object => [object.name, object]));
  for (const before of snapshot.objects) {
    const now = current.get(before.name);
    assert.ok(now, 'An original object is missing');
    assertSameData(before, now);
    if (now.metadata?.firebaseStorageDownloadTokens) {
      assert.equal(now.metageneration, before.metageneration, 'Concurrent metadata change; stop');
      assert.equal(now.metadata.firebaseStorageDownloadTokens, before.metadata?.firebaseStorageDownloadTokens, 'Concurrent token change; stop');
    }
  }

  const pending = snapshot.objects.filter(before => current.get(before.name).metadata?.firebaseStorageDownloadTokens);
  if (mode === '--verify') assert.equal(pending.length, 0, 'Revocation is incomplete');
  if (mode === '--revoke') {
    const limit = limitArg === undefined ? pending.length : Number(limitArg);
    assert.ok(Number.isInteger(limit) && limit >= 0 && limit <= pending.length);
    for (const before of pending.slice(0, limit)) {
      const request = revocationRequest(current.get(before.name));
      const result = await client.patch(request.path, request.body, { ...quiet, queryParams: request.queryParams });
      assertSameData(before, result.body);
      assert.ok(!result.body.metadata?.firebaseStorageDownloadTokens, 'Token removal not confirmed');
      assert.equal(result.body.cacheControl, 'private, no-store');
      for (const [key, value] of Object.entries(before.metadata || {})) {
        if (key !== 'firebaseStorageDownloadTokens') assert.equal(result.body.metadata?.[key], value, 'Unrelated metadata changed');
      }
      current.set(before.name, result.body);
    }
  }

  let rejectedTokens = 0;
  for (const before of snapshot.objects) {
    const now = current.get(before.name);
    if (now.metadata?.firebaseStorageDownloadTokens) continue;
    assert.equal(now.cacheControl, 'private, no-store');
    for (const token of (before.metadata?.firebaseStorageDownloadTokens || '').split(',').filter(Boolean)) {
      // No credentials are sent; check the exact old public link, without logging it.
      const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(before.name)}?alt=media&token=${encodeURIComponent(token)}`;
      const response = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000) });
      await response.body?.cancel();
      assert.ok([401, 403].includes(response.status), `Old URL not rejected: HTTP ${response.status}`);
      rejectedTokens++;
    }
  }
  if (mode === '--verify') {
    const expectedTokens = snapshot.objects.reduce((total, object) => total + (object.metadata?.firebaseStorageDownloadTokens || '').split(',').filter(Boolean).length, 0);
    assert.equal(rejectedTokens, expectedTokens, 'Not every old token was verified');
  }
  console.log(JSON.stringify({ objectsPreserved: current.size, revokedObjects: [...current.values()].filter(o => !o.metadata?.firebaseStorageDownloadTokens).length, rejectedOldTokens: rejectedTokens, remainingTokenObjects: [...current.values()].filter(o => o.metadata?.firebaseStorageDownloadTokens).length }));
}

module.exports = { revocationRequest, assertSameData };
if (require.main === module) main().catch(() => { console.error('Migration stopped; no further changes. Inspect metadata against the private snapshot. Details suppressed to protect credentials.'); process.exitCode = 1; });
