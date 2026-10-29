import './store-lab-interaction.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Script} from 'node:vm';
const home=readFileSync('index.html','utf8');
const catalog=JSON.parse(readFileSync('catalogo.json','utf8'));
test('standalone OSS store has complete HTML, safe demo context and only official assets',()=>{
 assert.match(home,/<!doctype html>/i);
 assert.match(home,/<html lang="pt-BR">/);
 assert.match(home,/name="robots" content="noindex,nofollow"/);
 assert.match(home,/LOJA EXPERIMENTAL OSS/);
 assert.match(home,/SEM PAGAMENTO ONLINE/);
 assert.match(home,/oss-logo\.webp/);
 assert.match(home,/banner-oss-tres-modelos\.webp/);
 assert.equal((home.match(/<h1\b/g)||[]).length,1);
 assert.match(home,/id="openCart"/);
 assert.match(home,/id="cartDialog"/);
 assert.match(home,/id="productDialog"/);
 assert.match(home,/id="catalogo"/);
 assert.match(home,/id="search"/);
 assert.match(home,/id="filters"/);
 assert.match(home,/id="cartLines"/);
 assert.match(home,/role="status"/);
});
test('inline JavaScript parses and contains functional catalog, search, bag and WhatsApp checkout',()=>{
 const scripts=[...home.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);
 new Script(scripts[0][1],{filename:'store-lab.js'});
 assert.match(home,/fetch\('\/catalogo\.json'/);
 assert.match(home,/function renderProducts\(\)/);
 assert.match(home,/function renderCart\(\)/);
 assert.match(home,/function addProduct\(id\)/);
 assert.match(home,/function changeQty\(id,dir\)/);
 assert.match(home,/function openDetail\(id\)/);
 assert.match(home,/byId\('search'\)\.addEventListener\('input'/);
 assert.match(home,/byId\('filters'\)\.addEventListener\('click'/);
 assert.match(home,/https:\/\/wa\.me\/5519997121912/);
 assert.match(home,/sendRequest/);
});
test('no fictional pricing, real online payment, freight quote or unsupported inventory claims',()=>{
 assert.match(home,/preco_confirmado===true/);
 assert.match(home,/Valor sob consulta/);
 assert.match(home,/NENHUMA TRANSAÇÃO REAL/);
 assert.match(home,/SIMULAÇÃO DISPONÍVEL/);
 assert.match(home,/Sem compra ou cobrança neste endereço/);
 assert.doesNotMatch(home,/R\$\s*\d/);
 assert.doesNotMatch(home,/checkout\.mercadopago/);
});
test('every currently published photo record is real and has its source asset',()=>{
 assert.ok(Array.isArray(catalog.produtos)&&catalog.produtos.length===3);
 for(const p of catalog.produtos){
  assert.equal(p.status,'publicado');
  assert.equal(p.tipo_registro,'foto_oficial_consulta');
  assert.equal(p.preco_confirmado,false);
  assert.ok(existsSync('.'+p.imagem),p.imagem);
 }
});
test('site is isolated from main OSS and provides link back to official storefront',()=>{
 assert.match(home,/https:\/\/oss-kimonos-site\.onrender\.com\//);
 assert.doesNotMatch(home,/PRÉVIA DE DESIGN/);
 assert.match(home,/cartSave\(\)/);
 assert.match(home,/localStorage\.setItem\(/);
 assert.match(home,/max-width:720px/);
});

test('typography is readable and no condensed Impact headers remain',()=>{
 assert.match(home,/font-family:Inter,"Segoe UI",Arial,Helvetica,sans-serif/);
 assert.match(home,/\.hero h1\{font-size:clamp\(43px,5vw,72px\)/);
 assert.match(home,/\.section-title\{font-size:clamp\(32px,3\.6vw,49px\)/);
 const lastStyles=home.slice(home.lastIndexOf('\/\* Tipografia editorial clara'));
 assert.doesNotMatch(lastStyles,/font-family:Impact/);
});
test('three demo controls switch explicit panels and remain separate from live checkout',()=>{
 for(const tab of ['payment','shipping','orders']){
  assert.match(home,new RegExp('data-demo-open="'+tab+'"'));
  assert.match(home,new RegExp('data-demo-panel="'+tab+'"'));
 }
 assert.match(home,/function demoSwitch\(name,scroll\)/);
 assert.match(home,/demoSwitch\(button\.dataset\.demoOpen,true\)/);
 assert.match(home,/id="demoWorkspace"/);
 assert.match(home,/aria-expanded="false"/);
});
test('Pix and card are strictly simulated without collecting card credentials',()=>{
 assert.match(home,/id="demoAmount"/);
 assert.match(home,/name="demoMethod" value="Pix"/);
 assert.match(home,/name="demoMethod" value="Cartão"/);
 assert.match(home,/id="demoApprovePayment"/);
 assert.match(home,/function demoParseAmount\(value\)/);
 assert.match(home,/Nenhuma cobrança ou QR Code real foi gerado/);
 assert.match(home,/Não informe dados reais de cartão/);
 assert.doesNotMatch(home,/type="password"|name="card_number"|checkout\.mercadopago/i);
});
test('CEP check validates format only; no fake shipping rates and carrier requests',()=>{
 assert.match(home,/id="demoCep"/);
 assert.match(home,/id="demoShippingForm"/);
 assert.match(home,/function demoFeedback\(id,msg\)/);
 assert.match(home,/^\s*if\(!\/\^\\d\{8\}\$\/\.test\(digits\)\|\|!/m);
 assert.match(home,/Nenhum valor ou prazo de entrega foi calculado/);
 assert.match(home,/não consultamos Correios nem transportadoras/);
 assert.doesNotMatch(home,/api\.melhorenvio|api\.correios|api\.viacep/i);
});
test('order and inventory demo only use localStorage and can create, approve, cancel and reset',()=>{
 assert.match(home,/id="demoCreateOrder"/);
 assert.match(home,/id="demoOrderList"/);
 assert.match(home,/id="demoStockList"/);
 assert.match(home,/id="demoStockExample"/);
 assert.match(home,/id="demoSaveStock"/);
 assert.match(home,/id="demoClearOrders"/);
 assert.match(home,/function demoOrder\(status,amount=null,method=null\)/);
 assert.match(home,/function demoSetOrderStatus\(id,nextStatus\)/);
 assert.match(home,/function demoRenderOrders\(\)/);
 assert.match(home,/function demoRenderStock\(\)/);
 assert.match(home,/localStorage\.setItem\(demoKey/);
 assert.match(home,/Aprovado \(simulado\)/);
 assert.match(home,/Cancelado \(simulado\)/);
 assert.match(home,/não representa/);
});
