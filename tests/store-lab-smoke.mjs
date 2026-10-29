import './store-lab-interaction.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Script} from 'node:vm';
const home=readFileSync('index.html','utf8');
const products=JSON.parse(readFileSync('catalogo.json','utf8')).produtos;
test('OSS storefront is a separate experimental site with authentic brand assets',()=>{
 assert.match(home,/<!doctype html>/i);
 assert.match(home,/<html lang="pt-BR">/);
 assert.match(home,/name="robots" content="noindex,nofollow"/);
 assert.match(home,/SEM PAGAMENTO ONLINE/);
 assert.match(home,/https:\/\/oss-kimonos-site\.onrender\.com\//);
 assert.match(home,/assets\/oss-logo\.webp/);
 assert.match(home,/assets\/banner-oss-tres-modelos\.webp/);
 assert.match(home,/id="catalogo"/);
 assert.match(home,/id="products"/);
 assert.equal((home.match(/<h1\b/g)||[]).length,1);
});
test('JS is syntactically valid with required catalog, cart and checkout actions',()=>{
 const inline=home.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 new Script(inline);
 assert.match(inline,/fetch\('\/catalogo\.json'/);
 assert.match(inline,/function renderCart\(\)/);
 assert.match(inline,/function renderProducts\(\)/);
 assert.match(inline,/function showCheckout\(stage,scroll=false\)/);
 assert.match(inline,/function renderReceipt\(receipt\)/);
 assert.match(inline,/function renderHistory\(\)/);
 assert.match(inline,/checkoutFinish/);
 assert.match(inline,/checkoutFromBag/);
});
test('one customer journey replaces fake payment, freight and admin simulator cards',()=>{
 for(const stage of ['bag','delivery','payment','done'])assert.match(home,new RegExp('data-checkout-stage="'+stage+'"'));
 assert.match(home,/id="checkoutProgress"/);
 assert.match(home,/id="checkoutDeliveryPanel"/);
 assert.match(home,/id="checkoutCep"/);
 assert.match(home,/id="checkoutFinish"/);
 assert.match(home,/id="checkoutReceipt"/);
 assert.match(home,/id="checkoutHistoryList"/);
 assert.doesNotMatch(home,/id="demoWorkspace"|id="demoStockList"|id="demoStartPayment"|id="demoOrderList"/);
 assert.doesNotMatch(home,/Próximas funcionalidades\./);
});
test('no fake prices, credit card credential collection, shipping quote or order backend',()=>{
 assert.match(home,/Valor sob consulta/);
 assert.match(home,/preco_confirmado===true/);
 assert.match(home,/Sem compra ou cobrança neste endereço/);
 assert.doesNotMatch(home,/R\$\s*\d/);
 assert.doesNotMatch(home,/type="password"|name="card_number"|checkout\.mercadopago/);
 assert.doesNotMatch(home,/api\.correios|api\.melhorenvio|api\.viacep/);
});
test('catalog contains three real OSS photograph records with no fictional stock',()=>{
 assert.equal(products.length,3);
 for(const product of products){
  assert.equal(product.status,'publicado');
  assert.equal(product.tipo_registro,'foto_oficial_consulta');
  assert.equal(product.preco_confirmado,false);
  assert.equal(product.categoria,'kimonos');
  assert.ok(existsSync('.'+product.imagem),product.imagem);
 }
});
test('layout keeps readable typography, mobile checkout and keyboard controls',()=>{
 assert.match(home,/font-family:Inter,"Segoe UI",Arial,Helvetica,sans-serif/);
 assert.match(home,/\.section-title\{font-size:clamp\(32px,3\.6vw,49px\)/);
 assert.match(home,/@media\(max-width:800px\)\{\.checkout-shell/);
 assert.match(home,/button:focus-visible/);
 assert.match(home,/checkout-pane-wrap/);
 assert.match(home,/aria-current="step"/);
});
