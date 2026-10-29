const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');const T=require('./traffic-core.js');
test('UTC boundary and missing days',()=>{const now=Date.parse('2026-10-28T12:00Z'),day=Number(T.dayId(now));assert.equal(Number(T.dayId(Date.parse('2026-10-29T00:00Z'))),day+1);const r=T.summarize([{day,count:2000}],now);assert.equal(r.total,2000);assert.equal(r.days.length,30);assert.equal(r.days[0].count,null);assert.equal(r.capped,true);assert.equal(T.summarize([],now).today,null);});
test('commit has only day and increment, no identity',()=>{const c=T.commit('hausprojekt-4aa29',0);assert.deepEqual(c.writes[0].update.fields,{day:{integerValue:'0'}});assert.deepEqual(c.writes[0].updateTransforms,[{fieldPath:'count',increment:{integerValue:'1'}}]);assert.throws(()=>T.commit('evil/path'));});
function client(enabled=true,fail=false){const nodes={};for(const id of ['trafficConsent','trafficAllow','trafficDecline','trafficStatus'])nodes[id]={hidden:true,disabled:false,textContent:''};let calls=[];const context={window:{HOUSE_TRAFFIC_CONFIG:{enabled,project:'hausprojekt-4aa29'},HouseTraffic:T},location:{origin:'https://bernhardhuettel-svg.github.io',pathname:'/Ein-Haus-viele-Namen/'},document:{getElementById:id=>nodes[id]},AbortSignal,fetch:async(...args)=>{calls.push(args);if(fail)throw Error('offline');return {ok:true};}};vm.runInNewContext(fs.readFileSync(__dirname+'/traffic-client.js','utf8'),context);return {nodes,calls};}
test('disabled and decline never send data',()=>{const off=client(false);assert.equal(off.nodes.trafficConsent.hidden,true);assert.equal(off.calls.length,0);const no=client();no.nodes.trafficDecline.onclick();assert.equal(no.calls.length,0);assert.equal(no.nodes.trafficConsent.hidden,true);});
test('consent sends once, without credentials or referrer',async()=>{const c=client();await c.nodes.trafficAllow.onclick();await c.nodes.trafficAllow.onclick();assert.equal(c.calls.length,1);assert.equal(c.calls[0][1].credentials,'omit');assert.equal(c.calls[0][1].referrerPolicy,'no-referrer');assert.match(c.nodes.trafficStatus.textContent,/wurde mitgezählt/);});
test('network failure never claims success or retries',async()=>{const c=client(true,true);await c.nodes.trafficAllow.onclick();await c.nodes.trafficAllow.onclick();assert.equal(c.calls.length,1);assert.match(c.nodes.trafficStatus.textContent,/nicht gezählt/);});

function partialClient({missing,core=true,origin='https://bernhardhuettel-svg.github.io',path='/Ein-Haus-viele-Namen/',response={ok:true}}={}){
 const nodes=Object.fromEntries(['trafficConsent','trafficAllow','trafficDecline','trafficStatus'].filter(id=>id!==missing).map(id=>[id,{hidden:true,disabled:false,textContent:''}]));
 const calls=[];
 vm.runInNewContext(fs.readFileSync(__dirname+'/traffic-client.js','utf8'),{window:{HOUSE_TRAFFIC_CONFIG:{enabled:true,project:'hausprojekt-4aa29'},HouseTraffic:core?T:undefined},location:{origin,pathname:path},document:{getElementById:id=>nodes[id]},AbortSignal,fetch:async(...args)=>{calls.push(args);return response;}});
 return {nodes,calls};
}
test('incomplete markup or failed core download leaves optional counter hidden without throwing',()=>{
 for(const missing of ['trafficAllow','trafficDecline','trafficStatus']){const c=partialClient({missing});assert.equal(c.nodes.trafficConsent.hidden,true);assert.equal(c.calls.length,0);}
 const c=partialClient({core:false});assert.equal(c.nodes.trafficConsent.hidden,true);assert.equal(c.calls.length,0);
 assert.doesNotThrow(()=>partialClient({missing:'trafficConsent'}));
});
test('preview origins and operator pages never initialize counting',()=>{
 for(const options of [{origin:'https://preview.invalid'},{path:'/Ein-Haus-viele-Namen/betreiber.html'}]){const c=partialClient(options);assert.equal(c.nodes.trafficConsent.hidden,true);assert.equal(c.nodes.trafficAllow.onclick,undefined);assert.equal(c.calls.length,0);}
});
test('HTTP rejection does not report success or retry',async()=>{
 const c=partialClient({response:{ok:false}});await c.nodes.trafficAllow.onclick();await c.nodes.trafficAllow.onclick();assert.equal(c.calls.length,1);assert.match(c.nodes.trafficStatus.textContent,/nicht gezählt/);
});
test('declining remains final even if an old allow handler is invoked',async()=>{
 const c=partialClient();const allow=c.nodes.trafficAllow.onclick;c.nodes.trafficDecline.onclick();await allow();assert.equal(c.calls.length,0);assert.equal(c.nodes.trafficConsent.hidden,true);
});
