// Protótipo isolado: deriva apenas metadados publicáveis do índice do build.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
(async()=>{
const {bucket}=await import('../lib/seo-edge.mjs');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'data/idx');
const files=fs.readdirSync(dir).filter(f=>/^search-[a-f0-9]+\.json$/.test(f)).sort((a,b)=>fs.statSync(path.join(dir,b)).mtimeMs-fs.statSync(path.join(dir,a)).mtimeMs);
if(!files.length)throw Error('Falta índice');
const raw=fs.readFileSync(path.join(dir,files[0])),d=JSON.parse(raw);
if(d.e.length<1000)throw Error('Índice incompleto');
const seed=JSON.parse(fs.readFileSync(path.join(root,'data/seed-bundle.json'))),images=new Map(seed.products.map(p=>[p.ean,p.image_url]));
const chunks=Array.from({length:512},()=>Object.create(null));
for(let i=0;i<d.e.length;i++){
const e=d.e[i],prices=[d.mn[i],d.ab[i]].filter(x=>x>0);let lo=-1;for(const p of prices)if(lo<0||p<lo)lo=p;
chunks[bucket(e)][e]={e,n:d.nm[i],b:d.brands[d.b[i]]||'',s:d.s[i],lo,...(images.get(e)?{i:images.get(e)}:{})};
}
const contents=chunks.map(c=>JSON.stringify(c)),version=crypto.createHash('sha256').update(contents.join('')).digest('hex').slice(0,12),out=path.join(root,'seo-meta',version);fs.mkdirSync(out,{recursive:true});
for(let i=0;i<contents.length;i++)fs.writeFileSync(path.join(out,i+'.json'),contents[i]);
const fallback=fs.readFileSync(path.join(root,'robots.txt'),'utf8').match(/^Sitemap:\s*(\S+)/m)?.[1];
const site=new URL(process.env.COSMATH_SITE||fallback).origin;
fs.writeFileSync(path.join(root,'seo-meta/manifest.json'),JSON.stringify({version,site}));
console.log(JSON.stringify({products:d.e.length,files:contents.length+1,bytes:contents.reduce((n,s)=>n+Buffer.byteLength(s),0),gzipBytes:contents.reduce((n,s)=>n+zlib.gzipSync(s).length,0),version}));
})().catch(e=>{console.error(e);process.exit(1)});
