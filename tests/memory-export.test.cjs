const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

function setup(t) {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
    url: 'https://www.memory-fragments.com/', runScripts: 'outside-only'
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  const auth = { currentUser: { uid: 'alice' }, onAuthStateChanged() {} };
  w.firebase = { initializeApp() {}, auth: () => auth, storage: () => ({}), firestore: () => ({}), functions: () => ({}) };
  w.Stripe = () => ({});
  w.fetch = async () => { throw new Error('Unexpected network'); };
  const blobs = [], downloads = [], revoked = [], timers = [];
  w.Blob = Blob;
  w.URL.createObjectURL = blob => { blobs.push(blob); return `blob:export-${blobs.length}`; };
  w.URL.revokeObjectURL = url => revoked.push(url);
  w.HTMLAnchorElement.prototype.click = function () { downloads.push({ name: this.download, url: this.href }); };
  w.setTimeout = fn => { timers.push(fn); return timers.length; };
  w.clearTimeout = () => {};
  const context = dom.getInternalVMContext();
  for (const name of ['memory-repository', 'memory-service', 'premium-service', 'image-service', 'location-service']) {
    vm.runInContext(fs.readFileSync(`js/app/services/${name}.js`, 'utf8'), context);
  }
  vm.runInContext([...w.document.querySelectorAll('script:not([src])')].at(-1).textContent, context);
  w.onload = null;
  const run = code => vm.runInContext(code, context);
  run('currentUser = auth.currentUser;');
  function records(values) {
    w.testRecords = values.map((value, i) => ({id: `diary-${i}`, userId: 'alice', title: '日記',
      content: '日本語の本文\n二行目', category: '日常', tags: ['テスト'], ...value}));
    run('memories = window.testRecords;');
  }
  return { w, run, records, blobs, downloads, revoked, timers, auth,
    status: () => w.document.getElementById('status').textContent };
}

for (const [format, extension] of [['HTML','html'], ['CSV','csv'], ['JSON','json'], ['Text','txt']]) {
  test(`${format} exports ISO diary dates without errors and without changing the source`, async t => {
    const f = setup(t);
    f.records([{createdAt:'2026-09-21T16:00:00.000Z'}]);
    const before = JSON.stringify(f.w.testRecords);
    assert.doesNotThrow(() => f.run(`exportTo${format}()`));
    assert.equal(f.downloads.length, 1);
    assert.ok(f.downloads[0].name.endsWith('.'+extension));
    const content = await f.blobs[0].text();
    if (format === 'JSON') {
      assert.equal(JSON.parse(content).memories[0].createdAt, '2026-09-21T16:00:00.000Z');
    } else {
      assert.match(content, /2026\/9\/22/);
    }
    assert.ok(!content.includes('Invalid Date'));
    assert.equal(JSON.stringify(f.w.testRecords), before);
  });
}

test('JSON accepts legacy timestamps and missing dates without inventing or losing dates', async t => {
  const f = setup(t);
  f.records([
    {createdAt:{seconds:0,nanoseconds:500000000}},
    {createdAt:{_seconds:0,_nanoseconds:0}},
    {createdAt:new Date('2026-09-21T16:00:00Z')},
    {createdAt:{toDate: () => new Date('2026-09-21T16:00:00Z')}},
    {createdAt:null}, {createdAt:'not-a-date'}, {createdAt:{}},
    {createdAt:'2026-02-30'}, {createdAt:0}
  ]);
  assert.doesNotThrow(() => f.run('exportToJSON()'));
  assert.deepEqual(JSON.parse(await f.blobs[0].text()).memories.map(m=>m.createdAt), [
    '1970-01-01T00:00:00.500Z','1970-01-01T00:00:00.000Z',
    '2026-09-21T16:00:00.000Z','2026-09-21T16:00:00.000Z',null,null,null,null,
    '1970-01-01T00:00:00.000Z'
  ]);
});

test('HTML treats diary markup as text, preserving line breaks without executable content', async t => {
  const f = setup(t);
  f.records([{createdAt:'2026-09-22',title:'<img src=x onerror=alert(1)>',
    content:'<script>alert(1)</script>\n続き & 末尾',category:'<b>仕事</b>',tags:['<svg onload=alert(1)>']}]);
  f.run('exportToHTML()');
  const output = new JSDOM(await f.blobs[0].text());
  assert.equal(output.window.document.querySelectorAll('script,img,svg').length,0);
  assert.match(output.window.document.body.textContent, /<script>alert\(1\)<\/script>/);
  assert.equal(output.window.document.querySelectorAll('.memory-content br').length,1);
  output.window.close();
});

function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i=0; i<text.length; i++) {
    const c=text[i];
    if(c==='"') { if(quoted && text[i+1]==='"') {cell+='"';i++;} else quoted=!quoted; }
    else if(c===','&&!quoted) {row.push(cell);cell='';}
    else if((c==='\r'||c==='\n')&&!quoted) {
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(cell);rows.push(row);row=[];cell='';
    } else cell+=c;
  }
  if(cell||row.length) {row.push(cell);rows.push(row);}
  return rows;
}

test('CSV keeps Japanese, commas, quotes and CR/LF inside cells and neutralizes formulas', async t => {
  const f = setup(t);
  f.records([{createdAt:'2026-09-22',title:'日本語,"見出し"',content:'一行目\r二行目\n三行目',category:'=1+1',tags:['@SUM(1)']}]);
  f.run('exportToCSV()');
  const bytes = Buffer.from(await f.blobs[0].arrayBuffer());
  assert.equal(bytes.subarray(0,3).toString('hex'),'efbbbf');
  const rows = parseCSV(bytes.toString('utf8').slice(1));
  assert.deepEqual(rows[1],['日本語,"見出し"','一行目\r二行目\n三行目',"'=1+1","'@SUM(1)",'2026/9/22']);
});

test('export errors are reported without clearing drafts or claiming a file was created', t => {
  const f = setup(t);
  f.records([{createdAt:'2026-09-22'}]);
  f.w.document.getElementById('content').value='残す下書き';
  f.w.URL.createObjectURL=()=>{throw new Error('Download failure');};
  assert.doesNotThrow(()=>f.run('exportToText()'));
  assert.match(f.status(),/書き出し.*できません|書き出し.*失敗/);
  assert.equal(f.w.document.getElementById('content').value,'残す下書き');
  assert.equal(f.downloads.length,0);
});

test('downloads release their object URLs and temporary anchors', t => {
  const f = setup(t);
  f.records([{createdAt:'2026-09-22'}]);
  f.run('exportToText()');
  assert.equal(f.w.document.querySelectorAll('a[download]').length,0);
  for(const timer of f.timers)timer();
  assert.deepEqual(f.revoked,['blob:export-1']);
});

test('export includes only the signed-in owner and never exports after logout', async t => {
  const f = setup(t);
  f.records([{createdAt:'2026-09-22'},{createdAt:'2026-09-22',userId:'bob',content:'他人の記憶'}]);
  f.run('exportToJSON()');
  assert.equal(JSON.parse(await f.blobs[0].text()).memories.length,1);
  f.auth.currentUser=null;
  f.run('exportToText()');
  assert.equal(f.downloads.length,1);
  assert.match(f.status(),/ログイン/);
});

test('display, statistics and date search accept mixed dates using the same Japan calendar day', t => {
  const f = setup(t);
  f.records([{title:'対象',createdAt:{seconds:1790006400,nanoseconds:0}},
    {title:'前日',createdAt:'2026-09-21T14:59:59Z'},
    {title:'境界',createdAt:'2026-09-21T15:00:00Z'},
    {title:'不明',createdAt:null}]);
  assert.doesNotThrow(()=>f.run('displayMemories()'));
  assert.ok(!f.w.document.getElementById('statsContent').textContent.includes('NaN'));
  f.w.document.getElementById('dateFrom').value='2026-09-22';
  f.w.document.getElementById('dateTo').value='2026-09-22';
  f.run('applyFilters()');
  const titles=[...f.w.document.querySelectorAll('#memoriesGrid h3')].map(el=>el.textContent);
  assert.ok(titles.includes('境界'));
  assert.ok(!titles.includes('前日'));
  assert.ok(!titles.includes('不明'));
});

test('empty diaries can be exported in all four formats', async t => {
  const f = setup(t);
  f.records([]);
  for (const format of ['HTML', 'CSV', 'JSON', 'Text']) f.run(`exportTo${format}()`);
  assert.equal(f.downloads.length, 4);
  assert.deepEqual(JSON.parse(await f.blobs[2].text()).memories, []);
  assert.equal(JSON.parse(await f.blobs[2].text()).totalMemories, 0);
});

test('legacy wall times, leap days, and offset timestamps have deterministic Japan dates', t => {
  const f = setup(t);
  assert.equal(f.run("parseMemoryDate('2026-09-22T00:30:00').toISOString()"), '2026-09-21T15:30:00.000Z');
  assert.equal(f.run("memoryDateKey('2024-02-29')"), '2024-02-29');
  assert.equal(f.run("memoryDateKey('0001-01-01T00:00:00Z')"), '0001-01-01');
  assert.equal(f.run("memoryDateKey('2026-09-30T23:30:00-07:00')"), '2026-10-01');
  for (const expression of ["'2026-02-29'", "'2026-13-01'", "true", "NaN", "Infinity", "{seconds:0,nanoseconds:1e9}", "{seconds:'10'}"]) {
    assert.equal(f.run(`parseMemoryDate(${expression})`), null);
  }
});

test('date-to-only filter excludes unknown dates and includes the final Japan minute', t => {
  const f = setup(t);
  f.records([{title:'当日',createdAt:'2026-09-22T14:59:59Z'},
    {title:'翌日',createdAt:'2026-09-22T15:00:00Z'}, {title:'不明',createdAt:null}]);
  f.w.document.getElementById('dateTo').value='2026-09-22';
  f.run('applyFilters()');
  const titles=[...f.w.document.querySelectorAll('#memoriesGrid h3')].map(el=>el.textContent);
  assert.deepEqual(titles,['当日']);
});

test('a click failure cleans up the temporary download and leaves a visible error', t => {
  const f = setup(t);
  f.records([{createdAt:'2026-09-22'}]);
  f.w.HTMLAnchorElement.prototype.click=()=>{throw new Error('Blocked click');};
  assert.doesNotThrow(()=>f.run('exportToJSON()'));
  assert.match(f.status(),/書き出しに失敗/);
  assert.equal(f.w.document.querySelectorAll('a[download]').length,0);
  for(const timer of f.timers)timer();
  assert.deepEqual(f.revoked,['blob:export-1']);
});
