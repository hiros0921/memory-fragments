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
