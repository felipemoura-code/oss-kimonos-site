/* OSS Kimonos — adaptação para conteúdo do editor PHP na HostGator.
 * Sem api_site configurada, preserva integralmente o site atual no Render.
 * Nenhum segredo, token ou login deve aparecer neste arquivo.
 */
(()=>{
'use strict';
const configURL='/integracao-host.json';
const applyText=(selector,value)=>{
  if(typeof value!=='string'||!value.trim()||value.length>2000)return;
  const node=document.querySelector(selector);
  if(node)node.textContent=value.trim();
};
const validImage=(value,origin)=>{
  if(typeof value!=='string'||value.length>1000)return false;
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&url.origin===origin&&/^\/oss-backend\/uploads\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(url.pathname);
  }catch(_){return false;}
};
const applySite=(site,origin)=>{
 if(!site||typeof site!=='object')return;
 const home=!!document.querySelector('#inicio .hero-content');
 if(home){
   const pairs=[
     ['.hero .eyebrow','hero_eyebrow'],['.hero h1','hero_title'],['.hero-content .hero-sub, .hero-content p','hero_description'],
     ['#categorias .section-head h2, #colecao .heading h2','collection_title'],
     ['#categorias .section-head p, #colecao .heading .muted','collection_description'],
     ['#sobre h2','about_title'],['#sobre .story-copy p, #sobre p','about_text'],
     ['#contato h2','contact_title'],['#contato p','contact_text'],
   ];
   for(const [selector,key] of pairs)applyText(selector,site[key]);
   const h=document.querySelector('.hero h1');
   if(h&&typeof site.hero_title==='string'&&site.hero_title.trim())h.style.whiteSpace='pre-line';
   if(validImage(site.banner_image,origin)){
     const visual=document.querySelector('.hero-visual');
     if(visual)visual.style.backgroundImage='url("'+site.banner_image+'")';
     else{
       const el=document.querySelector('.hero');
       if(el)el.style.backgroundImage='linear-gradient(90deg,rgba(8,8,9,.87),rgba(8,8,9,.21)),url("'+site.banner_image+'")';
     }
   }
   if(validImage(site.about_image,origin)){
     const story=document.querySelector('.story-image');
     if(story)story.style.backgroundImage='url("'+site.about_image+'")';
     else{
       const img=document.querySelector('.about .graphic img');
       if(img)img.src=site.about_image;
     }
   }
 }
 if(/^#[a-f0-9]{6}$/i.test(site.accent_color||'')){
  document.documentElement.style.setProperty('--gold',site.accent_color);
  document.documentElement.style.setProperty('--accent',site.accent_color);
 }
 if(validImage(site.logo_image,origin)){
  for(const logo of document.querySelectorAll('img[src*="oss-logo."]'))logo.src=site.logo_image;
 }
 if(typeof site.whatsapp_number==='string'&&/^55[0-9]{10,11}$/.test(site.whatsapp_number)){
  for(const link of document.querySelectorAll('a[href*="wa.me/"]')){
   try{const url=new URL(link.href);if(url.hostname==='wa.me'&&/^\/[0-9]{12,13}$/.test(url.pathname)){url.pathname='/'+site.whatsapp_number;link.href=url.href;}}catch(_){}
  }
 }
 if(typeof site.instagram_url==='string'){
  try{const url=new URL(site.instagram_url);
    if(url.protocol==='https:'&&['instagram.com','www.instagram.com'].includes(url.hostname)){
      for(const link of document.querySelectorAll('a[href*="instagram.com"]'))link.href=url.href;
    }
  }catch(_){}
 }
};
fetch(configURL,{cache:'no-store'})
 .then(r=>r.ok?r.json():null)
 .then(config=>{
  const api=typeof config?.api_site==='string'?config.api_site.trim():'';
  if(!api)return null;
  const url=new URL(api);
  if(url.protocol!=='https:'||!url.pathname.endsWith('/api/site.php'))return null;
  return fetch(url.href,{mode:'cors',cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>({data,origin:url.origin}));
 })
 .then(result=>{if(result?.data?.site)applySite(result.data.site,result.origin);})
 .catch(()=>{/* Sem API configurada/online, mantém o site atual intacto. */});
})();
