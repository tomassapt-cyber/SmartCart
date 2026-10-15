import assert from 'node:assert/strict';
import {test, before, after} from 'node:test';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const html=readFileSync(new URL('../demo.html',import.meta.url),'utf8');
let server,browser,base;
before(async()=>{server=createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({headless:true})});
after(async()=>{await browser?.close();await new Promise(r=>server.close(r))});
async function open(route){const ctx=await browser.newContext({serviceWorkers:'block'});await ctx.route(u=>!u.href.startsWith(base),r=>r.abort());const page=await ctx.newPage();await page.goto(base+route);await page.waitForFunction(()=>typeof seoAbrirProduto==='function');return{page,ctx}}
test('HTML inicial partilhado não declara a homepage como canonical de uma ficha',async()=>{const r=await fetch(base+'/produto/5601000000011/exemplo');assert.equal(r.status,200);assert.doesNotMatch(await r.text(),/<link\b[^>]*rel=["']canonical["']/i)});
test('homepage e catálogo criam apenas um canonical de base com JavaScript',async()=>{for(const route of ['/','/catalogo']){const{page,ctx}=await open(route);assert.equal(await page.locator('link[rel=canonical]').count(),1);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),base+'/');await ctx.close()}});
test('ficha não recebe canonical / durante a carga; abrir, trocar e fechar mantêm um só',async()=>{const{page,ctx}=await open('/produto/5601000000011/exemplo');assert.equal(await page.locator('link[rel=canonical]').count(),0);await page.evaluate(()=>{PRODUCT_BY_EAN['5601000000011']={ean:'5601000000011',name:'Exemplo Á',brand:'Marca'};PRODUCT_BY_EAN['5601000000028']={ean:'5601000000028',name:'Exemplo B',brand:'Marca'};seoAbrirProduto('5601000000011')});assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),base+'/produto/5601000000011/exemplo-a');await page.evaluate(()=>seoAbrirProduto('5601000000028'));assert.equal(await page.locator('link[rel=canonical]').count(),1);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),base+'/produto/5601000000028/exemplo-b');await page.evaluate(()=>seoFecharProduto());assert.equal(await page.locator('link[rel=canonical]').count(),1);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),base+'/');await ctx.close()});
