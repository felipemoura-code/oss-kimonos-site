import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('index.html','utf8');
const catalog=JSON.parse(readFileSync('catalogo.json','utf8'));
const code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(code,'Application script missing');
class FakeElement{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.dataset={};this.attrs={};this.children=[];this.handlers=new Map();this.parentElement=null;this.hidden=false;this.disabled=false;this.open=false;this.textContent='';this.value='';this.style={};this.className='';this.classList={toggle:(key,on)=>{this.toggled=this.toggled||{};this.toggled[key]=on;}};}
 addEventListener(type,cb){const a=this.handlers.get(type)||[];a.push(cb);this.handlers.set(type,a);}
 emit(type,extra={}){const e={type,target:this,preventDefault(){this.defaultPrevented=true;},...extra};for(const cb of this.handlers.get(type)||[])cb(e);return e;}
 click(){return this.emit('click');}
 append(...items){for(const x of items){if(x){this.children.push(x);x.parentElement=this;}}}
 replaceChildren(...items){this.children=[];this.append(...items);}
 setAttribute(key,val){this.attrs[key]=String(val);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=String(val);}
 removeAttribute(key){delete this.attrs[key];}
 getAttribute(key){return this.attrs[key]??null;}
 showModal(){this.open=true;}close(){this.open=false;}scrollIntoView(){this.wasScrolled=true;}
 matches(selector){const key=selector.match(/^\[data-([a-z-]+)\]$/)?.[1];if(key){const k=key.replace(/-([a-z])/g,(_,x)=>x.toUpperCase());return this.dataset[k]!==undefined;}return false;}
 closest(selector){let x=this;while(x){if(x.matches?.(selector))return x;x=x.parentElement;}return null;}
 querySelectorAll(selector){const out=[];const walk=(x)=>{for(const ch of x.children){if(ch.matches?.(selector))out.push(ch);walk(ch);}};walk(this);return out;}
}
function browser(){
 const ids=new Map(),selectorNodes=[];
 for(const m of html.matchAll(/<([a-z][\w-]*)([^>]*\sid="([^"]+)"[^>]*)>/gi)){
  const node=new FakeElement(m[1]);node.id=m[3];ids.set(m[3],node);
  for(const d of m[2].matchAll(/\b(data-[\w-]+)="([^"]+)"/g))node.setAttribute(d[1],d[2]);
 }
 for(const key of ['checkout-stage','stage-nav','back']){
  const rx=new RegExp('<([a-z][\\w-]*)([^>]*\\sdata-'+key+'="([^"]+)"[^>]*)>','gi');
  for(const m of html.matchAll(rx)){
   const id=m[2].match(/\bid="([^"]+)"/)?.[1];
   const el=(id?ids.get(id):null)||new FakeElement(m[1]);
   el.setAttribute('data-'+key,m[3]);selectorNodes.push(el);
  }
 }
 const filters=ids.get('filters');
 for(const m of html.matchAll(/<button[^>]*data-filter="([^"]+)"[^>]*>/g)){
  const btn=new FakeElement('button');btn.dataset.filter=m[1];filters.append(btn);
 }
 const document={
  getElementById(id){const v=ids.get(id);if(!v)throw Error('Missing DOM #'+id);return v;},
  createElement(tag){return new FakeElement(tag);},
  querySelectorAll(selector){return selectorNodes.filter(n=>n.matches(selector));},
  querySelector(selector){if(selector==='input[name="checkoutMethod"]:checked')return {value:'Pix'};return null;}
 };
 const storage=new Map(),popups=[];
 const localStorage={getItem(k){return storage.get(k)??null;},setItem(k,v){storage.set(k,String(v));}};
 const window={matchMedia(){return {matches:false};},open(...args){popups.push(args);}};
 const fetch=async u=>{if(u!=='/catalogo.json')throw Error('Network call blocked: '+u);return {ok:true,json:async()=>catalog};};
 return {ids,selectorNodes,document,localStorage,window,fetch,popups,storage};
}
async function boot(){
 const app=browser();
 vm.runInNewContext(code,{document:app.document,window:app.window,localStorage:app.localStorage,fetch:app.fetch,Date,Intl,console,encodeURIComponent},{filename:'OSS Store Lab',timeout:6000});
 await new Promise(resolve=>setImmediate(resolve));
 return app;
}
function addFirstProduct(app){
 const card=app.ids.get('products').children[0];
 const body=card.children.find(x=>x.className==='card-body');
 const buttons=body.children.find(x=>x.className==='card-actions');
 buttons.children.find(x=>x.className==='add').click();
}
test('page really boots, fetches official records and initializes checkout panes',async()=>{
 const app=await boot();
 assert.equal(app.ids.get('products').children.length,3);
 assert.equal(app.ids.get('catalogCount').textContent,'3 registros oficiais');
 assert.equal(app.ids.get('checkoutBagPanel').hidden,false);
 assert.equal(app.ids.get('checkoutDeliveryPanel').hidden,true);
 assert.equal(app.ids.get('checkoutNext').disabled,true);
 assert.equal(app.ids.get('checkoutHistoryList').children.length,1);
});
test('one coherent customer flow: add kimono, review bag, type CEP, preview Pix and finish without charge',async()=>{
 const app=await boot(),n=app.ids;
 addFirstProduct(app);
 assert.equal(n.get('bagCount').textContent,1);
 assert.equal(n.get('cartDialog').open,true);
 n.get('checkoutFromBag').click();
 assert.equal(n.get('cartDialog').open,false);
 assert.equal(n.get('checkoutItems').children.length,1);
 assert.equal(n.get('checkoutNext').disabled,false);
 n.get('checkoutNext').click();
 assert.equal(n.get('checkoutDeliveryPanel').hidden,false);
 n.get('checkoutCep').value='bad';
 n.get('checkoutDeliveryPanel').emit('submit');
 assert.match(n.get('checkoutDeliveryError').textContent,/CEP/);
 n.get('checkoutCep').value='13010-110';
 n.get('checkoutDeliveryType').value='Entrega a combinar';
 n.get('checkoutDeliveryPanel').emit('submit');
 assert.equal(n.get('checkoutPaymentPanel').hidden,false);
 n.get('checkoutFinish').click();
 assert.equal(n.get('checkoutDonePanel').hidden,false);
 assert.match(n.get('checkoutReceipt').children.map(x=>x.textContent).join(' '),/nenhum pagamento ou pedido real/i);
 assert.equal(n.get('bagCount').textContent,0);
 assert.equal(n.get('checkoutHistoryList').children.length,1);
 assert.ok(app.storage.has('oss-store-lab-journey-v2'));
 assert.equal(app.popups.length,0);
});
test('flow protects empty bag, allows back navigation and can reset local history',async()=>{
 const app=await boot(),n=app.ids;
 n.get('checkoutNext').click();
 assert.equal(n.get('checkoutDeliveryPanel').hidden,true);
 addFirstProduct(app);n.get('closeCart').click();
 n.get('checkoutNext').click();
 const back=app.selectorNodes.find(x=>x.dataset.back==='bag');
 back.click();assert.equal(n.get('checkoutBagPanel').hidden,false);
 n.get('checkoutClearHistory').click();
 assert.equal(n.get('checkoutHistoryList').children.length,1);
});
test('real consultative WhatsApp remains separate from the no-payment checkout',async()=>{
 const app=await boot(),n=app.ids;
 addFirstProduct(app);
 n.get('sendRequest').click();
 assert.equal(app.popups.length,1);
 assert.match(app.popups[0][0],/^https:\/\/wa\.me\/5519997121912/);
 assert.equal(n.get('checkoutDonePanel').hidden,true);
});
