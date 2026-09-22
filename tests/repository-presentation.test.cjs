const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('portfolio screenshots are valid non-empty PNG files', () => {
  for (const image of [
    'docs/images/public-landing-desktop.png',
    'docs/images/public-demo-mobile.png'
  ]) {
    const data = fs.readFileSync(image);
    assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(data.length > 20_000, `${image} must contain a readable screenshot`);
  }
});

test('README embeds at least two existing local screenshots', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  const localImages = [...readme.matchAll(/!\[[^\]]*\]\((docs\/images\/[^)]+\.png)\)/g)]
    .map(([, image]) => image);

  assert.ok(localImages.length >= 2, 'README must show desktop and mobile screenshots');
  for (const image of localImages) {
    assert.ok(fs.existsSync(image), `README image link must resolve: ${image}`);
  }
});
