const assert=require('node:assert/strict'),{select}=require('./discover-presencadeluxo-existing');
const p={ean:'3282770146691',name:'A-Derma Biology A-R 40ml',brand:'A-Derma',eans_antigos:['3282770146677']},seed={products:[p]};
const existing='https://presencadeluxo.pt/skin/1-other-title-3282770146691.html',alias='https://presencadeluxo.pt/skin/2-different-title-3282770146677.html',unknown='https://presencadeluxo.pt/skin/3-new-name-5201062007029.html';
const before=JSON.stringify(seed),r=select(seed,{},[existing,existing,alias,unknown,'https://presencadeluxo.pt/invalid-3282770146692.html','https://example.com/a-3282770146691.html']);
assert.equal(r.selected.length,2);assert.equal(r.unmatched.length,1);assert.equal(r.invalid_gtin,1);assert(r.selected.every(p=>p.canonical===seed.products[0].ean));assert.equal(JSON.stringify(seed),before);assert.equal(select(seed,{},[]).selected.length,0);
const alternate='https://presencadeluxo.pt/skin/4-biology-a-r-40ml-a-derma-5201062007029.html';
const reviewed=select(seed,{},[alternate]);assert.equal(reviewed.selected.length,0);assert.equal(reviewed.unmatched[0].candidates[0].ean,p.ean);
assert.equal(select(seed,{},[alternate.replace('40ml','40g')]).unmatched[0].candidates.length,0);
console.log('Existing-only discovery: exact identity, historical alias, duplicates, invalid GTIN, wrong host, alternate name review, quantity/unit guard and no seed mutation passed');
