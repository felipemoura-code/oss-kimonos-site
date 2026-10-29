/* Visualizador de imagens da OSS Kimonos — somente fotos de produtos.
 * Sem armazenamento, rastreadores ou bibliotecas externas. */
(()=>{
  'use strict';
  const selector='.card img.photo, .detail-item img.detail-item-photo';
  if(!('HTMLDialogElement' in window))return;
  let currentFocus=null;
  const dialog=document.createElement('dialog');
  dialog.className='oss-image-viewer';
  dialog.setAttribute('aria-label','Visualização ampliada de foto de produto OSS');
  const wrap=document.createElement('div');
  wrap.className='oss-viewer-wrap';
  const close=document.createElement('button');
  close.type='button';
  close.className='oss-viewer-close';
  close.textContent='Fechar ×';
  close.setAttribute('aria-label','Fechar foto ampliada');
  const image=document.createElement('img');
  image.alt='';
  image.className='oss-viewer-image';
  const caption=document.createElement('p');
  caption.className='oss-viewer-caption';
  wrap.append(close,image,caption);
  dialog.append(wrap);
  document.body.append(dialog);
  const open=img=>{
    const src=img.currentSrc||img.src;
    if(!src||!/\.(?:png|jpe?g|webp)(?:\?|$)/i.test(src))return;
    try{
      const parsed=new URL(src,location.href);
      if(!['http:','https:'].includes(parsed.protocol))return;
      if(parsed.origin!==location.origin&&parsed.protocol!=='https:')return;
      image.src=parsed.href;
    }catch(_){return;}
    image.alt=img.alt||'Foto de produto OSS Kimonos';
    caption.textContent=img.alt||'Foto de produto OSS Kimonos';
    currentFocus=img;
    dialog.showModal();
    close.focus();
  };
  const dismiss=()=>{if(dialog.open)dialog.close();};
  close.addEventListener('click',dismiss);
  dialog.addEventListener('click',event=>{if(event.target===dialog)dismiss();});
  dialog.addEventListener('close',()=>{
    image.removeAttribute('src');
    if(currentFocus&&currentFocus.isConnected)currentFocus.focus({preventScroll:true});
    currentFocus=null;
  });
  const prepare=root=>{
    for(const img of root.querySelectorAll(selector)){
      if(img.dataset.ossZoomReady==='1')continue;
      img.dataset.ossZoomReady='1';
      img.setAttribute('tabindex','0');
      img.setAttribute('role','button');
      img.setAttribute('aria-label','Ampliar: '+(img.alt||'Foto OSS'));
      img.title='Toque para ampliar a imagem';
    }
  };
  document.addEventListener('click',event=>{
    const img=event.target.closest?.(selector);
    if(img)open(img);
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    if(dialog.open)return;
    const img=event.target.closest?.(selector);
    if(img){event.preventDefault();open(img);}
  });
  prepare(document);
  for(const id of ['detail-items','products-cards']){
    const holder=document.getElementById(id);
    if(holder){
      const observer=new MutationObserver(()=>prepare(holder));
      observer.observe(holder,{childList:true,subtree:true});
    }
  }
})();
