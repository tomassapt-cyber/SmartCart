const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

async function scenario(file, total, valid) {
  let catalog = 'CATALOGO ANTERIOR';
  let writes = 0;
  const urls = Array.from({length: total}, (_, i) => `https://example.test/${file.includes('haemi') ? 'products' : 'fr'}/item-${i}`);
  const product = '<script type="application/ld+json">' + JSON.stringify({'@type':'Product',name:'Produto',gtin13:'8809876543216',offers:{price:12,availability:'https://schema.org/InStock'}}) + '</script>';
  const module = {exports:{}};
  const fakeRequire = name => name === 'fs' ? {existsSync:()=>true,writeFileSync:(_,data)=>{ catalog=data; writes++; },statSync:()=>({size:catalog.length})} : name === './lib/imagem-valida' ? {imagemDoJsonLd:()=>null} : require(name);
  fakeRequire.main = module;
  let requests = 0;
  let finished;
  const completion = new Promise(resolve=>{finished=resolve;});
  const context = {
    module,require:fakeRequire,__dirname:path.dirname(file),
    process:{argv:['node',file,'--concurrency=1','--delay=0'],exit:code=>{finished({code});throw new Error('EXIT');}},
    console:{log:message=>{if(String(message).startsWith('\n✓')) finished({code:0});},error:()=>{}},
    setTimeout:fn=>{fn();},
    fetch:async url=>{
      if(url.endsWith('/sitemap.xml')) return {status:200,text:async()=>'<loc>https://example.test/sitemap_products_1.xml</loc>'};
      if(url.includes('sitemap')) return {status:200,text:async()=>urls.map(u=>`<loc>${u}</loc>`).join('')};
      requests++;
      return {status:200,text:async()=>valid ? product : '<html>Sem produto</html>'};
    },
  };
  fakeRequire.main = {};
  vm.runInNewContext(fs.readFileSync(file,'utf8') + '\nmain().catch(() => {});', context, {filename:file});
  const result = await completion;
  assert.equal(requests,total);
  if(valid) { assert.equal(result.code,0); assert.equal(JSON.parse(catalog).products.length,total); }
  else { assert.equal(result.code,1); assert.equal(catalog,'CATALOGO ANTERIOR',`Catálogo substituído (${writes} escritas)`); }
  return {file:path.basename(file),total,valid,writes,exit:result.code};
}
(async()=>{
  const root=process.argv[2] || path.resolve(__dirname, '..');
  for(const [file,total] of [['scrape-pharmagdd-catalog.js',100],['scrape-haemiskin-catalog.js',140]]) {
    for(const valid of [false,true]) {
      try { console.log(JSON.stringify(await scenario(path.join(root,'scripts',file),total,valid))); }
      catch(error) { console.error(file,error.message); process.exitCode=1; }
    }
  }
})();
