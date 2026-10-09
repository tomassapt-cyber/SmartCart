'use strict';
const assert=require('node:assert/strict'),{quantityFromName,unitFromName,knownVariantKey}=require('./lib/existing-offer-quantity');
assert.equal(quantityFromName('Mask 1kg'),1000);assert.equal(quantityFromName('Mask 1000gr'),1000);assert.equal(quantityFromName('Mask 1,5 kg'),1500);assert.equal(quantityFromName('Shampoo 1L'),1000);assert.equal(unitFromName('1kg'),'g');assert.equal(unitFromName('1L'),'ml');
assert.equal(knownVariantKey({volume_ml:1,unit:'ml',url:'https://shop.example/mask-1kg'},'Mask 400g'),'1000|g');
assert.equal(knownVariantKey({volume_ml:1000,unit:'ml',url:'https://shop.example/shampoo-1l'},'Mask 400g'),'1000|ml');
for(const slug of ['presencadeluxo','farmacianovadamaia']){
 const {integrate}=require('./integrate-'+slug+'-catalog');const make=name=>({products:[{ean:'3282770146691',brand:'Fixture',name}],stores:[],store_products:[]});
 const row={ean:'3282770146691',status:'ok',name:'Mask 1kg',price:10,in_stock:true,tax_included:true,additional_shipping_cost:0,url:slug==='presencadeluxo'?'https://presencadeluxo.pt/mask-3282770146691.html':'https://farmacianovadamaia.pt/pt/mask-3282770146691.html'};
 const feed={in_progress:false,completed_at:new Date().toISOString(),products:[row]};let seed=make('Mask 1000g');integrate(seed,feed);assert.equal(seed.store_products[0].items[0].variants[0].volume_ml,1000);assert.equal(seed.store_products[0].items[0].variants[0].unit,'g');
 assert.throws(()=>integrate(make('Mask 1L'),feed));assert.throws(()=>integrate(make('Mask 500g'),feed));
 seed=make('Mask 400g');seed.store_products=[{store_slug:'other',items:[{ean:row.ean,variants:[{volume_ml:1,unit:'ml',url:'https://shop.example/mask-1kg'}]}]}];const before=JSON.stringify(seed.store_products[0]);integrate(seed,feed);assert.equal(JSON.stringify(seed.store_products[0]),before);assert.equal(seed.store_products[1].items[0].variants[0].volume_ml,1000);
 seed=make('Mask 400g');seed.store_products=[{store_slug:'other',items:[{ean:row.ean,variants:[{volume_ml:1000,unit:'ml',url:'https://shop.example/mask-1l'}]}]}];assert.throws(()=>integrate(seed,feed));
}
console.log('Both stores: kg/g normalization, no kg/l equivalence, no unknown size, documented legacy quantity, zero products and other offers preserved passed');
const fs=require('fs'),vm=require('vm'),source=fs.readFileSync(require('path').join(__dirname,'../demo.html'),'utf8'),context={};vm.createContext(context);
for(const name of ['_volFromName','offerPriceAtVol']){const fn=source.match(new RegExp('function '+name+'\\([^]*?\\n\\}'))[0];vm.runInContext(fn,context);}
const ref=context._volFromName('Mask 1kg');assert.equal(ref,1000);assert.equal(context.offerPriceAtVol({variants:[{volume_ml:1,price:10}]},ref),null);assert.equal(context.offerPriceAtVol({variants:[{volume_ml:quantityFromName('Mask 1kg'),price:10}]},ref),10);
console.log('Actual frontend reference quantity and exact-size price lookup aligned without modifying template');
