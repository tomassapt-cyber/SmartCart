#!/usr/bin/env node
/**
 * SmartCart — Relatório de frescura por loja (health monitor)
 * ============================================================
 *
 * PORQUÊ
 * ------
 * Um workflow pode "ter sucesso" e fazer commit dos dados raw mas NUNCA
 * integrar no seed-bundle.json (hollow success) — ou perder o push por
 * conflito — e nesses casos o verified_at da loja CONGELA sem ninguém dar
 * por isso. Foi exactamente o que aconteceu com farmaciapt/farmacia365.
 *
 * Este script lê o seed-bundle.json e, por loja, mostra:
 *   - nº de ofertas (items)
 *   - distribuição de frescura: <24h, 24-48h, 2-7d, >7d, sem timestamp
 *   - "último refresh" = verified_at mais recente da loja (deve ser de hoje
 *     se o cron diário está a integrar como devia)
 *
 * Também corre 2 checks de duplicados (colisão de capitalização de marca +
 * possíveis fichas duplicadas NOVAS — ver scripts/lib/duplicados.js e
 * data/duplicados-revistos.json) para apanhar regressões de dedup.
 *
 * SAÍDA / EXIT CODE
 *   - Sempre imprime a tabela.
 *   - Com --strict: exit 1 se alguma loja tiver "último refresh" mais velho
 *     que --stale-days (default 2), ou se houver colisões de marca ou
 *     duplicados novos (ainda não revistos).
 *     Pensado para correr num workflow de monitorização e falhar visivelmente.
 *
 * USO
 *   node scripts/freshness-report.js
 *   node scripts/freshness-report.js --strict --stale-days=2
 *   node scripts/freshness-report.js --json        # saída JSON p/ máquinas
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const STRICT = !!args.strict;
const AS_JSON = !!args.json;
const STALE_DAYS = args['stale-days'] ? parseFloat(args['stale-days']) : 2;
// Lojas EXCLUÍDAS do gate --strict (continuam na tabela, marcadas):
// snapshot manual que não actualiza na nuvem (ex.: notino, Cloudflare bloqueia
// IPs de datacenter — refresca-se do PC). Sem isto o monitor falharia sempre.
const IGNORE = new Set(String(args.ignore || '').split(',').map(s => s.trim()).filter(Boolean));
// --only=<slugs>: mede SÓ estas lojas (o inverso de --ignore). Serve para dar
// às lojas SÓ-PC um limiar próprio (refrescam à mão, não podem usar o mesmo
// prazo das cloud) sem perder a vigilância sobre elas.
const ONLY = new Set(String(args.only || '').split(',').map(s => s.trim()).filter(Boolean));

const strip = x => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '');
const keyOf = x => strip(String(x).toLowerCase()).replace(/\s+/g, ' ').trim();

const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));

// ── Reunir timestamps por loja ───────────────────────────────────────────────
function collectTimestamps(item) {
  const out = [];
  if (item.verified_at) out.push(Date.parse(item.verified_at));
  if (Array.isArray(item.variants)) {
    for (const v of item.variants) if (v.verified_at) out.push(Date.parse(v.verified_at));
  }
  return out.filter(t => !Number.isNaN(t));
}

const perStore = {};
let globalMax = 0;
for (const sp of seed.store_products || []) {
  const slug = sp.store_slug || '?';
  const rec = (perStore[slug] ||= { slug, items: 0, stamps: [], noStamp: 0 });
  for (const item of sp.items || []) {
    rec.items++;
    const ts = collectTimestamps(item);
    if (!ts.length) { rec.noStamp++; continue; }
    const latest = Math.max(...ts);
    rec.stamps.push(latest);
    if (latest > globalMax) globalMax = latest;
  }
}

// Referência "agora": o mais recente entre o relógio real e o timestamp mais
// fresco do dataset. Torna as idades coerentes mesmo se o relógio divergir.
const NOW = Math.max(Date.now(), globalMax);
const DAY = 86400000;

function bucketize(stamps) {
  const b = { d1: 0, d2: 0, d7: 0, old: 0 };
  for (const t of stamps) {
    const age = NOW - t;
    if (age < DAY) b.d1++;
    else if (age < 2 * DAY) b.d2++;
    else if (age < 7 * DAY) b.d7++;
    else b.old++;
  }
  return b;
}

const rows = Object.values(perStore).map(r => {
  const b = bucketize(r.stamps);
  const latest = r.stamps.length ? Math.max(...r.stamps) : null;
  const ageDays = latest != null ? (NOW - latest) / DAY : Infinity;
  return {
    slug: r.slug,
    items: r.items,
    fresh24h: b.d1,
    pct24h: r.items ? Math.round((b.d1 / r.items) * 100) : 0,
    d2: b.d2, d7: b.d7, old: b.old, noStamp: r.noStamp,
    lastRefresh: latest ? new Date(latest).toISOString() : null,
    lastRefreshAgeDays: Number.isFinite(ageDays) ? +ageDays.toFixed(2) : null,
    stale: ageDays > STALE_DAYS,
  };
}).sort((a, b) => (b.lastRefreshAgeDays ?? 1e9) - (a.lastRefreshAgeDays ?? 1e9));

// ── Checks de duplicados ─────────────────────────────────────────────────────
const brandCounts = {};
for (const p of seed.products || []) if (p.brand) brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
const brandKeyGroups = {};
for (const b of Object.keys(brandCounts)) (brandKeyGroups[keyOf(b)] ||= []).push(b);
const brandCollisions = Object.entries(brandKeyGroups).filter(([, v]) => v.length > 1);

// Possíveis duplicados (2026-10-22): mesma marca + tamanho + palavras do nome
// (scripts/lib/duplicados.js), DEPOIS das junções que a publicação faz (GTIN e
// data/product-aliases.json) e sem os grupos com a mesma loja nas duas fichas.
// Os já revistos e confirmados como produtos diferentes, ou por confirmar
// (data/duplicados-revistos.json), não contam: o alarme só toca com um NOVO.
// A contagem antiga, pela impressão digital, ignorava tamanhos e números e
// dava 760 «grupos» (Cicaplast 15 ml e 40 ml…) — um alarme sempre ligado.
// ⚠️ Corre depois das contagens de frescura: a junção muda o seed em memória.
const dupNovos = [];
let dupRevistos = 0;
try {
  require('./dedup-ean-variants').mergeEanVariants(seed, ROOT);
  const { gruposDuplicados } = require('./lib/duplicados');
  let revistos = {};
  try { revistos = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'duplicados-revistos.json'), 'utf8')).grupos || {}; } catch { /* sem lista → tudo novo */ }
  for (const g of gruposDuplicados(seed)) {
    if (revistos[g.grupo]) dupRevistos++;
    else dupNovos.push(g);
  }
} catch (e) { console.error('duplicados: não consegui medir —', e.message); }
const nomeDe = new Map((seed.products || []).map(p => [String(p.ean), p.name]));

// ── Saída ────────────────────────────────────────────────────────────────────
const summary = {
  generated_at: new Date(NOW).toISOString(),
  stale_days_threshold: STALE_DAYS,
  total_products: (seed.products || []).length,
  stores: rows,
  brand_case_collisions: brandCollisions.length,
  duplicados_novos: dupNovos.length,
  duplicados_revistos: dupRevistos,
};

if (AS_JSON) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`📅 Referência: ${summary.generated_at}  ·  produtos: ${summary.total_products}  ·  limite stale: ${STALE_DAYS}d\n`);
  console.log('Loja             Ofertas   <24h        2-7d   >7d   s/ts   Último refresh        Idade');
  console.log('─'.repeat(92));
  for (const r of rows) {
    const flag = r.stale ? '⚠ ' : '  ';
    console.log(
      flag +
      r.slug.padEnd(14) +
      String(r.items).padStart(7) + '  ' +
      `${r.fresh24h} (${r.pct24h}%)`.padEnd(11) +
      String(r.d7).padStart(5) + '  ' +
      String(r.old).padStart(4) + '  ' +
      String(r.noStamp).padStart(5) + '   ' +
      String(r.lastRefresh || '—').padEnd(22) +
      (r.lastRefreshAgeDays != null ? `${r.lastRefreshAgeDays}d` : '—')
    );
  }
  console.log('');
  console.log(`Colisões de capitalização de marca: ${brandCollisions.length}`);
  if (brandCollisions.length) {
    brandCollisions.slice(0, 10).forEach(([k, v]) => console.log(`   • ${k}: ${v.map(x => JSON.stringify(x)).join(' / ')}`));
  }
  console.log(`Possíveis duplicados novos:         ${dupNovos.length}  (${dupRevistos} já revistos em data/duplicados-revistos.json)`);
  dupNovos.slice(0, 10).forEach(g => console.log(`   • ${g.eans.map(e => `${e} «${String(nomeDe.get(e) || '').slice(0, 45)}»`).join('  ⟷  ')}`));
}

// ── Exit code (modo --strict) ────────────────────────────────────────────────
const inScope = r => (!ONLY.size || ONLY.has(r.slug)) && !IGNORE.has(r.slug);
const staleStores = rows.filter(r => r.stale && inScope(r));
const staleIgnored = rows.filter(r => r.stale && !inScope(r));
if (STRICT) {
  const problems = [];
  if (staleIgnored.length) console.error(`\nℹ Stale mas IGNORADAS (--ignore): ${staleIgnored.map(s => `${s.slug} (${s.lastRefreshAgeDays}d)`).join(', ')}`);
  if (staleStores.length) problems.push(`${staleStores.length} loja(s) stale (>${STALE_DAYS}d): ${staleStores.map(s => s.slug).join(', ')}`);
  if (brandCollisions.length) problems.push(`${brandCollisions.length} colisões de marca`);
  if (dupNovos.length) problems.push(`${dupNovos.length} possível(eis) duplicado(s) novo(s) — juntar em data/product-aliases.json se for o mesmo produto, ou registar em data/duplicados-revistos.json se não for`);
  if (problems.length) {
    console.error('\n❌ FALHA (--strict):\n   - ' + problems.join('\n   - '));
    process.exit(1);
  }
  console.error('\n✅ OK: todas as lojas frescas, sem duplicados novos.');
}
