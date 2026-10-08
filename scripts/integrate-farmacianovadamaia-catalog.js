'use strict';
const fs=require('fs'),path=require('path');
const {productFingerprint,extractVolumeMl}=require('./lib/product-fingerprint');
const SLUG='farmacianovadamaia';
const norm=e=>/^0\d{12}$/.test(String(e))?String(e).slice(1):String(e);
const validGtin=e=>/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(String(e))&&[...String(e).slice(0,-1)].reverse().reduce((s,d,i)=>s+Number(d)*(i%2?1:3),Number(String(e).at(-1)))%10===0;
const normalized=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const unitFromName=name=>{const m=String(name||'').match(/\d(?:[.,]\d+)?\s*(ml|l|gr|g)\b/i);return m?(/g/i.test(m[1])?'g':'ml'):null;};
function identityIndex(seed,aliases={}){
 const exact=new Map(),known=new Map();
 const add=(k,p)=>{k=norm(k);if(!known.has(k))known.set(k,new Set());known.get(k).add(p);};
 for(const p of seed.products){exact.set(String(p.ean),p);add(p.ean,p);for(const e of p.eans_antigos||[])add(e,p);}
 for(const [ean,entry]of Object.entries(aliases)){const p=exact.get(ean);if(p)for(const e of entry.aliases||[])add(e,p);}
 const brands=[...new Set(seed.products.map(p=>p.brand).filter(Boolean))].map(b=>({brand:b,text:normalized(b)})).sort((a,b)=>b.text.length-a.text.length);
 const fingerprints=new Map();
 for(const p of seed.products){const key=productFingerprint(p);if(!key)continue;if(!fingerprints.has(key))fingerprints.set(key,[]);fingerprints.get(key).push(p);}
 return {resolve(e){const direct=exact.get(String(e));if(direct)return {product:direct,method:'GTIN'};const list=[...(known.get(norm(e))||[])];return list.length===1?{product:list[0],method:'documented alias/UPC'}:null;},review(item){const name=normalized(item.name);const brand=brands.find(b=>name===b.text||name.startsWith(b.text+' '))?.brand;if(!brand)return [];const fp=productFingerprint({name:item.name,brand});const vol=extractVolumeMl(item.name);return (fingerprints.get(fp)||[]).filter(p=>{const pv=extractVolumeMl(p.name);return !!vol&&!!pv&&vol===pv;}).map(p=>({ean:p.ean,name:p.name,brand:p.brand,reason:'same fingerprint and volume; physical identity requires verification'}));}};
}
function integrate(seed,feed,aliases={},imagePlan=[]){
 if(!feed||feed.in_progress!==false||!Array.isArray(feed.products)||!feed.products.length||!feed.completed_at)throw Error('Incomplete/empty feed');
 const age=Date.now()-Date.parse(feed.completed_at);if(!Number.isFinite(age)||age<0||age>24*3600000)throw Error('Feed older than 24h or invalid date');
 const originalKeys=seed.products.map(p=>p.ean);const index=identityIndex(seed,aliases);const unmatched=[],conflicts=[],buckets=new Map(),blocked=new Set(),knownVolumes=new Map();
 for(const group of seed.store_products)for(const offer of group.items||[])for(const variant of offer.variants||[]){if(variant.volume_ml>0){if(!knownVolumes.has(offer.ean))knownVolumes.set(offer.ean,new Set());knownVolumes.get(offer.ean).add(variant.volume_ml);}}
 for(const row of feed.products){
  if(row.status!=='ok'||!validGtin(row.ean)||!Number.isFinite(row.price)||row.price<=0||typeof row.in_stock!=='boolean'||!/^https:\/\/farmacianovadamaia\.pt\/pt\//.test(row.url))throw Error('Invalid feed row');
  const resolved=index.resolve(row.ean);
  if(!resolved){unmatched.push({ean:row.ean,name:row.name,url:row.url,candidates:index.review(row)});continue;}
  const p=resolved.product;const incomingVolume=extractVolumeMl(row.name),existingVolume=extractVolumeMl(p.name);
  const incomingUnit=unitFromName(row.name),existingUnit=unitFromName(p.name);
  if(incomingUnit&&existingUnit&&incomingUnit!==existingUnit){conflicts.push({ean:row.ean,canonical:p.ean,reason:'mass/volume units differ'});continue;}
  if(incomingVolume&&existingVolume&&incomingVolume!==existingVolume&&!knownVolumes.get(p.ean)?.has(incomingVolume)){conflicts.push({ean:row.ean,canonical:p.ean,reason:'volume not already represented in the product'});continue;}
  const unit=incomingUnit||'ml';const key=p.ean+'|'+(incomingVolume||'unspecified')+'|'+unit;
  if(blocked.has(key))continue;
  if(!buckets.has(p.ean))buckets.set(p.ean,new Map());const variants=buckets.get(p.ean);
  const variant={volume_ml:incomingVolume||null,unit,price:row.price,previous_price:row.previous_price>row.price?row.previous_price:null,in_stock:row.in_stock,url:row.url};
  if(variants.has(key)){const previous=variants.get(key);if(JSON.stringify(previous)!==JSON.stringify(variant)){blocked.add(key);variants.delete(key);conflicts.push({ean:row.ean,canonical:p.ean,reason:'multiple conflicting offers for the same existing volume',previous,incoming:variant});}continue;}
  variants.set(key,variant);
 }
 const items=[];for(const [ean,bucket]of buckets){const variants=[...bucket.values()];if(!variants.length)continue;const available=variants.filter(v=>v.in_stock);const best=(available.length?available:variants).reduce((a,b)=>a.price<=b.price?a:b);
  const item={ean,price:best.price,in_stock:!!available.length,url:best.url,verified:true,verified_url:true,verified_at:feed.completed_at,source:'scraped'};
  if(best.previous_price>best.price)item.previous_price=best.previous_price;
  const sized=variants.filter(v=>v.volume_ml>0);if(sized.length)item.variants=sized;items.push(item);
 }
 if(!items.length)throw Error('No existing product matched; preserve seed');
 const current=seed.store_products.find(g=>g.store_slug===SLUG);
 if(current?.items.length&&items.length<current.items.length*.8)throw Error('Coverage fell by more than 20%; preserve seed');
 if(!seed.stores.some(s=>s.slug===SLUG))seed.stores.push({slug:SLUG,name:'Farmácia Nova da Maia',base_url:'https://farmacianovadamaia.pt',logo_url:null});
 if(current)current.items=items;else seed.store_products.push({store_slug:SLUG,items});
 let images=0;for(const change of imagePlan){const p=seed.products.find(p=>p.ean===change.ean);if(!p||p.image_url!==change.before||!/^https:\/\/farmacianovadamaia\.pt\//.test(change.after)||!change.verified)continue;p.image_url=change.after;images++;}
 if(seed.products.length!==originalKeys.length||seed.products.some((p,i)=>p.ean!==originalKeys[i]))throw Error('Product keys changed');
 return {products_created:0,offers:items.length,active_offers:items.filter(i=>i.in_stock).length,inactive_offers:items.filter(i=>!i.in_stock).length,images,unmatched,conflicts};
}
function main(){
 const root=path.resolve(__dirname,'..'),seedFile=path.join(root,'data/seed-bundle.json'),feedFile=path.join(root,`data/catalog/${SLUG}-full.json`),report=path.join(root,`data/catalog/${SLUG}-integration-report.json`);
 const before=fs.readFileSync(seedFile),seed=JSON.parse(before),feed=JSON.parse(fs.readFileSync(feedFile));
 const aliases=JSON.parse(fs.readFileSync(path.join(root,'data/product-aliases.json')));const planPath=path.join(root,`data/catalog/${SLUG}-images-verified.json`);const plan=fs.existsSync(planPath)?JSON.parse(fs.readFileSync(planPath)):[];
 const result=integrate(seed,feed,aliases,plan);result.seed_bytes_delta=Buffer.byteLength(JSON.stringify(seed))-before.length;
 fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,unmatched:result.unmatched.length,conflicts:result.conflicts.length}));
 if(process.argv.includes('--dry-run')){if(!fs.readFileSync(seedFile).equals(before))throw Error('Dry run wrote seed');return;}
 fs.writeFileSync(seedFile,JSON.stringify(seed));
}
if(require.main===module)main();module.exports={identityIndex,integrate};
