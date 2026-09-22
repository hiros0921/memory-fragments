const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');

function setup(t,{query='',profile={isPremium:false},exists=true,readError=false}={}) {
  const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://www.memory-fragments.com/'+query,runScripts:'outside-only'});
  t.after(()=>dom.window.close());
  const w=dom.window, writes=[], notices=[];
  const auth={currentUser:{uid:'alice',email:'alice@example.invalid'},onAuthStateChanged(fn){this.callback=fn;}};
  let finish;
  const db={collection(name){assert.equal(name,'users');return {doc(uid){return {
    async get(){if(readError)throw Error('Offline');return {exists,data:()=>profile};},
    async set(data,options){writes.push({uid,data,options});},async update(data){writes.push({uid,data});}
  };}};}};
  w.firebase={initializeApp(){},auth:()=>auth,storage:()=>({}),firestore:()=>db,functions:()=>({})};
  w.firebase.firestore.FieldValue={serverTimestamp:()=>({timestamp:true})};
  w.Stripe=()=>({});
  w.fetch=async()=>{throw Error('Unexpected network');};
  w.Toast={success:m=>notices.push({type:'success',m}),info:m=>notices.push({type:'info',m}),error:m=>notices.push({type:'error',m})};
  const ctx=dom.getInternalVMContext();
  for(const name of ['memory-repository','memory-service','premium-service','image-service','location-service'])
    vm.runInContext(fs.readFileSync(`js/app/services/${name}.js`,'utf8'),ctx);
  vm.runInContext([...w.document.querySelectorAll('script:not([src])')].at(-1).textContent,ctx);
  w.onload=null;
  const run=s=>vm.runInContext(s,ctx);
  run('currentUser=auth.currentUser;');
  return {w,run,writes,notices,auth,
    pauseRead(){db.collection=()=>({doc:()=>({get:()=>new Promise(r=>{finish=r;})})});},
    finishRead(){finish({exists:true,data:()=>({isPremium:true})});}};
}

test('a success URL never writes billing state or announces an unverified upgrade',async t=>{
  const f=setup(t,{query:'?success=true&id=diary#detail'});
  f.run('checkPaymentResult()');
  await Promise.resolve();
  assert.equal(f.writes.length,0);
  assert.equal(f.run('isPremium'),false);
  assert.equal(f.notices.some(n=>n.type==='success'),false);
  assert.equal(new URL(f.w.location.href).searchParams.get('success'),null);
  assert.equal(new URL(f.w.location.href).searchParams.get('id'),'diary');
  assert.equal(f.w.location.hash,'#detail');
});
test('new user defaults to free and initializes only a merge-safe non-billing profile',async t=>{
  const f=setup(t,{exists:false});
  await f.run("checkPremiumStatus('alice')");
  assert.equal(f.run('isPremium'),false);
  assert.equal(f.writes.length,1);
  assert.deepEqual(Object.keys(f.writes[0].data),['createdAt']);
  assert.equal(f.writes[0].options.merge,true);
});
test('only a boolean server premium value enables paid UI',async t=>{
  const f=setup(t,{profile:{isPremium:'false'}});
  await f.run("checkPremiumStatus('alice')");
  assert.equal(f.run('isPremium'),false);
});
test('existing server-paid status remains readable without writes',async t=>{
  const f=setup(t,{profile:{isPremium:true}});
  await f.run("checkPremiumStatus('alice')");
  assert.equal(f.run('isPremium'),true);
  assert.equal(f.writes.length,0);
});
test('failed status read does not grant premium or write fallback state',async t=>{
  const f=setup(t,{readError:true});
  await f.run("checkPremiumStatus('alice')");
  assert.equal(f.run('isPremium'),false);
  assert.equal(f.writes.length,0);
});
test('delayed old-account status cannot grant premium to a new account',async t=>{
  const f=setup(t);f.pauseRead();
  const pending=f.run("checkPremiumStatus('alice')");
  f.auth.currentUser={uid:'bob'}; f.run('currentUser=auth.currentUser;');
  f.finishRead();await pending;
  assert.equal(f.run('isPremium'),false);
});
test('logout clears the in-memory paid state',t=>{
  const f=setup(t);f.run('isPremium=true;');
  f.auth.currentUser=null;f.auth.callback(null);
  assert.equal(f.run('isPremium'),false);
});
