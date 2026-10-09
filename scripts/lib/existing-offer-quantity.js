'use strict';
function parseQuantity(name){
 const m=String(name||'').match(/(\d+(?:[.,]\d+)?)\s*(ml|l|kg|gr|g)\b/i);if(!m)return null;
 const raw=Number(m[1].replace(',','.')),label=m[2].toLowerCase();if(!Number.isFinite(raw)||raw<=0)return null;
 return {raw,amount:raw*(label==='l'||label==='kg'?1000:1),unit:/g/.test(label)?'g':'ml'};
}
const quantityFromName=name=>parseQuantity(name)?.amount||null;
const unitFromName=name=>parseQuantity(name)?.unit||null;
function knownVariantKey(variant,canonicalName){
 if(!(variant.volume_ml>0))return null;
 let label='';try{label=decodeURIComponent(new URL(variant.url).pathname).replace(/[-_]/g,' ');}catch{}
 const stated=parseQuantity(label);
 // Older integrations recorded 1kg as 1ml. Only normalize that legacy
 // metadata when the existing URL explicitly states the same quantity.
 if(stated&&(variant.volume_ml===stated.raw||variant.volume_ml===stated.amount))return stated.amount+'|'+stated.unit;
 const unit=variant.unit==='kg'?'g':variant.unit||unitFromName(canonicalName)||'ml';
 const amount=variant.volume_ml*(variant.unit==='kg'?1000:1);return amount+'|'+unit;
}
module.exports={quantityFromName,unitFromName,knownVariantKey};
