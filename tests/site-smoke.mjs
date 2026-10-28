import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';

const text = (file) => readFileSync(file, 'utf8');
const home = text('index.html');
const store = text('loja.html');
const catalog = JSON.parse(text('catalogo.json'));
const integration = JSON.parse(text('integracao-host.json'));
const categories = [
  'kimonos', 'faixas', 'fight-wear', 'rashguard', 'camisas',
  'bones', 'bermuda', 'moletom', 'mochilas',
];
const officialPhone = '5519997121912';

test('as duas paginas possuem titulos, estrutura e JavaScript valido', () => {
  for (const [name, page] of [['index.html', home], ['loja.html', store]]) {
    assert.match(page, /<html lang="pt-BR">/);
    assert.equal((page.match(/<h1\b/g) || []).length, 1, name);
    assert.match(page, /<meta name="viewport"/);
    assert.match(page, /<meta name="description"/);
    assert.match(page, /<main id="conteudo">/);
    const scripts = [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    assert.ok(scripts.length > 0, name + ': nenhum script');
    for (const [, code] of scripts) new Script(code, { filename: name });
    assert.match(page, /class="mobile-nav"/);
    assert.match(page, /class="skip-link"/);
    assert.match(page, /\/assets\/oss-logo\.webp/);
  }
});

test('loja abre na mesma aba e contato oficial permanece correto', () => {
  assert.match(home, /href="\/loja\.html"/);
  assert.doesNotMatch(home, /href="\/loja\.html"[^>]*target="_blank"/);
  assert.match(home, /class="mobile-store" href="\/loja\.html"/);
  assert.match(home, new RegExp(officialPhone));
  assert.match(store, new RegExp(officialPhone));
  assert.doesNotMatch(home + store, /5519999832458/);
});

test('as nove categorias estao ligadas ao catalogo', () => {
  const keys = [...store.matchAll(/class="category"[^>]*data-key="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(keys, categories);
  assert.match(store, /fetch\(activeCatalogEndpoint/);
  assert.match(store, /\/catalogo\.json/);
  assert.match(store, /\/integracao-host\.json/);
  assert.match(store, /p\.status==="publicado"/);
});

test('fotos otimizadas oficiais existem e originais estao preservadas', () => {
  for (const name of [
    'oss-logo', 'banner-oss-tres-modelos', 'kimono-branco-detalhe',
    'hero-modelo-preto', 'modelo-branco-feminino'
  ]) {
    assert.ok(existsSync('assets/' + name + '.png'));
    assert.ok(existsSync('assets/' + name + '.webp'));
  }
  assert.match(home, /banner-oss-tres-modelos\.webp/);
  assert.match(store, /kimono-branco-detalhe\.webp/);
  assert.match(store, /hero-modelo-preto\.webp/);
});

test('catalogo nao presume produtos nem hospedagem conectada', () => {
  assert.ok(Array.isArray(catalog.produtos));
  assert.equal(catalog.versao, 1);
  assert.equal(integration.versao, 1);
  assert.equal(typeof integration.api_catalogo, 'string');
});

test('referencias ilustrativas sao originais e nao inventam produtos', () => {
  const art = text('assets/oss-categorias.svg');
  const referenceCategories = categories.filter(key => key !== 'kimonos');
  const ids = [...art.matchAll(/<symbol id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, referenceCategories.length);
  assert.deepEqual(new Set(ids), new Set(referenceCategories));
  assert.match(store, /class="single reference-panel"/);
  assert.match(store, /id="reference-symbol"/);
  assert.match(store, /setAttribute\("href","\/assets\/oss-categorias\.svg#"/);
  assert.match(store, /Referência ilustrativa/);
  assert.match(store, /Não é foto de um produto da OSS/);
  assert.match(store, /refArtwork\.setAttribute\("aria-label"/);
  assert.deepEqual(catalog.produtos, []);
});

test('imagens HTML usam descricao alternativa', () => {
  for (const page of [home, store]) {
    for (const match of page.matchAll(/<img\b[^>]*>/g)) {
      assert.match(match[0], /\balt="/);
    }
  }
});
