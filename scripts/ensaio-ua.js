#!/usr/bin/env node
'use strict';
/**
 * CosMath — ensaio do UA honesto (25/11/2026)
 * ============================================================
 * Para cada loja tocada por um PR (leitores mudados e os leitores das bibliotecas
 * de rede mudadas), lê o robots.txt e abre até 3 fichas que já são ofertas no
 * catálogo, com o UA do CosMath, uma de cada vez e com pausa (2 s, ou o
 * Crawl-delay da loja se for maior). Diz, loja a loja, se a loja responde
 * normalmente: ficha com dados de produto, bloqueio (403/415/429/desafio), erro,
 * resposta sem dados, ou robots.txt que proíbe as fichas.
 *
 * Nunca abre Perfumes Club, Notino, Barreiros, Care to Beauty nem A Farmácia
 * Online. As lojas do PC (data/lojas-so-pc.json) bloqueiam a nuvem: na nuvem
 * ficam de fora, e ensaiam-se no PC com --so-pc.
 *
 * Uso:
 *   node scripts/ensaio-ua.js --desde="HEAD^1 HEAD"      # no PR: o que o PR muda
 *   node scripts/ensaio-ua.js --desde=origin/main...HEAD  # no PC, num ramo
 *   node scripts/ensaio-ua.js --lojas=glowthie,mitso      # lojas escolhidas
 *   node scripts/ensaio-ua.js --desde=origin/main...HEAD --so-pc   # no PC: só as lojas do PC
 * Sai com 1 se alguma loja bloquear (para o PR ficar vermelho e se ver qual).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { UA_COSMATH } = require('./lib/identidade');
const { browserHeaders, looksBlocked } = require('./lib/resilient-fetch');

const ROOT = path.resolve(__dirname, '..');
const S = __dirname;
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));

const NUNCA = /perfumesclub|notino|barreiros|caretobeauty|afarmaciaonline/i;
// bibliotecas que fazem pedidos às lojas: mudá-las toca em todos os leitores que as usam
const REDE = new Set(['identidade', 'resilient-fetch', 'fichas-jsonld', 'shopify-loja', 'woo-loja', 'leitura-alargada', 'fichas-existentes']);
const FICHAS = 3;
const PAUSA_MS = 2000;
// uma loja de cada vez: há lojas no mesmo servidor com um limite de pedidos partilhado
// (Shopkit: So Beauty, Smart Beauty e Beleza37 davam 429 quando ensaiadas em paralelo)
const EM_PARALELO = 1;
const dorme = ms => new Promise(r => setTimeout(r, ms));
const host = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; } };

// ── que leitores o PR toca ───────────────────────────────────────────────────
function requiresDe(ficheiro) {
  const t = fs.readFileSync(ficheiro, 'utf8');
  return new Set([...t.matchAll(/require\(\s*['"]\.\/(?:lib\/)?([a-z0-9-]+)(?:\.js)?['"]\s*\)/gi)].map(m => m[1]));
}
function leitoresTocados(mudados) {
  const leitores = fs.readdirSync(S).filter(f => /^scrape-.+-catalog\.js$/.test(f));
  const libs = fs.readdirSync(path.join(S, 'lib')).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''));
  const tocadas = new Set(mudados.map(f => f.match(/^scripts\/lib\/([a-z0-9-]+)\.js$/)).filter(Boolean).map(m => m[1]).filter(l => REDE.has(l)));
  // propaga: uma biblioteca que usa uma tocada também fica tocada (shopify-loja usa resilient-fetch)
  for (let mudou = true; mudou;) {
    mudou = false;
    for (const l of libs) if (!tocadas.has(l) && [...requiresDe(path.join(S, 'lib', l + '.js'))].some(r => tocadas.has(r))) { tocadas.add(l); mudou = true; }
  }
  const diretos = new Set(mudados.map(f => f.match(/^scripts\/(scrape-.+-catalog\.js)$/)).filter(Boolean).map(m => m[1]));
  return leitores.filter(f => diretos.has(f) || [...requiresDe(path.join(S, f))].some(r => tocadas.has(r)));
}

// ── robots.txt ───────────────────────────────────────────────────────────────
function regrasRobots(txt) {
  const token = UA_COSMATH.split('/')[0].toLowerCase();
  const grupos = []; let atual = null, emAgentes = false;
  for (const linha of String(txt || '').split(/\r?\n/)) {
    const m = linha.replace(/#.*/, '').trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const campo = m[1].toLowerCase(), valor = m[2].trim();
    if (campo === 'user-agent') {
      if (!emAgentes) { atual = { agentes: [], regras: [], delay: null }; grupos.push(atual); emAgentes = true; }
      atual.agentes.push(valor.toLowerCase());
    } else {
      emAgentes = false;
      if (!atual) continue;
      if ((campo === 'allow' || campo === 'disallow') && valor) atual.regras.push({ permite: campo === 'allow', caminho: valor });
      if (campo === 'crawl-delay' && Number(valor) > 0) atual.delay = Number(valor);
    }
  }
  return grupos.find(g => g.agentes.some(a => a !== '*' && token.includes(a))) || grupos.find(g => g.agentes.includes('*')) || { regras: [], delay: null };
}
function permitido(grupo, caminho) {
  let melhor = null;
  for (const r of grupo.regras) {
    const re = new RegExp('^' + r.caminho.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(caminho) && (!melhor || r.caminho.length > melhor.caminho.length || (r.caminho.length === melhor.caminho.length && r.permite))) melhor = r;
  }
  return !melhor || melhor.permite;
}

// ── abrir uma ficha ─────────────────────────────────────────────────────────
const PRODUTO = /"@type"\s*:\s*\[?\s*"Product"|itemprop=["']price|property=["']product:price|og:type["'][^>]*product|"product"\s*:\s*\{/i;
async function abrir(url, tentativa = 1) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: browserHeaders({ 'Accept-Language': 'pt-PT,pt;q=0.9' }), redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const corpo = await r.text();
    const ms = Date.now() - t0;
    // 429 = pedidos a mais, não recusa do robô: espera o que a loja pede (até 60 s) e tenta uma vez
    if (r.status === 429) {
      if (tentativa === 1) { await dorme(Math.min(60, Math.max(10, Number(r.headers.get('retry-after')) || 30)) * 1000); return abrir(url, 2); }
      return { estado: 'limite', http: 429, ms };
    }
    if ([401, 403, 406, 415, 503].includes(r.status) || (r.ok && looksBlocked(corpo, r.headers.get('content-type'), 'html')))
      return { estado: 'bloqueado', http: r.status, ms };
    if (r.status === 404 || r.status === 410) return { estado: 'retirada', http: r.status, ms };
    if (!r.ok) return { estado: 'erro', http: r.status, ms };
    return { estado: PRODUTO.test(corpo) ? 'ok' : 'sem dados', http: r.status, ms, bytes: corpo.length };
  } catch (e) {
    return { estado: 'erro', http: null, ms: Date.now() - t0, nota: e.name === 'TimeoutError' ? 'timeout' : String(e.message).slice(0, 60) };
  }
}

async function ensaiarLoja(loja) {
  const res = { slug: loja.slug, host: loja.host, fichas: [], robots: '' };
  const base = new URL(loja.urls[0]).origin;
  let grupo = { regras: [], delay: null };
  try {
    const r = await fetch(base + '/robots.txt', { headers: browserHeaders(), signal: AbortSignal.timeout(20000) });
    if (r.ok) grupo = regrasRobots(await r.text());
    else res.robots = `robots.txt HTTP ${r.status}`;
  } catch { res.robots = 'robots.txt sem resposta'; }
  // robots.txt com 429: a loja já pede calma — 10 s entre fichas
  const pausa = Math.max(/HTTP 429/.test(res.robots) ? 10000 : PAUSA_MS, (grupo.delay || 0) * 1000);
  if (grupo.delay) res.robots = (res.robots ? res.robots + ' · ' : '') + `Crawl-delay ${grupo.delay} s`;
  const proibidas = loja.urls.filter(u => !permitido(grupo, new URL(u).pathname + new URL(u).search));
  if (proibidas.length) res.robots = (res.robots ? res.robots + ' · ' : '') + `robots PROÍBE ${proibidas.length}/${loja.urls.length} fichas`;
  for (const u of loja.urls) {
    await dorme(pausa);
    const f = await abrir(u);
    res.fichas.push(f);
    if (f.estado === 'bloqueado' || f.estado === 'limite') break;   // bloqueou ou pediu calma: não insistir
  }
  const n = e => res.fichas.filter(f => f.estado === e).length;
  res.veredicto = n('bloqueado') ? 'BLOQUEADO' : n('ok') ? 'ok' : n('limite') ? 'limite de pedidos' : n('retirada') === res.fichas.length ? 'só fichas retiradas' : n('sem dados') ? 'sem dados' : 'erro';
  return res;
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
  const pc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'lojas-so-pc.json'), 'utf8'));
  const doPc = new Set([...Object.keys(pc.lojas || {}), ...Object.keys(pc.em_espera || {})]);
  const lojaDoHost = new Map();
  for (const s of seed.stores || []) { const h = host(s.base_url); if (h && !lojaDoHost.has(h)) lojaDoHost.set(h, s.slug); }

  let slugs;
  if (args.lojas) slugs = String(args.lojas).split(',').map(s => s.trim()).filter(Boolean);
  else {
    const desde = String(args.desde || 'HEAD^1 HEAD').split(/\s+/);
    const mudados = execFileSync('git', ['diff', '--name-only', ...desde], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
    const leitores = leitoresTocados(mudados);
    console.log(`📝 o PR muda ${mudados.length} ficheiros · leitores tocados: ${leitores.length}`);
    const set = new Set(), semLoja = [];
    for (const f of leitores) {
      const hosts = new Set([...fs.readFileSync(path.join(S, f), 'utf8').matchAll(/https?:\/\/(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/gi)].map(m => m[1].toLowerCase()));
      const daqui = [...hosts].map(h => lojaDoHost.get(h)).filter(Boolean);
      if (daqui.length) daqui.forEach(s => set.add(s)); else semLoja.push(f);
    }
    if (semLoja.length) console.log(`   sem loja no catálogo (não ensaiados): ${semLoja.join(', ')}`);
    slugs = [...set];
  }

  const lojas = [], fora = [];
  for (const slug of slugs.sort()) {
    const g = (seed.store_products || []).find(x => x.store_slug === slug);
    const st = (seed.stores || []).find(x => x.slug === slug) || {};
    const h = host(st.base_url) || '';
    if (NUNCA.test(slug) || NUNCA.test(h)) { fora.push(`${slug} (nunca se abre)`); continue; }
    if (args['so-pc'] ? !doPc.has(slug) : doPc.has(slug)) { if (!args['so-pc']) fora.push(`${slug} (loja do PC: ensaiar no PC com --so-pc)`); continue; }
    const itens = ((g && g.items) || []).filter(i => i.url && /^https?:\/\//.test(i.url))
      .sort((a, b) => (b.in_stock !== false) - (a.in_stock !== false) || String(b.verified_at || '').localeCompare(String(a.verified_at || '')));
    const urls = [...new Set(itens.map(i => i.url.split('#')[0]))].slice(0, FICHAS);
    if (!urls.length) { fora.push(`${slug} (sem ofertas com endereço)`); continue; }
    lojas.push({ slug, host: h, urls });
  }
  console.log(`🤖 UA: ${UA_COSMATH}`);
  console.log(`🔎 ${lojas.length} lojas a ensaiar (${FICHAS} fichas cada, pausa ≥ ${PAUSA_MS / 1000} s)${fora.length ? ` · de fora: ${fora.join(', ')}` : ''}\n`);
  if (args.listar) { for (const l of lojas) console.log(`  ${l.slug.padEnd(24)} ${l.host}`); return 0; }   // sem pedidos

  const resultados = [];
  let i = 0;
  await Promise.all(Array.from({ length: EM_PARALELO }, async () => {
    while (i < lojas.length) {
      const r = await ensaiarLoja(lojas[i++]);
      resultados.push(r);
      const fichas = r.fichas.map(f => `${f.estado}${f.http ? ' ' + f.http : ''}${f.nota ? ' ' + f.nota : ''} (${f.ms} ms)`).join(' · ');
      console.log(`${r.veredicto === 'ok' ? '✅' : r.veredicto === 'BLOQUEADO' ? '⛔' : '⚠️ '} ${r.slug.padEnd(24)} ${r.veredicto.padEnd(20)} ${fichas}${r.robots ? '  [' + r.robots + ']' : ''}`);
    }
  }));

  resultados.sort((a, b) => a.slug.localeCompare(b.slug));
  const conta = v => resultados.filter(r => r.veredicto === v).length;
  const bloqueadas = resultados.filter(r => r.veredicto === 'BLOQUEADO').map(r => r.slug);
  const robots = resultados.filter(r => /PROÍBE/.test(r.robots)).map(r => r.slug);
  console.log(`\n══ ${resultados.length} lojas: ${conta('ok')} ok · ${bloqueadas.length} bloqueadas${bloqueadas.length ? ' (' + bloqueadas.join(', ') + ')' : ''} · ${conta('limite de pedidos')} com limite de pedidos · ${conta('sem dados')} sem dados · ${conta('erro')} com erro · ${conta('só fichas retiradas')} só com fichas retiradas${robots.length ? ` · robots proíbe: ${robots.join(', ')}` : ''}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const linhas = ['## Ensaio do UA honesto', '', `UA: \`${UA_COSMATH}\``, '', '| Loja | Resultado | Fichas | robots.txt |', '|---|---|---|---|',
      ...resultados.map(r => `| ${r.slug} | ${r.veredicto} | ${r.fichas.map(f => `${f.estado}${f.http ? ' ' + f.http : ''}`).join(', ')} | ${r.robots || ''} |`),
      '', fora.length ? `De fora: ${fora.join(', ')}` : ''];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, linhas.join('\n') + '\n');
  }
  return bloqueadas.length ? 1 : 0;
}

module.exports = { regrasRobots, permitido, leitoresTocados };

if (require.main === module) {
  main().then(c => process.exit(c)).catch(e => { console.error('FATAL', e); process.exit(2); });
}
