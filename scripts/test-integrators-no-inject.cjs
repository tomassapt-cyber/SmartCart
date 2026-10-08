const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const lib=path.join(root,'scripts/lib');
const seed={products:[{ean:'3337871323394',name:'Vichy Dercos Champô 200 ml',brand:'Vichy'}],stores:[{slug:'origem'}],store_products:[{store_slug:'origem',items:[{ean:'3337871323394',url:'https://example.test/origem',price:15}]}]};
const feed={scraped_at:'2026-10-08T10:00:00.000Z',products:[{status:'ok',ean:'3337871323394',cnp:'6887752',name:'Vichy Dercos Champô 200 ml',brand:'Vichy',url:'https://example.test/produto',price:14.9,in_stock:true,volume_ml:200,variants:[]}]};
function run(slug,noInject){
  let saved;
  const calls=[];
  const mockFs={existsSync:()=>true,readdirSync:()=>['origem-full.json'],statSync:()=>({size:1000}),readFileSync:file=>{
    if(file.endsWith('seed-bundle.json'))return JSON.stringify(seed);
    if(file.endsWith('origem-full.json'))return JSON.stringify({products:[{url:'https://example.test/origem',cnp:'6887752'}]});
    return JSON.stringify(feed);
  },writeFileSync:(_,value)=>{saved=JSON.parse(value);}};
  const module={exports:{}};
  const req=id=>id==='fs'?mockFs:id==='child_process'?{spawnSync:(_,args)=>{calls.push(path.basename(args[0]));return {status:0};}}:id.startsWith('./')?require(path.join(lib,id.replace('./lib/','').replace('./',''))):require(id);
  const isGaia=slug==='farmaciagaiajardim';
  const sourceFile=isGaia?path.join(lib,'integrar-farmacia.js'):path.join(root,'scripts/integrate-farmaciavirtual-catalog.js');
  const code=fs.readFileSync(sourceFile,'utf8')+(isGaia?'\nintegrarFarmacia({slug:"farmaciagaiajardim",criarDermo:true,loja:{name:"Gaia",base_url:"https://example.test"}});':'');
  vm.runInNewContext(code,{module,require:req,__dirname:path.dirname(sourceFile),process:{argv:['node',sourceFile,...(noInject?['--no-inject']:[])],exit:()=>{throw Error('Unexpected exit');}},console:{log:()=>{},error:()=>{},warn:()=>{}}});
  return {saved,calls};
}
for(const slug of ['farmaciagaiajardim','farmaciavirtual']){
  const standard=run(slug,false),fast=run(slug,true);
  assert.deepEqual(fast.saved,standard.saved);
  assert.equal(standard.calls.filter(x=>x==='inject-seed-into-demo.js').length,1);
  assert.equal(fast.calls.filter(x=>x==='inject-seed-into-demo.js').length,0);
  assert.deepEqual(fast.saved.store_products.find(x=>x.store_slug==='origem'),seed.store_products[0]);
  assert.equal(fast.saved.store_products.find(x=>x.store_slug===slug).items.length,1);
  console.log(`PASS ${slug}: seed idêntico, oferta integrada, outra loja preservada, render omitido`);
}
