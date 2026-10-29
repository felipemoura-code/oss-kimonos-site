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
 assert.match(home,/NÃO ATIVO NO TESTE/);
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
