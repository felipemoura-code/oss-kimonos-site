import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync('index.html','utf8');
const catalog=JSON.parse(readFileSync('catalogo.json','utf8'));
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'App script not found');

class Node {
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.dataset={};this.attributes={};this.children=[];
  this.parentElement=null;this.className='';this.textContent='';this.hidden=false;
  this.disabled=false;this.open=false;this.value='';this.listeners={};this.style={};
 }
 append(...nodes){for(const n of nodes){if(n){this.children.push(n);n.parentElement=this;}}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 addEventListener(type,cb){(this.listeners[type]??=[]).push(cb);}
 emit(type,extra={}){const e={target:this,preventDefault(){},...extra};for(const cb of this.listeners[type]||[])cb(e);}
 click(){this.emit('click');}
 setAttribute(name,v){
  this.attributes[name]=String(v);
  if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);
 }
 getAttribute(name){return this.attributes[name]??null;}
 closest(selector){if(selector==='[data-filter]'&&this.dataset.filter!==undefined)return this;return null;}
 matches(selector){return selector==='[data-filter]'&&this.dataset.filter!==undefined;}
 querySelectorAll(selector){
  const result=[];
  const visit=n=>{for(const c of n.children){if(c.matches(selector))result.push(c);visit(c);}};
  visit(this);return result;
 }
 showModal(){this.open=true;}close(){this.open=false;}
}
function mockBrowser(){
 const ids=new Map();
 for(const m of html.matchAll(/<([a-z][\w-]*)([^>]*\sid="([^"]+)"[^>]*)>/gi)){const n=new Node(m[1]);n.id=m[3];ids.set(m[3],n);}
 const filters=ids.get('filters');
 for(const m of html.matchAll(/<button[^>]*data-filter="([^"]+)"[^>]*>/g)){const n=new Node('button');n.dataset.filter=m[1];filters.append(n);}
 const document={
  getElementById(id){const n=ids.get(id);if(!n)throw Error('Missing required element #'+id);return n;},
  createElement(tag){return new Node(tag);}
 };
 const store=new Map(),popups=[];
 const localStorage={getItem(k){return store.get(k)??null;},setItem(k,v){store.set(k,String(v));}};
 const window={open(...args){popups.push(args);}};
 const fetch=async url=>{assert.equal(url,'/catalogo.json');return {ok:true,json:async()=>catalog};};
 return {ids,document,window,localStorage,fetch,popups,store};
}
async function boot(){
 const ctx=mockBrowser();
 runInNewContext(script,{document:ctx.document,window:ctx.window,fetch:ctx.fetch,localStorage:ctx.localStorage,encodeURIComponent,Intl,Date,console},
  {filename:'oss-shop.js',timeout:6000});
 await new Promise(resolve=>setImmediate(resolve));
 return ctx;
}
function productCard(app,index=0){return app.ids.get('products').children[index];}
function actions(card){const info=card.children.find(x=>x.className==='product-info');return info.children.find(x=>x.className==='product-actions');}
test('page boots, loads all official photo records and renders real product cards',async()=>{
 const app=await boot();const ids=app.ids;
 assert.equal(ids.get('products').children.length,3);
 assert.equal(ids.get('catalogCount').textContent,'3 modelos em destaque');
 assert.equal(ids.get('bagCount').textContent,'0');
 assert.equal(ids.get('emptyState').hidden,true);
 assert.equal(app.popups.length,0);
});
test('detail view opens and selection cart persists a real product',async()=>{
 const app=await boot(),ids=app.ids;
 actions(productCard(app)).children.find(x=>x.className==='ghost').click();
 assert.equal(ids.get('detailDialog').open,true);
 assert.match(ids.get('detailHeading').textContent,/Kimono OSS/);
 ids.get('detailAdd').click();
 assert.equal(ids.get('detailDialog').open,false);
 assert.equal(ids.get('bagDialog').open,true);
 assert.equal(ids.get('bagCount').textContent,'1');
 assert.equal(ids.get('bagLines').children.length,1);
 assert.ok(app.store.get('oss-shop-favorites-v1')?.includes('FOTO-OSS-'));
});
test('quantities increase and decrease and a WhatsApp inquiry contains the real product name',async()=>{
 const app=await boot(),ids=app.ids;
 actions(productCard(app)).children.find(x=>x.className==='primary').click();
 const qty=ids.get('bagLines').children[0].children[1].children.find(x=>x.className==='qty');
 qty.children[2].click();assert.equal(ids.get('bagCount').textContent,'2');
 ids.get('sendQuote').click();
 assert.equal(app.popups.length,1);
 assert.match(app.popups[0][0],/^https:\/\/wa\.me\/5519997121912\?text=/);
 const msg=decodeURIComponent(app.popups[0][0].split('?text=')[1]);
 assert.match(msg,/2x Kimono OSS/);
 assert.match(msg,/tamanhos, preços/);
 qty.children[0].click();assert.equal(ids.get('bagCount').textContent,'1');
 ids.get('bagLines').children[0].children[1].children.find(x=>x.className==='qty').children[3].click();
 assert.equal(ids.get('bagCount').textContent,'0');
 assert.equal(ids.get('bagEmpty').hidden,false);
});
test('search actually filters products and empty state appears for unrelated terms',async()=>{
 const app=await boot(),ids=app.ids;
 ids.get('search').emit('input',{target:{value:'feminina'}});
 assert.equal(ids.get('products').children.length,1);
 ids.get('search').emit('input',{target:{value:'não existe xyz'}});
 assert.equal(ids.get('products').children.length,0);
 assert.equal(ids.get('emptyState').hidden,false);
 ids.get('search').emit('input',{target:{value:''}});
 assert.equal(ids.get('products').children.length,3);
});
test('category filter updates pressed state and photo gallery is authentic',async()=>{
 const app=await boot(),ids=app.ids;
 const btn=ids.get('filters').children[1];
 ids.get('filters').emit('click',{target:btn});
 assert.equal(btn.getAttribute('aria-pressed'),'true');
 assert.equal(ids.get('products').children.length,3);
 for(const card of ids.get('products').children){
  const image=card.children.find(x=>x.className==='product-visual').children[0];
  assert.match(image.src,/^\/assets\/[a-z0-9-]+\.webp$/);
  assert.match(image.alt,/oficial OSS/);
 }
});
