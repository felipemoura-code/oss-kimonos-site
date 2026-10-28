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

test('cada categoria do carrossel abre detalhes na mesma página, sem outra aba', () => {
  assert.match(home, /id="category-track"/);
  assert.match(home, /id="category-prev"/);
  assert.match(home, /id="category-next"/);
  assert.match(home, /id="category-toggle"/);
  assert.match(home, /id="category-progress"/);
  assert.match(home, /id="category-details"/);
  assert.match(home, /id="detail-close"/);
  assert.match(home, /id="detail-items"/);
  assert.match(home, /id="detail-empty"/);
  assert.match(home, /track\.scrollTo/);
  const carousel = home.split('id="category-track"')[1].split('</div>\n <div class="carousel-bottom">')[0];
  assert.equal((carousel.match(/class="category-tile"/g) || []).length, 9);
  for (const key of categories) {
    assert.ok(home.includes('data-category="' + key + '"'), 'Categoria sem botão: ' + key);
  }
  assert.doesNotMatch(carousel, /href="/);
  assert.doesNotMatch(carousel, /target="_blank"/);
  assert.match(home, /selectCategory\(card\.dataset\.category,card\)/);
  assert.match(home, /details\.scrollIntoView/);
  assert.match(home, /details\.hidden=false/);
  assert.match(home, /closeDetails\(true\)/);
  assert.match(home, /fetch\('\/catalogo\.json'/);
  assert.doesNotMatch(home, /class="product"/);
  assert.match(home, /scroll-snap-type:x mandatory/);
});

test('carousel avanca sozinho com pausa e sem salto para o inicio', () => {
  assert.match(home, /const interval=3900/);
  assert.match(home, /setInterval\(advance,interval\)/);
  assert.match(home, /clearInterval\(timer\)/);
  assert.match(home, /if\(x>=max-3\)direction=-1/);
  assert.match(home, /else if\(x<=3\)direction=1/);
  assert.match(home, /pointerenter/);
  assert.match(home, /focusin/);
  assert.match(home, /visibilitychange/);
  assert.match(home, /IntersectionObserver/);
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.match(home, /toggle\.addEventListener\('click'/);
  assert.match(home, /selectedCategory===null/);
  assert.match(home, /aria-expanded/);
});

test('categorias sem fotos reais mostram apenas consulta; kimonos preservam originais', () => {
  assert.match(store, /class="category-enquiry"/);
  assert.match(store, /id="other-description"/);
  assert.match(store, /Ainda não temos fotos oficiais/);
  assert.doesNotMatch(store, /reference-photo-image/);
  assert.doesNotMatch(store, /referenceImages/);
  assert.doesNotMatch(store, /oss-ref-[a-z-]+\.webp/);
  assert.equal(catalog.produtos.length, 3);
  assert.equal(new Set(catalog.produtos.map(p => p.id)).size, 3);
  for (const product of catalog.produtos) {
    assert.equal(product.categoria, 'kimonos');
    assert.equal(product.tipo_registro, 'foto_oficial_consulta');
    assert.equal(product.preco_confirmado, false);
    assert.equal(product.status, 'publicado');
    assert.ok(existsSync('.' + product.imagem), product.imagem);
    assert.match(product.descricao, /confirmação/);
    assert.equal(product.estoque, undefined);
  }
  assert.match(store, /Foto original OSS · modelo sob consulta/);
});

test('adaptador do painel da OSS nao altera site sem API configurada', () => {
  const adapter = text('site-editor-runtime.js');
  new Script(adapter, {filename:'site-editor-runtime.js'});
  assert.match(home, /src="\/site-editor-runtime\.js"/);
  assert.match(store, /src="\/site-editor-runtime\.js"/);
  assert.equal(integration.api_site, '');
  assert.match(adapter, /if\(!api\)return null/);
  assert.match(adapter, /fetch\(configURL/);
  assert.match(adapter, /\/api\/site\.php/);
  assert.match(adapter, /whatsapp_number/);
  assert.match(adapter, /accent_color/);
  assert.match(adapter, /instagram_url/);
  assert.match(adapter, /banner_image/);
  assert.match(adapter, /logo_image/);
  assert.match(adapter, /about_image/);
});

test('imagens HTML usam descricao alternativa', () => {
  for (const page of [home, store]) {
    for (const match of page.matchAll(/<img\b[^>]*>/g)) {
      assert.match(match[0], /\balt="/);
    }
  }
});
