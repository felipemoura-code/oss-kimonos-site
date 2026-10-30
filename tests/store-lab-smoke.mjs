import './store-lab-interaction.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Script} from 'node:vm';
const html=readFileSync('index.html','utf8');
const catalog=JSON.parse(readFileSync('catalogo.json','utf8'));
test('OSS experimental shop remains isolated from the official website',()=>{
 assert.match(html,/<!doctype html>/i);
 assert.match(html,/<html lang="pt-BR">/);
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(html,/PRÉVIA DA LOJA OSS/);
 assert.match(html,/https:\/\/oss-kimonos-site\.onrender\.com\//);
 assert.match(html,/<title>Loja OSS Kimonos/);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.match(html,/Sem compra ou cobrança neste endereço|Não há pagamento pelo site/);
});
test('natural retail layout replaces fake sandbox and misleading checkout',()=>{
 for(const text of ['Kimonos em destaque','Minha seleção','Conheça outras linhas','Falar com a OSS','Atendimento']){
  assert.ok(html.includes(text),text);
 }
 assert.doesNotMatch(html,/SIMULAÇÃO DISPONÍVEL|CONCLUIR DEMONSTRAÇÃO|NENHUMA TRANSAÇÃO REAL|id="checkoutProgress"|id="demoWorkspace"|id="demoStockList"/i);
 assert.doesNotMatch(html,/Próximas funcionalidades\.|Simples\. Sem pressa\.|checkoutFinish/);
 assert.match(html,/id="sendQuote"/);
 assert.match(html,/id="bagDialog"/);
 assert.match(html,/id="detailDialog"/);
});
test('no invented products, prices, stock, payment claims or freight rates',()=>{
 assert.equal(catalog.produtos.length,3);
 for(const p of catalog.produtos){
  assert.equal(p.categoria,'kimonos');
  assert.equal(p.status,'publicado');
  assert.equal(p.tipo_registro,'foto_oficial_consulta');
  assert.equal(p.preco_confirmado,false);
  assert.ok(existsSync('.'+p.imagem),p.imagem);
 }
 assert.doesNotMatch(html,/R\$\s*\d/);
 assert.doesNotMatch(html,/checkout\.mercadopago|api\.correios|api\.melhorenvio|api\.viacep/i);
 assert.match(html,/Valor sob consulta/);
});
test('working JavaScript uses official catalog, persistent shopping list and WhatsApp',()=>{
 const code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(code);
 new Script(code);
 assert.match(code,/fetch\('\/catalogo\.json'/);
 assert.match(code,/function renderProducts\(\)/);
 assert.match(code,/function renderCart\(\)/);
 assert.match(code,/function changeQty\(id,delta\)/);
 assert.match(code,/function requestQuote\(\)/);
 assert.match(code,/localStorage\.setItem/);
 assert.match(code,/https:\/\/wa\.me\/5519997121912/);
});
test('visual typography, responsive layout and genuine brand imagery are configured',()=>{
 assert.match(html,/Inter,"Segoe UI",Arial,Helvetica,sans-serif/);
 assert.match(html,/banner-oss-tres-modelos\.webp/);
 assert.match(html,/assets\/oss-logo\.webp/);
 assert.match(html,/\.product-visual img\{width:100%;height:100%;object-fit:contain/);
 assert.match(html,/@media\(max-width:770px\)/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/button:focus-visible/);
});
