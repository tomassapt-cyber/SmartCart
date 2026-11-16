#!/usr/bin/env node
/**
 * CosMath — reabrir as ofertas escondidas por idade (2026-11-16, ponto 4 da ordem
 * de trabalho da auditoria de 06/11)
 * ===============================================================================
 * Uma oferta fica escondida («podre») quando está >7 dias atrás da última leitura
 * da loja, ou >14 dias sem leitura. Acontece quando o leitor da loja deixa de
 * visitar a página: saiu do mapa do site, o filtro do leitor não a apanha, ou a
 * ficha deixou de trazer EAN. A auditoria verificou ao vivo: parte ainda está à
 * venda (só que com preço velho) e o resto desapareceu.
 *
 * Duas vezes por semana, este passo reabre essas páginas e:
 *   • refresca preço/stock/verified_at quando a página PROVA que é o mesmo produto:
 *     o GTIN do JSON-LD igual ao EAN da oferta; ou, sem GTIN, o CNP igual; ou, sem
 *     nenhum, o nome da página bate com o produto (marca sem conflito, ≥50% das
 *     palavras, tamanho ±6%, sem variantes opostas) — as guardas do juntar-por-cnp;
 *   • só aceita o preço entre metade e o dobro do anterior (preço sem IVA, página
 *     de outro tamanho… ficam escondidas);
 *   • 404/410 → registado como morta em data/ghost-check.json (a sobreposição de
 *     fantasmas já usa esse ficheiro);
 *   • tudo o resto (outro produto, sem dados, redirecionada) fica escondido e só
 *     se volta a abrir daqui a DIAS_REVER dias.
 *
 * Educação com as lojas: identificação honesta (UA_COSMATH), robots.txt cumprido
 * (Disallow e Crawl-delay), uma página de cada vez por loja e pelo menos 1,5 s
 * entre pedidos; um 403/429 ou página de desafio PARA essa loja nesta corrida.
 * Nunca: lojas bloqueadas, em espera, só do PC, Perfumes Club, Notino, Barreiros,
 * Care to Beauty. As 5 lojas da leitura alargada (#138) já reabrem as suas.
 *
 * A memória (url → [resultado, dia]) passa de corrida em corrida pela cache do
 * Actions, como a da leitura alargada.
 *
 * Uso: node scripts/reabrir-escondidas.js [--dry-run] [--inject] [--lojas=a,b]
 *        [--max-por-loja=N] [--orcamento-min=M]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { produtoDoJsonLd, normalizar } = require('./lib/fichas-jsonld');
const { regrasRobots, permitido } = require('./lib/shopify-existentes');
const { UA_COSMATH, crawlDelayDe, lerMemoria, gravarMemoria } = require('./lib/leitura-alargada');
const { upsertStoreItem } = require('./lib/store-item-merge');
const { sinalDeProdutoDiferente } = require('./lib/product-fingerprint');
const { marcaBate, marcasEmConflito, variantesOpostas, nomesBatem, tamanhoBate } = require('./juntar-por-cnp');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const GHOST = path.join(ROOT, 'data', 'ghost-check.json');
const MEMORIA = path.join(ROOT, '.cache-lojas', 'reabrir-escondidas.json');
const RESULTADOS = path.join(ROOT, '.cache-lojas', 'reabertas-resultado.json');
const DAY = 864e5;
const NUNCA = new Set(['perfumesclub', 'notino', 'barreiros', 'caretobeauty']);
// leitura alargada (#138): estes leitores já reabrem as ofertas que a loja tem
const LEITURA_PROPRIA = new Set(['aveirofarma', 'primor', 'atida', 'sofarma', 'cocooncenter']);
const DIAS_REVER = 25;          // outro produto / sem dados / redirecionada: voltar a ver depois disto
const DIAS_MORTA = 30;          // 404 recente no ghost-check: não reabrir
const PAUSA_MIN_MS = 1500;
const DESAFIO = /<title>[^<]*(just a moment|captcha|access denied|attention required|verifying your connection)|cf-chl-/i;
const core = e => String(e || '').replace(/^0+/, '');
const ler = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const dorme = ms => new Promise(r => setTimeout(r, ms));
const hoje = () => new Date().toISOString().slice(0, 10);
// caminho comparável: sem barra final, sem codificação
const caminho = u => { try { return decodeURIComponent(new URL(u).pathname).replace(/\/+$/, '').toLowerCase(); } catch { return String(u); } };

const idade = it => {
  let t = +new Date(it.verified_at || 0);
  for (const v of it.variants || []) { const tv = +new Date(v.verified_at || 0); if (tv > t) t = tv; }
  return t;
};

/** As ofertas que o site esconde por idade, por loja (a regra do dropRottenOffers). */
function escondidasPorLoja(seed, agora = Date.now()) {
  const out = new Map();
  for (const sp of seed.store_products || []) {
    let fresca = 0;
    for (const it of sp.items) { const t = idade(it); if (t > fresca) fresca = t; }
    if (!fresca) continue;
    const lista = sp.items.filter(it => { const t = idade(it); return t && it.url && ((fresca - t) > 7 * DAY || (agora - t) > 14 * DAY); });
    if (lista.length) out.set(sp.store_slug, lista);
  }
  return out;
}

/** Quais lojas se reabrem (e porquê não as outras). */
function lojasElegiveis(slugs, { bloqueadas, soPc, espera, so }) {
  const ok = [], fora = {};
  for (const s of slugs) {
    const motivo = NUNCA.has(s) ? 'nunca' : bloqueadas.has(s) ? 'bloqueada' : espera.has(s) ? 'em espera' : soPc.has(s) ? 'só do PC'
      : LEITURA_PROPRIA.has(s) ? 'leitura alargada' : (so && !so.has(s)) ? 'fora do --lojas' : null;
    if (motivo) fora[s] = motivo; else ok.push(s);
  }
  return { ok, fora };
}

/**
 * Decide o que fazer com a página reaberta. Devolve { resultado, linha? }.
 * produto: o produto do seed (nome/marca); it: a oferta; pagina: normalizar() ou null.
 */
function julgar(it, produto, pagina) {
  if (!pagina) return { resultado: 'sem_dados' };
  if (pagina.ean) {
    if (core(pagina.ean) !== core(it.ean)) return { resultado: 'outro_produto' };
  } else if (pagina.cnp && it.cnp) {
    if (pagina.cnp !== it.cnp) return { resultado: 'outro_produto' };
  } else {
    if (!produto || !pagina.name) return { resultado: 'sem_prova' };
    const item = { name: pagina.name, brand: pagina.brand };
    const mesmo = marcaBate(produto, item) && !marcasEmConflito(produto, item) && nomesBatem(produto, item) && tamanhoBate(produto, item)
      && !variantesOpostas(produto, item) && !sinalDeProdutoDiferente({ name: pagina.name, brand: pagina.brand || produto.brand }, { name: produto.name, brand: produto.brand });
    if (!mesmo) return { resultado: 'sem_prova' };
  }
  if (it.price > 0 && (pagina.price > it.price * 2 || pagina.price < it.price / 2)) return { resultado: 'preco_suspeito' };
  return { resultado: 'refrescada', linha: pagina };
}

async function pedir(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA_COSMATH, 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const corpo = r.status === 200 ? await r.text() : (r.body && r.body.cancel().catch(() => {}), '');
    return { estado: r.status, corpo, final: r.url || url };
  } catch (e) { return { estado: 0, corpo: '', final: url, erro: String(e && e.name || e) }; }
}

async function reabrirLoja(slug, lista, ctx) {
  const c = { abertas: 0, refrescadas: 0, mortas: 0, outro_produto: 0, sem_dados: 0, sem_prova: 0, preco_suspeito: 0, redirecionada: 0, robots: 0, erro: 0, saltadas: 0, parou: null };
  const origem = new URL(lista[0].url).origin;
  let regras = [], atraso = PAUSA_MIN_MS;
  const rb = await pedir(origem + '/robots.txt');
  if (rb.estado === 200) { regras = regrasRobots(rb.corpo); const cd = crawlDelayDe(rb.corpo); if (cd) atraso = Math.max(atraso, cd * 1000); }
  else if (rb.estado === 403 || rb.estado === 429 || DESAFIO.test(rb.corpo)) { c.parou = `robots.txt HTTP ${rb.estado}`; return c; }
  const agora = Date.now();
  // as escondidas há menos tempo primeiro: são as que mais provavelmente ainda existem
  const fila = lista
    .filter(it => {
      const m = ctx.memoria.urls[it.url];
      if (m && m[0] !== 'refrescada' && (agora - Date.parse(m[1] + 'T00:00:00Z')) / DAY < DIAS_REVER) return false;
      const g = ctx.ghost[it.url];
      if (g && g.status === 'dead' && (agora - Date.parse(g.checked_at)) / DAY < DIAS_MORTA) return false;
      return true;
    })
    .sort((a, b) => idade(b) - idade(a));
  c.saltadas = lista.length - fila.length;
  for (const it of fila.slice(0, ctx.maxPorLoja)) {
    if (Date.now() > ctx.fim) { c.parou = 'orçamento de tempo'; break; }
    const u = new URL(it.url);
    if (!permitido(regras, u.pathname + u.search)) { c.robots++; continue; }
    const r = await pedir(it.url);
    c.abertas++; ctx._ultima = null;
    let resultado;
    if (r.estado === 403 || r.estado === 429 || DESAFIO.test(r.corpo.slice(0, 20000))) { c.parou = `HTTP ${r.estado || 'desafio'}`; break; }
    if (r.estado === 404 || r.estado === 410) {
      resultado = 'morta';
      ctx.resultados.mortas.push({ url: it.url, code: r.estado });
    } else if (r.estado !== 200) {
      resultado = 'erro';
    } else if (new URL(r.final).hostname.replace(/^www\./, '') !== u.hostname.replace(/^www\./, '')) {
      resultado = 'redirecionada';
    } else if (caminho(r.final) !== caminho(it.url) && (caminho(it.url).startsWith(caminho(r.final) + '/') || /^(\/[a-z]{2}(-[a-z]{2})?)?$/.test(caminho(r.final)))) {
      // mandada para a página inicial ou para a secção de cima: o produto saiu da loja
      resultado = 'morta';
      ctx.resultados.mortas.push({ url: it.url, code: 'redir-inicio' });
    } else {
      // a loja pode ter mudado o endereço do produto (redireciona para o novo): aceita-se
      // só com prova forte, o GTIN da página igual ao EAN da oferta, e guarda-se o novo
      const mudou = caminho(r.final) !== caminho(it.url) && !/[?#]/.test(it.url);
      const p = produtoDoJsonLd(r.corpo);
      const pagina = p ? normalizar(r.final, p) : null;
      ctx._ultima = pagina;
      const j = mudou && !(pagina && pagina.ean && core(pagina.ean) === core(it.ean))
        ? { resultado: 'redirecionada' }
        : julgar(it, ctx.produtoPorEan.get(core(it.ean)), pagina);
      resultado = j.resultado;
      if (j.linha) ctx.resultados.refrescadas.push({ loja: slug, ean: it.ean, url_antes: it.url, url: mudou ? r.final : it.url,
        name: j.linha.name, price: j.linha.price, in_stock: j.linha.in_stock, scraped_at: j.linha.scraped_at });
      if (j.linha && mudou) c.novo_endereco = (c.novo_endereco || 0) + 1;
    }
    c[resultado === 'refrescada' ? 'refrescadas' : resultado === 'morta' ? 'mortas' : resultado]++;
    if (ctx.verbose) console.log('   ·', slug, resultado.padEnd(14), it.price + ' → ' + (ctx._ultima ? ctx._ultima.price : '-'), '|', (ctx.produtoPorEan.get(core(it.ean)) || {}).name, '|', ctx._ultima ? ctx._ultima.name : '', '|', it.url.slice(0, 80));
    ctx.memoria.urls[it.url] = [resultado, hoje()];
    await dorme(atraso + Math.random() * atraso * 0.2);
  }
  return c;
}

/**
 * Aplica os resultados de uma corrida ao seed e ao ghost-check, sem rede (também é o
 * que o resilient-push volta a correr por cima do main mais recente).
 */
function aplicar(seed, ghost, resultados) {
  let refrescadas = 0, mortas = 0;
  for (const m of resultados.mortas || []) {
    ghost[m.url] = { status: 'dead', code: m.code, checked_at: resultados.quando || new Date().toISOString() };
    mortas++;
  }
  const porLoja = new Map(); for (const r of resultados.refrescadas || []) (porLoja.get(r.loja) || porLoja.set(r.loja, []).get(r.loja)).push(r);
  for (const [loja, lista] of porLoja) {
    const sp = (seed.store_products || []).find(g => g.store_slug === loja);
    if (!sp) continue;
    const itemByEan = {}; for (const it of sp.items) itemByEan[it.ean] = it;
    const estado = { storeSp: sp, itemByEan, addedCounter: { value: 0 }, updatedCounter: { value: 0 } };
    for (const r of lista) {
      const it = itemByEan[r.ean];
      if (!it || it.url !== r.url_antes) continue;               // a oferta mudou entretanto: não mexer
      if (r.url !== r.url_antes) {
        for (const v of it.variants || []) if (v.url === it.url) v.url = r.url;
        it.url = r.url;
      }
      const v = upsertStoreItem(estado, r.ean, { name: r.name, price: r.price, url: it.url, in_stock: r.in_stock, variants: [], previous_price: null, scraped_at: r.scraped_at }, r.scraped_at);
      if (v.item) { v.item.previous_price = null; v.item.discount_pct = null; v.item.reaberta_em = r.scraped_at; refrescadas++; }
    }
  }
  return { refrescadas, mortas };
}

function gravarEInjetar(seed, ghost, a, inject) {
  if (a.mortas) fs.writeFileSync(GHOST, JSON.stringify(ghost), 'utf8');
  if (a.refrescadas) fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
  if (inject) {
    const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
  }
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  const seed = ler(SEED);
  if (!seed) { console.error('✗ sem', SEED, '— correr bash scripts/ci/seed.sh unpack'); process.exit(1); }
  if (args.aplicar) {   // só aplicar resultados já recolhidos (sem pedir nada às lojas)
    const resultados = ler(String(args.aplicar));
    if (!resultados) { console.error('✗ sem resultados em', args.aplicar); process.exit(1); }
    const ghost = ler(GHOST) || {};
    const a = aplicar(seed, ghost, resultados);
    console.log(`🔁 reabrir escondidas (aplicar): ${a.refrescadas} refrescadas · ${a.mortas} mortas registadas`);
    return gravarEInjetar(seed, ghost, a, !!args.inject);
  }
  const bloqueadas = new Set(Object.keys((ler(path.join(ROOT, 'data', 'lojas-bloqueadas.json')) || {}).lojas || {}));
  const pc = ler(path.join(ROOT, 'data', 'lojas-so-pc.json')) || {};
  const soPc = new Set(Object.keys(pc.lojas || {}));
  const espera = new Set(Object.keys(pc.em_espera || {}));
  const so = args.lojas ? new Set(String(args.lojas).split(',')) : null;
  const porLoja = escondidasPorLoja(seed);
  const { ok, fora } = lojasElegiveis([...porLoja.keys()], { bloqueadas, soPc, espera, so });
  const ctx = {
    seed, dryRun: !!args['dry-run'], verbose: !!args.verbose, maxPorLoja: Number(args['max-por-loja'] || 800),
    fim: Date.now() + Number(args['orcamento-min'] || 150) * 60000,
    memoria: lerMemoria(MEMORIA), ghost: ler(GHOST) || {},
    resultados: { quando: new Date().toISOString(), refrescadas: [], mortas: [] },
    produtoPorEan: new Map(seed.products.map(p => [core(p.ean), p])),
  };
  const total = ok.reduce((t, s) => t + porLoja.get(s).length, 0);
  console.log(`🔁 reabrir escondidas: ${ok.length} lojas, ${total} ofertas escondidas${ctx.dryRun ? ' (--dry-run: lê as páginas mas não grava)' : ''}`);
  const foraN = {}; for (const [s, m] of Object.entries(fora)) foraN[m] = (foraN[m] || 0) + porLoja.get(s).length;
  console.log('   não se reabrem:', Object.entries(foraN).map(([m, n]) => `${m} ${n}`).join(' · '));
  // várias lojas ao mesmo tempo (cada uma com o seu ritmo, uma página de cada vez)
  const res = {}; let i = 0;
  const filaLojas = ok.sort((a, b) => porLoja.get(b).length - porLoja.get(a).length);
  await Promise.all(Array.from({ length: Math.min(8, filaLojas.length) }, async () => {
    while (i < filaLojas.length) { const s = filaLojas[i++]; res[s] = await reabrirLoja(s, porLoja.get(s), ctx); }
  }));
  const soma = k => Object.values(res).reduce((t, c) => t + (c[k] || 0), 0);
  console.log(`✓ abertas ${soma('abertas')} · refrescadas ${soma('refrescadas')} · mortas (404) ${soma('mortas')} · outro produto ${soma('outro_produto')} · sem dados ${soma('sem_dados')} · sem prova ${soma('sem_prova')} · preço suspeito ${soma('preco_suspeito')} · redirecionadas ${soma('redirecionada')} · erro ${soma('erro')} · robots ${soma('robots')} · já vistas ${soma('saltadas')}`);
  for (const [s, c] of Object.entries(res).sort((a, b) => b[1].refrescadas - a[1].refrescadas)) {
    if (c.abertas || c.parou) console.log(`   ${s.padEnd(22)} abertas ${c.abertas} · refrescadas ${c.refrescadas} · mortas ${c.mortas}${c.parou ? ` · PAROU: ${c.parou}` : ''}`);
  }
  if (ctx.dryRun) return;
  gravarMemoria(MEMORIA, ctx.memoria);
  fs.writeFileSync(RESULTADOS, JSON.stringify(ctx.resultados));
  const a = aplicar(seed, ctx.ghost, ctx.resultados);
  console.log(`   aplicado: ${a.refrescadas} ofertas refrescadas · ${a.mortas} páginas mortas registadas (resultados em ${path.relative(ROOT, RESULTADOS)})`);
  gravarEInjetar(seed, ctx.ghost, a, !!args.inject);
}

module.exports = { escondidasPorLoja, lojasElegiveis, julgar, aplicar, NUNCA, LEITURA_PROPRIA };
if (require.main === module) main().catch(e => { console.error('✗', e); process.exit(1); });
