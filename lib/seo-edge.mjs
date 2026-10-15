// Protótipo de medição: só Web APIs, sem catálogo no bundle da função.
export function bucket(key) { let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)%512; }
export function slug(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)}
export function productPath(ean,name){const s=slug(name);return '/produto/'+encodeURIComponent(ean)+(s?'/'+s:'')}
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function render(html,p,site){
 const url=site+productPath(p.e,p.n),shops=p.s===1?'1 loja':p.s+' lojas';
 const title=p.n+(p.b?' — '+p.b:'')+' | preço em '+shops+' | CosMath';
 const desc='Compara '+p.n+' em '+shops+' portuguesas.'+(p.lo>0?' Desde '+(p.lo/100).toFixed(2).replace('.',',')+' €, sem portes.':'');
 const product={'@context':'https://schema.org','@type':'Product',name:p.n,url};
 if(p.b)product.brand={'@type':'Brand',name:p.b};
 if(p.i)product.image=p.i;
 if(/^\d{13}$/.test(p.e))product.gtin13=p.e;
 if(p.lo>0)product.offers={'@type':'AggregateOffer',priceCurrency:'EUR',lowPrice:(p.lo/100).toFixed(2),offerCount:p.s};
 const replacements=[[/<title>[^]*?<\/title>/i,'<title>'+escape(title)+'</title>'],[/<link\b[^>]*id="seo-canonical"[^>]*>/i,'<link rel="canonical" id="seo-canonical" href="'+escape(url)+'">'],[/<meta\b[^>]*name="description"[^>]*>/i,'<meta name="description" content="'+escape(desc)+'">']];
 for(const [pattern,value]of replacements){if(!pattern.test(html))throw Error('Shell SEO incompatível');html=html.replace(pattern,()=>value)}
 for(const [id,value]of [['seo-og-type','product'],['seo-og-title',title],['seo-og-desc',desc],['seo-og-url',url],...(p.i?[['seo-og-image',p.i]]:[])]){
 const pattern=new RegExp('<meta\\b[^>]*id="'+id+'"[^>]*>','i');html=html.replace(pattern,tag=>tag.replace(/content="[^"]*"/,()=> 'content="'+escape(value)+'"'));
 }
 const json=JSON.stringify(product).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return html.replace('</head>','<script type="application/ld+json" id="seo-jsonld">'+json+'</script>\n</head>');
}
export function createHandler(fetcher=fetch){
 const cache=new Map();
 async function read(url,type){const old=cache.get(url);if(old&&old.until>Date.now())return old.value;const r=await fetcher(url,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Recurso indisponível');const value=type==='json'?await r.json():await r.text();if(cache.size>=34)cache.delete(cache.keys().next().value);cache.set(url,{value,until:Date.now()+60000});return value}
 return async function(request){
 const start=performance.now(),u=new URL(request.url);
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 let key;try{key=decodeURIComponent(u.pathname.split('/')[2]||'')}catch{return new Response('Endereço inválido',{status:400})}
 if(!key||key.length>200||/[\/\\\x00-\x1f]/.test(key))return new Response('Produto não encontrado',{status:404});
 try{
 const manifest=await read(u.origin+'/seo-meta/manifest.json','json');
 const entries=await read(u.origin+'/seo-meta/'+manifest.version+'/'+bucket(key)+'.json','json');
 const p=Object.hasOwn(entries,key)?entries[key]:null;
 if(!p)return new Response('Produto não encontrado',{status:404,headers:{'cache-control':'no-store'}});
 const shell=await read(u.origin+'/','text'),loaded=performance.now();
 const output=render(shell,p,manifest.site),done=performance.now();
 return new Response(request.method==='HEAD'?null:output,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','server-timing':`resources;dur=${(loaded-start).toFixed(2)}, transform;dur=${(done-loaded).toFixed(2)}`,'x-robots-tag':'noindex'}});
 }catch{return new Response('Ficha temporariamente indisponível',{status:503,headers:{'cache-control':'no-store'}})}
 };
}
