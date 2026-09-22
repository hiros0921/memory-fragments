const {test, before, beforeEach, after} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {initializeTestEnvironment, assertFails, assertSucceeds} = require('@firebase/rules-unit-testing');
const {doc, setDoc, updateDoc, deleteDoc, getDoc, deleteField, serverTimestamp} = require('firebase/firestore');

let env;
const protectedValues = {
  isPremium:true, plan:'premium', maxMemories:999999, subscriptionStatus:'active',
  stripeCustomerId:'cus_fake', stripeSubscriptionId:'sub_fake',
  premiumStartDate:'2026-09-22', premiumEndDate:'2099-01-01'
};
const original = {isPremium:false, plan:'free', maxMemories:50, subscriptionStatus:'inactive',
  stripeCustomerId:'cus_original', stripeSubscriptionId:'sub_original',
  premiumStartDate:null, premiumEndDate:null, displayName:'Original'};
before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-memory-fragments',
    firestore:{host:'127.0.0.1',port:8288,rules:readFileSync('firestore.rules','utf8')}});
});
beforeEach(async()=>{
  await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'users/alice'),original);
    await setDoc(doc(ctx.firestore(),'users/legacy'),{displayName:'Legacy'});
    await setDoc(doc(ctx.firestore(),'subscriptions/alice'),{status:'inactive'});
  });
});
after(async()=>{if(env)await env.cleanup();});
const ownerRef = ()=>doc(env.authenticatedContext('alice').firestore(),'users/alice');

for(const [key,value] of Object.entries(protectedValues)) {
  test(`client cannot change billing field ${key}`,async()=>{
    await assertFails(updateDoc(ownerRef(),{[key]:value}));
  });
  test(`client cannot remove billing field ${key}`,async()=>{
    await assertFails(updateDoc(ownerRef(),{[key]:deleteField()}));
  });
  test(`new profile cannot seed billing field ${key}`,async()=>{
    const uid=`new-${key}`;
    await assertFails(setDoc(doc(env.authenticatedContext(uid).firestore(),`users/${uid}`),{[key]:value}));
  });
}
test('client cannot delete or replace the parent profile to erase billing',async()=>{
  await assertFails(deleteDoc(ownerRef()));
  await assertFails(setDoc(ownerRef(),{displayName:'Replace'}));
});
test('legacy profile cannot gain paid state',async()=>{
  await assertFails(updateDoc(doc(env.authenticatedContext('legacy').firestore(),'users/legacy'),{isPremium:true}));
});
test('new free profile can be created without payment fields',async()=>{
  const ref=doc(env.authenticatedContext('new-free').firestore(),'users/new-free');
  await assertSucceeds(setDoc(ref,{createdAt:serverTimestamp(),displayName:'New'}));
  assert.equal((await getDoc(ref)).data().isPremium,undefined);
});
test('owner can read profile and update ordinary profile fields without changing billing',async()=>{
  await assertSucceeds(updateDoc(ownerRef(),{displayName:'Updated',lastLoginAt:serverTimestamp()}));
  const data=(await assertSucceeds(getDoc(ownerRef()))).data();
  assert.equal(data.isPremium,false);
  assert.equal(data.stripeCustomerId,'cus_original');
  assert.equal(data.displayName,'Updated');
});
test('first-login profile merge preserves a concurrent server premium grant',async()=>{
  const uid='concurrent-login';
  const ref=doc(env.authenticatedContext(uid).firestore(),`users/${uid}`);
  assert.equal((await getDoc(ref)).exists(),false);
  await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),`users/${uid}`),protectedValues);
  });
  await assertSucceeds(setDoc(ref,{createdAt:serverTimestamp()},{merge:true}));
  const data=(await getDoc(ref)).data();
  for(const [key,value] of Object.entries(protectedValues)) assert.equal(data[key],value);
});
test('another account and signed-out visitors cannot access owner profile',async()=>{
  for(const ctx of [env.authenticatedContext('bob'),env.unauthenticatedContext()]) {
    const ref=doc(ctx.firestore(),'users/alice');
    await assertFails(getDoc(ref));
    await assertFails(updateDoc(ref,{displayName:'Attacker'}));
    await assertFails(deleteDoc(ref));
  }
});
test('subscription records remain server-write-only',async()=>{
  const ref=doc(env.authenticatedContext('alice').firestore(),'subscriptions/alice');
  await assertSucceeds(getDoc(ref));
  await assertFails(setDoc(ref,{status:'active'}));
  await assertFails(deleteDoc(ref));
});
test('owner diary CRUD remains allowed even without a parent profile',async()=>{
  const db=env.authenticatedContext('diary-only').firestore();
  const ref=doc(db,'users/diary-only/memories/test');
  await assertSucceeds(setDoc(ref,{title:'Diary',content:'Private',userId:'diary-only'}));
  await assertSucceeds(updateDoc(ref,{content:'Edited'}));
  assert.equal((await assertSucceeds(getDoc(ref))).data().content,'Edited');
  await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(),'users/diary-only/memories/test')));
  await assertSucceeds(deleteDoc(ref));
});
test('trusted server can still maintain billing fields',async()=>{
  await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'users/server-maintained'),protectedValues);
  });
  const data=(await getDoc(doc(env.authenticatedContext('server-maintained').firestore(),'users/server-maintained'))).data();
  assert.equal(data.isPremium,true);
  assert.equal(data.stripeSubscriptionId,'sub_fake');
});
