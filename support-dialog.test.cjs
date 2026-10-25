// Runs the actual homepage dialog handlers against a minimal in-memory DOM.
// No network, browser account, production records or actual PayPal navigation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const code=html.slice(html.indexOf("const modal=$('info-dialog');"),html.indexOf("$('share-demo').addEventListener"));
function setup(active=false){
 const ids={};
 class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.checked=false;this.disabled=false;this.hidden=false;this.value='';this.textContent='';}
  set id(value){this._id=value;ids[value]=this;}get id(){return this._id;}
  append(...items){this.children.push(...items);}replaceChildren(){this.children=[];}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];if(k==='href')delete this.href;}
  addEventListener(k,fn){this.listeners[k]=fn;}focus(){this.focused=true;}scrollIntoView(){}select(){}
  fire(k){const event={prevented:false,preventDefault(){this.prevented=true;}};this.listeners[k]?.(event);return event;}
 }
 for(const id of ['info-dialog','dialog-content','support-button','close-dialog','publish-consent','display-name','wish']){ids[id]=new Element('div');ids[id].id=id;}
 ids['info-dialog'].hidden=true;
 const state={opens:0,paypalCalls:0};
 const context={document:{getElementById:id=>ids[id],createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})},$:id=>ids[id],PAYMENTS_ACTIVE:active,amount:25,euro:n=>n.toFixed(2)+' EUR',siteSettings:{},POLICY_VERSION:'TEST-POLICY',SUPPORT_POLICY:'TEST PURPOSE',crypto:{getRandomValues:a=>a.fill(++state.opens)},Uint8Array,window:{matchMedia:()=>({matches:true})},navigator:{clipboard:{writeText:async()=>{}}},HausCore:{paypal:cents=>{state.paypalCalls++;return 'https://paypal.invalid/'+cents;}}};
 // Any attempt to add external effects fails immediately, rather than reaching a real service.
 context.fetch=()=>{throw Error('Network forbidden');};
 vm.runInNewContext(code,context);
 return {ids,state};
}
test('preparation mode cannot create a payment link, code or consent transmission',()=>{
 const {ids,state}=setup();ids['display-name'].value='PRIVATE TEST';ids['publish-consent'].checked=true;
 ids['support-button'].fire('click');
 assert.equal(ids['info-dialog'].hidden,false);
 assert.equal(ids['paypal-go'],undefined);assert.equal(ids['payment-note'],undefined);
 assert.equal(state.opens,0);assert.equal(state.paypalCalls,0);
});
test('invalid amount button does not open any dialog',()=>{
 const {ids}=setup(true);ids['support-button'].disabled=true;ids['support-button'].fire('click');
 assert.equal(ids['info-dialog'].hidden,true);assert.equal(ids['paypal-go'],undefined);
});
test('enabled-path fixture requires fresh purpose acknowledgement; revocation removes URL',()=>{
 const {ids,state}=setup(true);ids['support-button'].fire('click');
 const a=ids['paypal-go'],ack=ids['support-ack'];
 assert.equal(a.href,undefined);assert.equal(a.fire('click').prevented,true);
 ack.checked=true;ack.fire('change');assert.equal(a.href,'https://paypal.invalid/2500');
 ack.checked=false;ack.fire('change');assert.equal(a.href,undefined);assert.equal(a.fire('click').prevented,true);
 assert.equal(state.paypalCalls,1);
});
test('closing and reopening resets acknowledgement and creates a fresh assignment code',()=>{
 const {ids}=setup(true);ids['support-button'].fire('click');const note=ids['payment-note'].value;
 ids['support-ack'].checked=true;ids['support-ack'].fire('change');
 ids['close-dialog'].fire('click');assert.equal(ids['info-dialog'].hidden,true);assert.equal(ids['support-button'].focused,true);
 ids['support-button'].fire('click');assert.equal(ids['support-ack'].checked,false);assert.equal(ids['paypal-go'].href,undefined);
 assert.notEqual(ids['payment-note'].value,note);
});
test('no name or wish enters the assignment note without optional consent',()=>{
 const {ids}=setup(true);ids['display-name'].value='PRIVATE TEST';ids['wish'].value='PRIVATE WISH';
 ids['support-button'].fire('click');assert(!ids['payment-note'].value.includes('PRIVATE'));
 ids['publish-consent'].checked=true;ids['support-button'].fire('click');assert(ids['payment-note'].value.includes('PRIVATE TEST'));
 ids['publish-consent'].checked=false;ids['support-button'].fire('click');assert(!ids['payment-note'].value.includes('PRIVATE'));
});
test('opening the external link neither confirms a payment nor calls a backend',()=>{
 const {ids}=setup(true);ids['support-button'].fire('click');ids['support-ack'].checked=true;ids['support-ack'].fire('change');
 const before=ids['dialog-content'].children.slice();assert.equal(ids['paypal-go'].fire('click').prevented,false);
 assert.deepEqual(ids['dialog-content'].children,before);
 // The payment target is the same tab: browser Back is navigation, not a payment callback.
 assert.equal(ids['paypal-go'].target,'_self');
});
