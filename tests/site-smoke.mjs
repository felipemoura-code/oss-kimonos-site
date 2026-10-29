import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {Script} from 'node:vm';

const read = name => readFileSync(name,'utf8');
const home=read('index.html');
const store=read('loja.html');
const preview=read('nova-versao.html');
const previous=read('versao-anterior.html');
const adapter=read('site-editor-runtime.js');
const viewer=read('oss-photo-viewer.js');
const catalog=JSON.parse(read('catalogo.json'));
const integration=JSON.parse(read('integracao-host.json'));
const categories=['kimonos','faixas','fight-wear','rashguard','camisas','bones','bermuda','moletom','mochilas'];

function checkInlineScripts(filename,content){
  const scripts=[...content.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>0,filename);
  for(const [,src] of scripts)new Script(src,{filename});
}
test('homepage, loja e preview possuem estrutura e JavaScript valido',()=>{
  for(const [filename,content] of [['index.html',home],['loja.html',store],['nova-versao.html',preview]]){
    assert.match(content,/<html lang="pt-BR">/);
    assert.match(content,/<meta name="viewport"/);
    assert.equal((content.match(/<h1\b/g)||[]).length,1,filename);
    assert.match(content,/<main id="conteudo">/);
    assert.match(content,/\/assets\/oss-logo\.webp/);
    checkInlineScripts(filename,content);
  }
  new Script(adapter,{filename:'site-editor-runtime.js'});
  new Script(viewer,{filename:'oss-photo-viewer.js'});
});

test('nova identidade OSS e oficial, nao e mais pagina de previa',()=>{
  assert.match(home,/<title>OSS Kimonos \| Feito para o tatame<\/title>/);
  assert.match(home,/rel="canonical" href="https:\/\/oss-kimonos-site\.onrender\.com\/"/);
  assert.match(home,/property="og:title"/);
  assert.match(home,/property="og:image"/);
  assert.doesNotMatch(home,/name="robots" content="noindex,nofollow"/);
  assert.doesNotMatch(home,/PRÉVIA DE DESIGN/);
  assert.match(home,/id="inicio"/);
  assert.match(home,/id="categorias"/);
  assert.match(home,/id="destaques"/);
  assert.match(home,/id="sobre"/);
  assert.match(home,/id="contato"/);
});

test('versao antiga preservada para reversao e preview isolada',()=>{
  assert.match(previous,/FEITO PARA/);
  assert.match(previous,/TATAME/);
  assert.match(previous,/name="robots" content="noindex,nofollow"/);
  assert.match(preview,/name="robots" content="noindex,nofollow"/);
  assert.match(preview,/PRÉVIA DE DESIGN/);
  assert.doesNotMatch(home,/PRÉVIA DE DESIGN/);
});

test('banners usam somente fotos oficiais da OSS e respeitam composicao aprovada',()=>{
  for(const name of ['banner-oss-tres-modelos','kimono-branco-detalhe','hero-modelo-preto','modelo-branco-feminino','oss-logo']){
    assert.ok(existsSync('assets/'+name+'.png'));
    assert.ok(existsSync('assets/'+name+'.webp'));
  }
  assert.match(home,/background-image:url\('\/assets\/banner-oss-tres-modelos\.webp'\)/);
  assert.match(home,/#inicio\.hero\{margin-inline:clamp\(10px,1vw,18px\)\}/);
  assert.match(home,/class="hero-visual"/);
  assert.match(home,/class="story-image"/);
  assert.match(home,/\.brand-story \.story-image::after/);
  assert.doesNotMatch(home,/oss-ref-(?:camisas|faixas|bones)\.webp/);
});

test('carrossel premium contem nove categorias sem concorrentes e sem fotos inventadas',()=>{
  assert.equal((home.match(/class="collection-card"/g)||[]).length,9);
  for(const key of categories)assert.ok(home.includes('data-category="'+key+'"'),key);
  assert.match(home,/id="category-track"/);
  assert.match(home,/id="cat-prev"/);
  assert.match(home,/id="cat-next"/);
  assert.match(home,/id="collection-detail"/);
  const carousel=home.split('id="category-track"')[1].split('</div>\n<section class="category-quick"')[0];
  assert.doesNotMatch(carousel,/href="\/loja\.html"/);
  assert.match(home,/track\.addEventListener\('click'/);
  assert.match(home,/openDetail\(tile\.dataset\.category,true,true,tile\)/);
});

test('carrossel avanca automaticamente em loop com copias e sem retorno visivel abrupto',()=>{
  assert.match(home,/track\.prepend\(\.\.\.initialTiles\.map\(makeClone\)\)/);
  assert.match(home,/track\.append\(\.\.\.initialTiles\.map\(makeClone\)\)/);
  assert.match(home,/autoplay=setInterval\(\(\)=>move\(1\),2500\)/);
  assert.match(home,/function normalize\(\)/);
  assert.match(home,/instantScroll\(pos-extent\)/);
  assert.match(home,/instantScroll\(pos\+extent\)/);
  assert.match(home,/IntersectionObserver/);
  assert.match(home,/prefers-reduced-motion:reduce/);
  assert.match(home,/touchstart/);
  assert.match(home,/pointerenter/);
  assert.match(home,/document\.hidden/);
});

test('categoria abre na propria pagina e historico do navegador funciona',()=>{
  assert.match(home,/function openDetail\(key,scroll=true,writeHistory=true,trigger=null\)/);
  assert.match(home,/detail\.hidden=false/);
  assert.match(home,/id="quick-close"/);
  assert.match(home,/history\.pushState/);
  assert.match(home,/window\.addEventListener\('popstate',showFromHash\)/);
  assert.match(home,/window\.addEventListener\('hashchange',showFromHash\)/);
  assert.match(home,/id="quick-preview"/);
  assert.doesNotMatch(home,/href="\/loja\.html#[a-z-]+"[^>]*target="_blank"/);
});

test('apenas 3 fotografias reais da OSS, sem preco ou estoque ficticios',()=>{
  assert.equal((home.match(/class="product-card"/g)||[]).length,3);
  assert.equal(catalog.produtos.length,3);
  for(const p of catalog.produtos){
    assert.equal(p.categoria,'kimonos');
    assert.equal(p.tipo_registro,'foto_oficial_consulta');
    assert.equal(p.preco_confirmado,false);
    assert.equal(p.status,'publicado');
    assert.ok(existsSync('.'+p.imagem));
    assert.equal(p.estoque,undefined);
  }
  assert.match(home,/Modelos, tamanhos e valores sob consulta/);
  assert.doesNotMatch(home,/R\$\s*\d/);
  assert.doesNotMatch(home,/frete grátis|parcele em|compra segura/i);
});

test('navegacao interna usa mesma aba e WhatsApp oficial permanece correto',()=>{
  for(const page of [home,store]){
    assert.match(page,/5519997121912/);
    assert.doesNotMatch(page,/5519999832458/);
    assert.doesNotMatch(page,/href="\/loja\.html"[^>]*target="_blank"/);
  }
  assert.match(home,/href="\/loja\.html"/);
  assert.match(home,/class="mobile-nav"/);
  assert.match(home,/href="https:\/\/www\.instagram\.com\/osskimonos\//);
});

test('orientacoes de compra estao incluidas sem promessas nao confirmadas',()=>{
  assert.match(home,/id="como-comprar"/);
  assert.equal((home.match(/class="buying-step"/g)||[]).length,3);
  assert.match(home,/Sem checkout ou cobrança automática/);
  assert.match(home,/condições de entrega com a equipe/);
  assert.match(store,/id="ajuda"/);
  assert.equal((store.match(/<details><summary>/g)||[]).length,4);
});

test('loja continua com nove categorias e catalogo publicado',()=>{
  const keys=[...store.matchAll(/class="category"[^>]*data-key="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(keys,categories);
  assert.match(store,/fetch\(activeCatalogEndpoint/);
  assert.match(store,/\/integracao-host\.json/);
  assert.match(store,/p\.status==="publicado"/);
  assert.match(store,/class="category-enquiry"/);
  assert.doesNotMatch(store,/reference-photo-image/);
  assert.match(store,/categoryStrip\.scrollTo/);
});

test('contato e identidade preservados para futuro painel, sem ativar banco',()=>{
  assert.match(home,/src="\/site-editor-runtime\.js"/);
  assert.match(store,/src="\/site-editor-runtime\.js"/);
  assert.equal(integration.api_site,'');
  assert.equal(integration.api_catalogo,'');
  assert.match(adapter,/if\(!api\)return null/);
  assert.match(adapter,/whatsapp_number/);
});

test('zoom abre foto oficial sem navegar',()=>{
  assert.match(home,/id="photo-viewer"/);
  assert.match(home,/data-image="/);
  assert.match(home,/modal\.showModal\(\)/);
  assert.match(store,/src="\/oss-photo-viewer\.js"/);
  assert.match(viewer,/\.showModal\(\)/);
  assert.match(viewer,/MutationObserver/);
});

test('metadados basicos e sitemap presentes',()=>{
  assert.match(read('sitemap.xml'),/oss-kimonos-site\.onrender\.com\/loja\.html/);
  assert.match(read('robots.txt'),/Sitemap:/);
  assert.match(home,/property="og:site_name"/);
  assert.match(home,/rel="icon"/);
});

test('imagens html possuem texto alternativo',()=>{
  for(const page of [home,store]){
    for(const m of page.matchAll(/<img\b[^>]*>/g))assert.match(m[0],/\balt="/);
  }
});
