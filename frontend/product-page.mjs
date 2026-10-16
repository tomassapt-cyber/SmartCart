const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
// O caminho do índice da UI usa absBest ?? bestPrice, não min(mn, ab).
export function indexMinimum(index,i){return Number.isInteger(index.ab?.[i])&&index.ab[i]>0?index.ab[i]:Number.isInteger(index.mn?.[i])&&index.mn[i]>0?index.mn[i]:-1}
export function bucket(key){let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)%512}
export function productPath(e,n){const s=String(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70);return '/produto/'+encodeURIComponent(e)+(s?'/'+s:'')}
export function render(shell,p,site){
 const homeTitle=shell.match(/<title>([^]*?)<\/title>/i)?.[1]||'CosMath';
 const origin=new URL(site).origin,url=origin+productPath(p.e,p.n),shops=p.s+' '+(p.s===1?'loja':'lojas');
 const price=Number.isInteger(p.lo)&&p.lo>0?(p.lo/100).toFixed(2):null;
 const title=p.n+(p.b?' — '+p.b:'')+' | preço em '+shops+' | CosMath';
 const description='Compara '+p.n+' em '+shops+' portuguesas.'+(price?' Desde '+price.replace('.',',')+' €, sem portes.':'')+' Confirma as condições na loja.';
 shell=shell.replace(/<title>[^]*?<\/title>/i,()=>'<title>'+escape(title)+'</title>');
 shell=shell.replace(/<meta\b[^>]*name="description"[^>]*>/i,()=>'<meta name="description" content="'+escape(description)+'">');
 shell=shell.replace(/<link\b[^>]*rel="canonical"[^>]*>\s*/gi,'');
 shell=shell.replace(/<meta\b[^>]*name\s*=\s*["']cm-site["'][^>]*>\s*/gi,'');
 shell=shell.replace(/<meta\b[^>]*property="og:(?:title|description|url|type|image)"[^>]*>\s*/gi,'');
 const product={'@context':'https://schema.org','@type':'Product',name:p.n,url,...(p.b?{brand:{'@type':'Brand',name:p.b}}:{})};
 if(p.i&&/^https?:\/\//.test(p.i))product.image=p.i;
 if(price)product.offers={'@type':'AggregateOffer',priceCurrency:'EUR',lowPrice:price,offerCount:p.s};
 const json=JSON.stringify(product).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const home=JSON.stringify({title:homeTitle,site:origin}).replace(/</g,'\\u003c');
 const head='<meta name="cm-site" content="'+escape(origin)+'"><script type="application/json" id="seo-home-meta">'+home+'</script><link rel="canonical" id="seo-canonical" href="'+escape(url)+'">'+[['type','product'],['title',title],['description',description],['url',url],['image',product.image||origin+'/apple-touch-icon-v4.png']].map(([k,v])=>'<meta property="og:'+k+'" id="seo-og-'+({description:'desc'}[k]||k)+'" content="'+escape(v)+'">').join('')+'<script type="application/ld+json" id="seo-jsonld">'+json+'</script>';
 shell=shell.replace('</head>',()=>head+'</head>');
 // Um só h1 visível. O template guarda a frase original para repor ao fechar.
 shell=shell.replace(/<h1>[^]*?<\/h1>/i,original=>'<template id="seo-home-heading">'+original+'</template><h1>'+escape(p.n)+'</h1><p id="seo-product-summary">'+escape(description)+'</p>');
 return shell;
}
export function createHandler(fetcher=fetch,{now=Date.now,manifestTtlMs=30000,maxChunks=16}={}){
 const manifests=new Map(),shells=new Map(),chunks=new Map();
 // Promessas partilhadas evitam repetir leituras simultâneas. Falhas saem da
 // memória: não guardar um erro nem servir conteúdo antigo quando a origem falha.
 async function memo(cache,key,limit,ttl,load){
  const hit=cache.get(key);
  if(hit&&hit.until>now()){cache.delete(key);cache.set(key,hit);return hit.promise}
  if(hit)cache.delete(key);
  const entry={until:now()+ttl};
  entry.promise=Promise.resolve().then(load).catch(error=>{if(cache.get(key)===entry)cache.delete(key);throw error});
  cache.set(key,entry);while(cache.size>limit)cache.delete(cache.keys().next().value);
  return entry.promise;
 }
 return async request=>{
  const u=new URL(request.url);if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
  const ids=u.searchParams.getAll('ean');const key=ids[0];if(ids.length!==1||!key||key.length>200||/[\/\\\x00-\x1f]/.test(key))return new Response('Produto não encontrado',{status:404,headers:{'Cache-Control':'no-store'}});
  try{
   let reads=0;
   const get=async p=>{reads++;const r=await fetcher(u.origin+p,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Recurso indisponível');return r};
   const m=await memo(manifests,u.origin,2,manifestTtlMs,async()=>{
    const m=await(await get('/seo-meta/manifest.json')).json();
    if(m.v!==1||!/^https?:\/\//.test(m.site)||!/^\w{8,64}$/.test(m.version))throw Error('Contrato inválido');
    const site=new URL(m.site);if(site.username||site.password||site.pathname!=='/'||site.search||site.hash)throw Error('Origem inválida');
    return m;
   });
   const chunkKey=u.origin+'/seo-meta/'+m.version+'/'+bucket(key)+'.json';
   const entries=await memo(chunks,chunkKey,maxChunks,Infinity,async()=>{
    const data=await(await get('/seo-meta/'+m.version+'/'+bucket(key)+'.json')).json();
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Pedaço inválido');return data;
   });
   if(!Object.hasOwn(entries,key))return new Response('Produto não encontrado',{status:404,headers:{'Cache-Control':'no-store'}});
   const p=entries[key];if(p.e!==key||typeof p.n!=='string'||!Number.isInteger(p.s)||p.s<1||!Number.isInteger(p.lo))throw Error('Ficha inválida');
   const shell=await memo(shells,u.origin+'|'+m.version,2,Infinity,async()=>{
    const html=await(await get('/seo-shell.html')).text();
    if(html.includes('<style')||/<script\b(?![^>]*\b(?:src|type)=)[^>]*>/i.test(html))throw Error('Shell não preparada');return html;
   });
   const html=render(shell,p,m.site);
   return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate','Vercel-CDN-Cache-Control':'public, max-age=300, stale-while-revalidate=600','X-Cosmath-Catalog':m.version,'X-Cosmath-Internal-Reads':String(reads)}});
  }catch{return new Response('Ficha temporariamente indisponível',{status:503,headers:{'Cache-Control':'no-store'}})}
 };
}
