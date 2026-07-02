#!/usr/bin/env node
/**
 * CosMath — Verificação HTTP de ofertas-fantasma candidatas
 * ============================================================
 * O sinal "URL ausente do catálogo fresco" (ghost-offers.js) tem FALSOS
 * POSITIVOS: os scrapers só guardam produtos extraídos com sucesso, por isso
 * um produto vivo mas que falhou a extração nesse dia (ex.: esgotado sem
 * preço no JSON-LD) fica fora do catálogo sem ter sido removido do site.
 * Prova: cocooncenter tinha 747 "ausentes" e uma amostra deu toda 200.
 *
 * Este script CONFIRMA cada candidato com um pedido HTTP real:
 *   404/410 → dead   (o inject esconde do render)
 *   200     → alive  (fica visível; re-verificado após ALIVE_TTL_DAYS)
 *   outro/timeout → unknown (fica visível; re-tentado após UNKNOWN_TTL_DAYS)
 *
 * Resultados em cache: data/ghost-check.json  { url: {status, code, checked_at} }
 * → só URLs novos/expirados fazem pedidos (bounded por --max).
 * O inject corre isto via spawnSync antes do overlay; se a rede falhar, o
 * overlay usa a cache existente (fail-safe: nunca esconde sem confirmação).
 *
 * Uso:
 *   node scripts/verify-ghost-offers.js               # verifica até --max
 *   node scripts/verify-ghost-offers.js --max=2500    # primeira passagem
 *   node scripts/verify-ghost-offers.js --quiet       # só o resumo
 */
const fs = require('fs');
const path = require('path');
const { findGhostCandidates } = require('./lib/ghost-offers');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const CACHE_FILE = path.join(ROOT, 'data', 'ghost-check.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const MAX = args.max ? parseInt(args.max, 10) : 300;
const QUIET = !!args.quiet;
const CONCURRENCY = 6;
const TIMEOUT_MS = 15000;
const ALIVE_TTL_DAYS = 7;     // vivo → re-verificar daqui a 7d (pode ser removido depois)
const DEAD_TTL_DAYS = 30;     // morto → re-verificar aos 30d (se voltar ao catálogo, deixa de ser candidato antes disso)
const UNKNOWN_TTL_DAYS = 1;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function loadCache() { try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { return {}; } }

function isFresh(entry, now) {
  if (!entry || !entry.checked_at) return false;
  const age = (now - new Date(entry.checked_at).getTime()) / 864e5;
  const ttl = entry.status === 'dead' ? DEAD_TTL_DAYS : entry.status === 'alive' ? ALIVE_TTL_DAYS : UNKNOWN_TTL_DAYS;
  return age >= 0 && age < ttl;
}

async function checkUrl(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow', signal: ctrl.signal });
    try { if (r.body) await r.body.cancel(); } catch { /* ignore */ }
    if (r.status === 404 || r.status === 410) return { status: 'dead', code: r.status };
    if (r.status >= 200 && r.status < 400) return { status: 'alive', code: r.status };
    return { status: 'unknown', code: r.status };
  } catch (e) {
    return { status: 'unknown', code: 0, error: (e && e.name) || 'err' };
  } finally { clearTimeout(timer); }
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));
  const now = Date.now();
  const { candidatesByStore, perStore } = findGhostCandidates(seed, { now });
  const cache = loadCache();

  // Fila: candidatos sem entrada fresca na cache. Intercalados por loja
  // (round-robin) para não martelar um só host.
  const queues = Object.entries(candidatesByStore).map(([slug, urls]) => ({ slug, urls: urls.filter(u => !isFresh(cache[u], now)) }));
  const queue = [];
  let added = true;
  for (let i = 0; added; i++) {
    added = false;
    for (const q of queues) if (i < q.urls.length) { queue.push(q.urls[i]); added = true; }
  }
  const toCheck = queue.slice(0, MAX);

  const totalCand = Object.values(candidatesByStore).reduce((s, u) => s + u.length, 0);
  if (!QUIET) {
    console.log('══════ verify-ghost-offers ══════');
    for (const s of perStore) if (s.skipped) console.log(`  SKIP ${s.slug} — ${s.skipped}`);
    console.log(`  Candidatos (ausentes do catálogo fresco): ${totalCand} · sem cache fresca: ${queue.length} · a verificar agora: ${toCheck.length}`);
  }

  let idx = 0; const stats = { dead: 0, alive: 0, unknown: 0 };
  async function worker() {
    while (idx < toCheck.length) {
      const url = toCheck[idx++];
      const r = await checkUrl(url);
      cache[url] = { status: r.status, code: r.code, checked_at: new Date().toISOString() };
      stats[r.status]++;
      if (!QUIET && (idx % 100 === 0)) console.log(`  [${idx}/${toCheck.length}] dead:${stats.dead} alive:${stats.alive} unknown:${stats.unknown}`);
      await new Promise(s => setTimeout(s, 150 + Math.random() * 100));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Podar da cache URLs que já nem candidatos são (voltaram ao catálogo ou
  // saíram do seed) e cuja entrada já expirou — mantém o ficheiro pequeno.
  const candSet = new Set(Object.values(candidatesByStore).flat());
  for (const u of Object.keys(cache)) if (!candSet.has(u) && !isFresh(cache[u], now)) delete cache[u];

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf8');
  const totals = { dead: 0, alive: 0, unknown: 0 };
  for (const e of Object.values(cache)) if (totals[e.status] != null) totals[e.status]++;
  console.log(`✓ ghost-check: +${toCheck.length} verificados agora (dead:${stats.dead} alive:${stats.alive} unk:${stats.unknown}) · cache total: dead:${totals.dead} alive:${totals.alive} unk:${totals.unknown}`);
}

main().catch(e => { console.error('verify-ghost-offers FATAL (não bloqueante):', e.message); process.exit(0); });
