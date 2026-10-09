const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
async function scenario(name,mode){
  const total=101,files=new Map(),logs=[];
  const scripts=path.join(root,'scripts'),out=path.join(root,'data/catalog',`${name}-full.json`);
  files.set(out,'CATALOGO ANTERIOR');
  const part=name==='haemiskin'?'products':name==='pharmagdd'?'fr':name==='quickfarma'?'product':name==='farmaciavirtual'?'produto':'beleza/cabelo';
  const urls=Array.from({length:total},(_,i)=>`https://example.test/${part}/item-${i}`);
  const xml=links=>'<urlset>'+links.map(u=>`<loc>${u}</loc>`).join('')+'</urlset>';
  const html=name==='barreiros'?'<meta property="og:title" content="Vichy Creme"><script>{"ean13":"3337871323394","price_amount":12,"availability":"InStock"}</script>':'<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Vichy Creme',gtin13:'3337871323394',sku:'6887752',offers:{price:12,availability:'https://schema.org/InStock'}})+'</script>';
  if(mode==='resume')files.set(out+'.checkpoint',JSON.stringify({products:urls.slice(0,99).map(url=>({url,status:'ok',name:'Vichy Creme',ean:'3337871323394',price:12}))}));
  let productRequests=0,blockedRequests=0,renameCount=0;
  async function fetchMock(url){
    const sitemap=String(url).includes('.xml');
    let body='',status=200;
    if(sitemap){
      if(mode==='bad-sitemap')body='<html>Erro da loja</html>';
      else if(String(url).includes('sitemap-product.xml')||String(url).includes('sitemap_products_')||String(url).includes('product-sitemap.xml')||String(url).includes('wp-sitemap-posts-product')||String(url).includes('1_pt_0_sitemap'))body=xml(urls);
      else body=xml(['https://example.test/'+(name==='haemiskin'?'sitemap_products_1.xml':name==='quickfarma'?'product-sitemap.xml':name==='farmaciavirtual'?'wp-sitemap-posts-product-1.xml':'1_pt_0_sitemap.xml')]);
    }else{
      productRequests++;
      const index=Number(String(url).match(/item-(\d+)/)[1]);
      if(index===100 && ['403','429','500'].includes(mode)){status=Number(mode);blockedRequests++;}
      if(index===100 && mode==='network')throw new Error('Rede indisponível');
      body=mode==='empty'?'<html>Sem produto</html>':mode==='challenge' && index===100?'<title>Just a moment...</title><script>cf-chl-token</script>':html;
    }
    return {status,ok:status>=200&&status<300,url,headers:{get:()=>sitemap?'application/xml':'text/html'},text:async()=>body,body:{cancel:async()=>{}}};
  }
  const quiet={log:(...args)=>logs.push(args.join(' ')),error:(...args)=>logs.push(args.join(' ')),warn:()=>{}};
  const helperModule={exports:{}};
  const helperFile=path.join(scripts,'lib/catalog-http.js');
  if(fs.existsSync(helperFile))vm.runInNewContext(fs.readFileSync(helperFile,'utf8'),{module:helperModule,console:quiet,URL,AbortSignal,AbortController,globalThis:{fetch:fetchMock}});
  const module={exports:{}};
  const mockFs={existsSync:p=>files.has(p)||!p.includes('full.json'),readFileSync:p=>{if(!files.has(p))throw Error('Missing fixture file');return files.get(p);},mkdirSync:()=>{},statSync:()=>({size:100}),writeFileSync:(p,v)=>files.set(p,v),renameSync:(from,to)=>{assert.ok(files.has(from));if(mode==='rename-failure')throw Error('Disco indisponível');files.set(to,files.get(from));files.delete(from);renameCount++;}};
  const req=id=>id==='fs'?mockFs:id==='./lib/catalog-http'?helperModule.exports:id==='./lib/imagem-valida'?{imagemDoJsonLd:()=>null}:id==='./lib/product-fingerprint'?{isNonCosmetic:()=>false}:id==='child_process'?{spawnSync:()=>({stdout:''})}:require(id);
  let exit;
  const context={module,require:req,__dirname:scripts,fetch:fetchMock,console:quiet,setTimeout:fn=>fn(),process:{argv:['node','scraper','--concurrency=1','--delay=0',...(mode==='limit'?['--limit=2']:[]),...(mode==='resume'?['--resume']:[])],exit:code=>{exit=code;throw Error('EXIT');},on:()=>{}}};
  context.done=(error)=>{if(error && exit===undefined)exit=1;};
  const source=fs.readFileSync(path.join(scripts,`scrape-${name}-catalog.js`),'utf8');
  await vm.runInNewContext(source+'\nmain().then(() => done()).catch(done);',context);
  if(mode==='valid'||mode==='resume'){
    assert.equal(exit,undefined);
    assert.equal(JSON.parse(files.get(out)).products.length,total);
    if(fs.existsSync(helperFile)) { assert.equal(renameCount,1); assert.ok(!files.has(out+'.checkpoint')); }
    if(mode==='resume')assert.equal(productRequests,2);
  }else{
    assert.ok(files.get(out)==='CATALOGO ANTERIOR',`${mode}: catálogo anterior substituído`);
    if(mode==='limit')assert.equal(exit,undefined);else assert.equal(exit,1);
    if(['403','429'].includes(mode))assert.equal(blockedRequests,1,'bloqueio repetido');
    if(mode==='bad-sitemap')assert.equal(productRequests,0);
  }
  if(mode==='empty' && fs.existsSync(helperFile))assert.equal(logs.filter(x=>x.startsWith('[catalog-skip]')).length,5);
  console.log(`PASS ${name} ${mode}`);
}
(async()=>{
  let failed=0;
  for(const name of ['pharmagdd','haemiskin','barreiros','quickfarma','farmaciavirtual'])for(const mode of ['valid','empty','403','429','500','bad-sitemap','limit','network','challenge','rename-failure','resume']){
    try{await scenario(name,mode);}catch(error){console.error(`FAIL ${name} ${mode}: ${error.message}`);failed++;}
  }
  process.exitCode=failed?1:0;
})();
