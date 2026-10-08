'use strict';
const assert=require('node:assert/strict');const {integrate}=require('./integrate-farmacianovadamaia-catalog');
function seed(){return {stores:[],products:[{ean:'3282770146691',name:'Biology A-R 40ml',brand:'A-Derma',image_url:null,eans_antigos:['3282770146677']}],store_products:[]};}
function feed(rows){return {in_progress:false,completed_at:new Date().toISOString(),products:rows};}
const row={status:'ok',ean:'3282770146691',name:'A-Derma Biology A-R Creme Antivermelhidão 40ml',price:22.08,in_stock:true,url:'https://farmacianovadamaia.pt/pt/pele-sensivel/12856-a-derma-biology-a-r-creme-antivermelhidao-40ml-3282770146691.html'};
let s=seed(),r=integrate(s,feed([row,{...row,ean:'5201062007029',name:'Youth Lab. Gel Limpeza 200ml'}]));assert.equal(r.offers,1);assert.equal(r.products_created,0);assert.equal(s.products.length,1);assert.equal(r.unmatched.length,1);
s=seed();r=integrate(s,feed([{...row,ean:'3282770146677',in_stock:false}]));assert.equal(r.inactive_offers,1);assert.equal(s.store_products[0].items[0].ean,'3282770146691');
s=seed();r=integrate(s,feed([row]),{},[{ean:row.ean,before:null,after:'https://farmacianovadamaia.pt/image.jpg',verified:true}]);assert.equal(r.images,1);assert.equal(s.products.length,1);
s=seed();r=integrate(s,feed([row]),{},[{ean:row.ean,before:'obsolete',after:'https://farmacianovadamaia.pt/image.jpg',verified:true}]);assert.equal(r.images,0);
assert.throws(()=>integrate(seed(),feed([])));assert.throws(()=>integrate(seed(),{...feed([row]),in_progress:true}));assert.throws(()=>integrate(seed(),{...feed([row]),completed_at:'2020-01-01T00:00:00Z'}));assert.throws(()=>integrate(seed(),feed([{...row,price:-1}])));
assert.throws(()=>integrate(seed(),feed([row,{...row,price:99}])));assert.throws(()=>integrate(seed(),feed([{...row,name:'A-Derma Biology A-R 50ml'}])));
assert.throws(()=>integrate(seed(),feed([{...row,name:'A-Derma Biology A-R 40g'}])));
s=seed();s.store_products=[{store_slug:'existing-store',items:[{ean:row.ean,variants:[{volume_ml:50,price:5}]}]}];const otherStore=JSON.stringify(s.store_products[0]);r=integrate(s,feed([row,{...row,ean:'3282770146677',name:'A-Derma Biology A-R 50ml',price:30,in_stock:false,url:row.url+'#50'}]));assert.equal(s.products.length,1);assert.equal(r.offers,1);assert.equal(s.store_products[1].items[0].variants.length,2);assert.equal(s.store_products[1].items[0].price,row.price);assert.equal(JSON.stringify(s.store_products[0]),otherStore);
console.log('Existing-only integration: no creation, renamed title, documented alias, stock, image conflict, incomplete/stale/empty feed, bad price, duplicate conflict and wrong volume passed');
