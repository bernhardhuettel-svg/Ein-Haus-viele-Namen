// Local-only checks: no Firebase connection, no PayPal request, synthetic data only.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const K=require('./betreiber-kern.js');
const D=require('./operator-data.js');
const id='ent_000000000000000000000001';
const at='2026-10-22T10:00:00.000Z';
const input={transactionId:'TEST-PAYMENT-001',confirmedAmountCents:2599,paymentDate:'2026-10-22',privateMatchName:'PRIVATE-TEST',manualConfirmed:true};
const register=(overrides={})=>K.registerPayment(K.emptyState(),{...input,...overrides},at,{ledgerIdFactory:()=>id});
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const source=html.slice(html.indexOf('const HausCore ='),html.indexOf('const FIREBASE_ACTIVE='));
const ctx={};vm.runInNewContext(source+'\nglobalThis.api={HausCore,CONFIG,evaluatePaymentStart,evaluateFirebaseStart};',ctx);
const H=ctx.api;

test('published switches still prevent payments and public reads',()=>{
 assert.equal(H.evaluatePaymentStart(H.CONFIG.paymentsEnabled,H.CONFIG.startChecks).active,false);
 assert.equal(H.evaluateFirebaseStart(H.CONFIG.firebaseEnabled,H.CONFIG.startChecks).active,false);
});
test('every start check is required even when the main switch is enabled',()=>{
 const checks=Object.fromEntries(Object.keys(H.CONFIG.startChecks).map(k=>[k,true]));
 assert.equal(H.evaluatePaymentStart(true,checks).active,true);
 for(const k of Object.keys(checks))assert.equal(H.evaluatePaymentStart(true,{...checks,[k]:false}).active,false,k);
 assert.equal(H.evaluatePaymentStart(false,checks).active,false);
});
test('PayPal URL carries amount and EUR, never private name or reference',()=>{
 assert.equal(H.HausCore.paypal(2599),'https://paypal.me/bernhardhuettel/25.99EUR');
 for(const n of [0,99,1000001,NaN,Infinity,125.5])assert.throws(()=>H.HausCore.paypal(n));
});
test('German cent input is exact; malformed amounts are rejected',()=>{
 assert.equal(D.parseCents('25,99'),2599);assert.equal(D.parseCents('25.99'),2599);
 for(const v of ['0','-1','1,001','1e3','Infinity','9007199254740992'])assert.throws(()=>D.parseCents(v));
});
test('a click or unconfirmed payment cannot create a ledger entry',()=>{
 assert.throws(()=>register({manualConfirmed:false}));
});
test('invalid calendar dates and unsafe cent integers are rejected',()=>{
 for(const date of ['2026-02-30','2026-02-29','2026-04-31','2026-13-01'])assert.throws(()=>register({paymentDate:date}));
 assert.doesNotThrow(()=>register({paymentDate:'2024-02-29'}));
 assert.throws(()=>register({confirmedAmountCents:Number.MAX_SAFE_INTEGER+1}));
});
test('duplicate reference cannot count twice, including whitespace/case changes',()=>{
 const s=register();assert.throws(()=>K.registerPayment(s,{...input,transactionId:' test-payment-001 '},at,{ledgerIdFactory:()=> 'ent_000000000000000000000002'}));
 assert.equal(K.publicSnapshot(s,at).website.confirmedTotalCents,2599);
});
test('payment remains anonymous; public snapshot excludes private fields',()=>{
 const p=K.publicSnapshot(register(),at);assert.equal(p.publicSupporters.length,0);
 assert.equal(JSON.stringify(p).includes('PRIVATE-TEST'),false);
 assert.equal(JSON.stringify(p).includes('TEST-PAYMENT-001'),false);
});
test('documented consent publishes only permitted fields; withdrawal removes name',()=>{
 let s=register();assert.throws(()=>K.grantConsent(s,id,{displayName:'Testname',documented:false},at));
 s=K.grantConsent(s,id,{displayName:'Testname',wish:'TEST',documented:true},at);
 assert.deepEqual(Object.keys(K.publicSnapshot(s,at).publicSupporters[0]).sort(),['displayName','publicApproved','updatedAt','wish']);
 s=K.revokeConsent(s,id,'TEST withdrawal',at);
 assert.equal(K.publicSnapshot(s,at).publicSupporters.length,0);
 assert.equal(K.publicSnapshot(s,at).website.confirmedTotalCents,2599);
});
test('partial/full recorded refund updates amount and count; over-refund rejected',()=>{
 let s=register();assert.throws(()=>K.recordRefund(s,id,2600,'TEST',at));
 s=K.recordRefund(s,id,599,'TEST',at);assert.equal(K.publicSnapshot(s,at).website.confirmedTotalCents,2000);
 s=K.recordRefund(s,id,2000,'TEST',at);assert.equal(K.publicSnapshot(s,at).website.confirmedPaymentCount,0);
 assert.equal(K.publicSnapshot(s,at).website.confirmedTotalCents,0);
});
