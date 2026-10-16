import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {readFileSync,readdirSync} from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';import {render,indexMinimum} from './product-page.mjs';import {gzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../',import.meta.url)),html=readFileSync(path.join(root,'index.html'),'utf8');
const idx=JSON.parse(readFileSync(path.join(root,'data/idx',readdirSync(path.join(root,'data/idx')).find(f=>f.startsWith('search-')))));
const sample=idx.e.findIndex((e,i)=>idx.mn[i]>0&&idx.ab[i]>idx.mn[i]);const at=sample<0?0:sample;const p={e:idx.e[at],n:idx.nm[at],b:idx.brands[idx.b[at]],s:idx.s[at],lo:indexMinimum(idx,at)};
const ssr=render(html,p,'https://cosmath.example');let srv,browser,base;
before(async()=>{srv=createServer((req,res)=>{try{const u=new URL(req.url,'http://local');const asset=u.pathname.startsWith('/assets/');const file=u.pathname==='/'||u.pathname==='/catalogo'?'index.html':u.pathname.slice(1);const body=u.pathname.startsWith('/produto/')?ssr:readFileSync(path.join(root,file));res.writeHead(200,{'content-type':u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.css')?'text/css':'text/html; charset=utf-8','cache-control':asset?'public, max-age=31536000, immutable':'no-store'});res.end(body)}catch{res.writeHead(404);res.end()}});await new Promise(r=>srv.listen(0,'127.0.0.1',r));base='http://cosmath.localhost:'+srv.address().port;browser=await chromium.launch({headless:true})});
after(async()=>{await browser?.close();await new Promise(r=>srv.close(r))});
function stub(){const q={select(){return q},eq(){return q},in(){return q},order(){return q},limit(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};window.supabase={createClient:()=>({from:()=>q,rpc:async()=>({data:null,error:null}),auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};}
test('HTML leve mantém execução, preço do índice, origem pública e restauro ao fechar ficha',async()=>{
 const ctx=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block'});await ctx.route(u=>!u.href.startsWith(base),r=>r.abort());await ctx.addInitScript(stub);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/produto/'+p.e);await page.waitForFunction(()=>typeof seoAbrirProduto==='function');
 await page.evaluate(()=>garantirIndice());
 await page.evaluate(e=>seoAbrirProduto(e),p.e);
 const canonical=await page.locator('link[rel=canonical]').getAttribute('href');assert.ok(canonical.startsWith('https://cosmath.example/produto/'));
 const json=JSON.parse(await page.locator('#seo-jsonld').textContent());assert.equal(json.name,p.n);assert.equal(json.offers.lowPrice,(p.lo/100).toFixed(2));
 const visible=await page.evaluate(e=>{const s=statsByEanMap()[e];return Math.round((s.absBest??s.bestPrice)*100)},p.e);assert.equal(visible,p.lo);
 assert.equal(await page.locator('h1').count(),1);
 assert.equal(await page.locator('#seo-product-summary').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(()=>seoFecharProduto());assert.equal(await page.locator('#seo-product-summary').count(),0);assert.equal(await page.title(),'CosMath — Compara, combina e poupa em cosmética');
 assert.deepEqual(errors,[]);await ctx.close();
});
test('HTML sem JS já contém produto e preço; mede tamanho gzip da página leve',()=>{assert.ok(ssr.includes('id="seo-product-summary"'));assert.ok(ssr.includes((p.lo/100).toFixed(2)));const bytes=gzipSync(ssr).length;console.log(JSON.stringify({htmlBytes:Buffer.byteLength(ssr),gzipBytes:bytes,assets:readdirSync(path.join(root,'assets')).filter(f=>f.startsWith('cm-')).length}));assert.ok(bytes<60000)});
