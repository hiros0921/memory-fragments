const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

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
  for (const privatePath of ['archive', 'docs', '.github', 'storage.rules',
    'firebase-debug.log', 'tests', 'node_modules', '.git']) {
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

test('published app loads no payment SDK or archived checkout reference',()=>{
  const {JSDOM}=require('jsdom');
  const {buildStatic}=require('../scripts/build-static.cjs');
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'memory-fragments-portfolio-'));
  buildStatic(output);
  const dom=new JSDOM(fs.readFileSync(path.join(output,'index.html'),'utf8'));
  try{
    const sources=[...dom.window.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'));
    assert.ok(sources.every(s=>!/stripe\.com|firebase-functions|checkout-reference/.test(s)));
    assert.equal(fs.existsSync(path.join(output,'examples/checkout-reference.js')),false);
    assert.equal(fs.existsSync(path.join(output,'functions/index.js')),false);
    assert.match(dom.window.document.body.textContent,/実績紹介用/);
    assert.match(dom.window.document.body.textContent,/新規課金の受付.*行っていません/);
  }finally{dom.window.close();}
});

test('emotion analysis output does not sell an upgrade',()=>{
  const vm=require('vm');
  const ctx=vm.createContext({console});
  vm.runInContext(fs.readFileSync('js/ai-emotion-analyzer.js','utf8'),ctx);
  const html=vm.runInContext("aiEmotionAnalyzer.createAnalysisUI(aiEmotionAnalyzer.performBasicAnalysis('今日は楽しくて嬉しい一日でした'))",ctx);
  assert.match(html,/AI感情分析/);
  assert.doesNotMatch(html,/アップグレード|購入/);
});

test('public landing explains the app and offers a login-free demo', () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'));
  try {
    const body = dom.window.document.body;
    assert.match(body.textContent, /日記と写真を記録/);
    assert.match(body.textContent, /本人認証付き写真表示/);
    assert.equal(body.querySelector('#startDemoLink').getAttribute('href'), '/?demo=true');
    assert.match(body.querySelector('#startDemoLink').textContent, /ログイン不要/);
  } finally {
    dom.window.close();
  }
});

test('public build includes only local demo code and three generated images', () => {
  const { buildStatic } = require('../scripts/build-static.cjs');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-fragments-demo-'));
  buildStatic(output);
  for (const asset of [
    'js/app/demo/demo-memory-store.js',
    'assets/demo/demo-sunset.png',
    'assets/demo/demo-cafe.png',
    'assets/demo/demo-goal.png'
  ]) {
    assert.ok(fs.statSync(path.join(output, asset)).size > 0, asset);
  }
  const source = fs.readFileSync(
    path.join(output, 'js/app/demo/demo-memory-store.js'),
    'utf8'
  );
  assert.doesNotMatch(source, /https?:\/\//);
});

test('Vercel upload rules include every public demo asset needed by the build', () => {
  const ignored = new Set(execFileSync('git', [
    'ls-files',
    '--cached',
    '--ignored',
    '--exclude-from=.vercelignore'
  ], { encoding: 'utf8' }).trim().split('\n').filter(Boolean));
  const requiredDemoAssets = [
    'js/app/demo/demo-memory-store.js',
    'assets/demo/demo-sunset.png',
    'assets/demo/demo-cafe.png',
    'assets/demo/demo-goal.png'
  ];
  assert.deepEqual(requiredDemoAssets.filter(asset => ignored.has(asset)), []);
});
