import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('index.html','utf8');
const catalog=JSON.parse(readFileSync('catalogo.json','utf8'));
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Inline application script missing');

class FakeElement {
 constructor(tag='div',doc=null) {
  this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.parentElement=null;
  this.style={};this.dataset={};this.attrs={};this.handlers=new Map();
  this.textContent='';this.value='';this.hidden=false;this.disabled=false;this.open=false;
 }
 append(...nodes){for(const n of nodes){if(!n)continue;this.children.push(n);n.parentElement=this;}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 addEventListener(type,cb){const list=this.handlers.get(type)||[];list.push(cb);this.handlers.set(type,list);}
 setAttribute(key,val){this.attrs[key]=String(val);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,v)=>v.toUpperCase())]=String(val);}
 getAttribute(key){return this.attrs[key]??null;}
 emit(type,params={}){
  const event={type,target:this,preventDefault(){this.defaultPrevented=true;},...params};
  for(const cb of this.handlers.get(type)||[])cb(event);
  return event;
 }
 click(){return this.emit('click');}
 showModal(){this.open=true;}close(){this.open=false;}
 scrollIntoView(){}
 matches(query){
  if(query==='[data-filter]')return this.dataset.filter!==undefined;
  if(query==='[data-stock-id]')return this.dataset.stockId!==undefined;
  if(query==='[data-order-approve]')return this.dataset.orderApprove!==undefined;
  if(query==='[data-order-cancel]')return this.dataset.orderCancel!==undefined;
  if(query==='[data-demo-open]')return this.dataset.demoOpen!==undefined;
  if(query==='[data-demo-panel]')return this.dataset.demoPanel!==undefined;
  return false;
 }
 closest(query){
  let n=this;while(n){if(n.matches?.(query))return n;n=n.parentElement;}return null;
 }
 querySelectorAll(query){
  const out=[];
  function descend(node){for(const child of node.children){if(child.matches?.(query))out.push(child);descend(child);}}
  descend(this);return out;
 }
}
function makeBrowser(){
 const nodes=new Map();
 const datasetNodes=[];
 for(const match of html.matchAll(/<([a-z][\w-]*)([^>]*\sid="([^"]+)"[^>]*)>/gi)){
  const el=new FakeElement(match[1],null);el.id=match[3];
  const raw=match[2];
  for(const d of raw.matchAll(/\b(data-[\w-]+)="([^"]+)"/g))el.setAttribute(d[1],d[2]);
  nodes.set(match[3],el);
 }
 for(const match of html.matchAll(/<([a-z][\w-]*)([^>]*\sdata-demo-open="([^"]+)"[^>]*)>/gi)){
  const el=new FakeElement(match[1]);el.dataset.demoOpen=match[3];datasetNodes.push(el);
 }
 for(const match of html.matchAll(/<([a-z][\w-]*)([^>]*\sdata-demo-panel="([^"]+)"[^>]*)>/gi)){
  const el=nodes.get(match[2].match(/\sid="([^"]+)"/)?.[1])||new FakeElement(match[1]);
  el.dataset.demoPanel=match[3];datasetNodes.push(el);
 }
 const filters=nodes.get('filters');
 for(const match of html.matchAll(/<button[^>]*data-filter="([^"]+)"[^>]*>/g)){
  const el=new FakeElement('button');el.dataset.filter=match[1];filters.append(el);
 }
 const cart=nodes.get('cartDialog'),detail=nodes.get('productDialog');
 assert.ok(cart&&detail,'Dialogs not found in DOM');
 const document={
  getElementById(id){const el=nodes.get(id);if(!el)throw Error('Missing element #'+id);return el;},
  createElement(tag){return new FakeElement(tag,document);},
  querySelectorAll(query){
   if(query==='[data-demo-open]')return datasetNodes.filter(e=>e.dataset.demoOpen!==undefined);
   if(query==='[data-demo-panel]')return datasetNodes.filter(e=>e.dataset.demoPanel!==undefined);
   return [];
  },
  querySelector(query){
   if(query==='input[name="demoMethod"]:checked')return {value:'Pix'};
   return null;
  }
 };
 const store=new Map();
 const localStorage={
  getItem(k){return store.get(k)??null;},
  setItem(k,v){store.set(k,String(v));},
  removeItem(k){store.delete(k);}
 };
 const popup=[];
 const window={matchMedia(){return {matches:false};},open(...args){popup.push(args);}};
 const fetch=async(url)=>{
  if(url!=='/catalogo.json')throw Error('Unexpected backend request '+url);
  return {ok:true,json:async()=>catalog};
 };
 return {nodes,datasetNodes,document,localStorage,window,fetch,popup};
}
async function boot(){
 const env=makeBrowser();
 vm.runInNewContext(script,{
  document:env.document,window:env.window,localStorage:env.localStorage,
  fetch:env.fetch,console,Date,Intl,URL,Number,Array,Object,String,
  encodeURIComponent
 },{filename:'OSS-Store-Lab-runtime.js',timeout:6000});
 await new Promise(resolve=>setImmediate(resolve)); // flush asynchronous catalog fetch
 return env;
}
test('real application script boots without ReferenceError and wires simulator selectors',async()=>{
 const app=await boot();
 assert.equal(app.nodes.get('catalogCount').textContent,'3 registros oficiais');
 assert.equal(app.nodes.get('demoWorkspaceTitle').textContent,'Pagamento demonstrativo');
 assert.equal(app.nodes.get('demoStockList').children.length,3);
 assert.equal(app.nodes.get('products').children.length,3);
 assert.equal(app.datasetNodes.filter(x=>x.dataset.demoOpen!==undefined).length,3);
});
test('CEP tab opens and gives feedback for wrong and valid formats',async()=>{
 const app=await boot(),{nodes}=app;
 const button=app.datasetNodes.find(e=>e.dataset.demoOpen==='shipping');
 button.click();
 assert.equal(nodes.get('demo-shipping').hidden,false);
 assert.equal(nodes.get('demo-payment').hidden,true);
 assert.equal(nodes.get('demoWorkspaceTitle').textContent,'Frete demonstrativo por CEP');
 nodes.get('demoCep').value='abc';
 nodes.get('demoShippingForm').emit('submit');
 assert.match(nodes.get('shippingResult').textContent,/CEP inválido/);
 nodes.get('demoCep').value='13010-110';
 nodes.get('demoShippingMethod').value='Entrega padrão';
 nodes.get('demoShippingForm').emit('submit');
 assert.match(nodes.get('shippingResult').textContent,/13010-110/);
 assert.match(nodes.get('shippingResult').textContent,/Nenhum valor ou prazo/);
});
test('payment tab can generate and approve a completely simulated test payment',async()=>{
 const app=await boot(),{nodes}=app;
 nodes.get('demoAmount').value='150,00';
 nodes.get('demoStartPayment').click();
 assert.equal(nodes.get('paymentResult').hidden,false);
 assert.match(nodes.get('paymentResultText').textContent,/150,00/);
 nodes.get('demoApprovePayment').click();
 assert.match(nodes.get('paymentResultTitle').textContent,/Pagamento aprovado/);
 assert.match(nodes.get('paymentFeedback').textContent,/Nenhum valor foi cobrado/);
});
test('products are added to bag, orders can be created and fictitious stock can be changed',async()=>{
 const app=await boot(),{nodes}=app;
 const product=nodes.get('products').children[0];
 const action=product.children.find(e=>e.className==='card-body').children.find(e=>e.className==='card-actions');
 const add=action.children.find(e=>e.className==='add');
 add.click();
 assert.equal(nodes.get('bagCount').textContent,1);
 assert.equal(nodes.get('cartDialog').open,true);
 nodes.get('closeCart').click();
 assert.equal(nodes.get('cartDialog').open,false);
 nodes.get('demoCreateOrder').click();
 assert.match(nodes.get('ordersFeedback').textContent,/Pedido OSS-TESTE-/);
 assert.equal(nodes.get('demoOrderList').children.length,1);
 nodes.get('demoStockExample').click();
 const inputs=nodes.get('demoStockList').querySelectorAll('[data-stock-id]');
 assert.equal(inputs.length,3);
 assert.equal(inputs[0].value,'5');
 const orderCard=nodes.get('demoOrderList').children[0];
 const buttons=orderCard.querySelectorAll('[data-order-approve]');
 assert.equal(buttons.length,1);
 nodes.get('demoOrderList').emit('click',{target:buttons[0]});
 assert.match(nodes.get('demoOrderList').children[0].children[0].children[1].textContent,/Aprovado/);
 assert.equal(nodes.get('demoStockList').querySelectorAll('[data-stock-id]')[0].value,'4');
 nodes.get('demoClearOrders').click();
 assert.equal(nodes.get('demoOrderList').children.length,1);
 assert.match(nodes.get('demoOrderList').children[0].textContent,/Nenhum pedido de teste/);
 assert.equal(nodes.get('demoStockList').querySelectorAll('[data-stock-id]')[0].value,'5');
 nodes.get('demoClearStock').click();
 assert.equal(nodes.get('demoStockList').querySelectorAll('[data-stock-id]')[0].value,'');
});
