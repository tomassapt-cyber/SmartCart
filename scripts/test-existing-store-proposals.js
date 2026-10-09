'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('crypto'),vm=require('vm');
const before=fs.readFileSync('data/seed-bundle.json'),seed=JSON.parse(before),aliases=JSON.parse(fs.readFileSync('data/product-aliases.json'));
const snapshot=JSON.stringify(seed.products),slugs=new Set(['farmacianovadamaia','presencadeluxo']);
const others=JSON.stringify(seed.store_products.filter(g=>!slugs.has(g.store_slug)));
for(const slug of slugs){const {integrate}=require('./integrate-'+slug+'-catalog');const feed=JSON.parse(fs.readFileSync('data/catalog/'+slug+'-full.json'));const result=integrate(seed,feed,aliases);assert.equal(result.products_created,0);assert(result.offers>0);}
assert.equal(JSON.stringify(seed.products),snapshot);assert.equal(JSON.stringify(seed.store_products.filter(g=>!slugs.has(g.store_slug))),others);assert(fs.readFileSync('data/seed-bundle.json').equals(before));
const source=fs.readFileSync('demo.html','utf8'),fn=source.match(/function shippingForStore\(slug, zone\) \{[\s\S]*?\n\}/)[0];
const context={STORE_BY_SLUG:{unknown:{},known:{shipping_zones:{mainland:0,madeira:7}}}};vm.createContext(context);vm.runInContext(fn,context);
assert.equal(context.shippingForStore('unknown','Continente'),null);assert.equal(context.shippingForStore('missing','Continente'),null);assert.equal(context.shippingForStore('known','Continente'),0);assert.equal(context.shippingForStore('known','Madeira'),7);assert.equal(context.shippingForStore('known','Açores'),null);
console.log(JSON.stringify({existing_products:seed.products.length,products_created:0,other_stores_preserved:true,seed_unchanged:true,unknown_shipping_is_not_free:true,seed_sha256:crypto.createHash('sha256').update(before).digest('hex')}));
