const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..'),{identityIndex}=require('./integrate-presencadeluxo-catalog');
const valid=s=>/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(s)&&([...s.slice(0,-1)].reverse().reduce((n,d,i)=>n+Number(d)*(i%2===0?3:1),0)+Number(s.at(-1)))%10===0;
function select(seed,aliases,urls){const index=identityIndex(seed,aliases),selected=[],unmatched=[];let invalid=0;
 for(const url of new Set(urls)){if(!/^https:\/\/presencadeluxo\.pt\//.test(url))continue;const m=url.match(/-(\d{8,14})\.html$/);if(!m)continue;const ean=m[1];if(!valid(ean)){invalid++;continue;}const found=index.resolve(ean);const name=decodeURIComponent(url.split('/').at(-1)).replace(/^\d+-/,'').replace(/-\d{8,14}\.html$/,'').replaceAll('-',' ');
  if(found)selected.push({url,ean,canonical:found.product.ean,existing_name:found.product.name,method:found.method});else unmatched.push({url,ean,name,candidates:index.review({name})});}
 return {scope:'existing-products-only',selected,unmatched,invalid_gtin:invalid,existing_products:seed.products.length};}
if(require.main===module){const seed=JSON.parse(fs.readFileSync(path.join(root,'data/seed-bundle.json'))),aliases=JSON.parse(fs.readFileSync(path.join(root,'data/product-aliases.json'))),urls=JSON.parse(fs.readFileSync(process.argv[2]));fs.writeFileSync(process.argv[3],JSON.stringify(select(seed,aliases,urls),null,2));}
module.exports={select};
