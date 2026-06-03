#!/usr/bin/env node
/**
 * SmartCart — Backfill de descrições (Fase 1, extractiva)
 * ============================================================
 *
 * Propaga descrições limpas dos catálogos raw (data/catalog/*-full.json)
 * para os produtos do seed-bundle.json, adicionando `description` +
 * `description_source` a cada produto que tiver uma fonte.
 *
 * Pipeline por produto raw:
 *   1. Ignora se não tem `description` (ou status != ok).
 *   2. Limpa via cleanDescription (extractiva, determinística, sem LLM).
 *   3. Indexa por EAN real (GTIN) e por fingerprint canónico.
 *      Mantém a descrição MAIS COMPLETA (mais longa) por chave.
 *
 * Match seed→raw: EAN real primeiro, fingerprint como fallback.
 *
 * Idempotente: re-correr só actualiza se encontrar uma descrição melhor
 * (mais longa) que a já gravada, ou se a fonte mudou.
 *
 * Uso:
 *   node scripts/backfill-descriptions.js
 *   node scripts/backfill-descriptions.js --dry-run
 *   node scripts/backfill-descriptions.js --force   # reescreve mesmo as iguais
 */

const fs = require('fs');
const path = require('path');
const { productFingerprint } = require('./lib/product-fingerprint');
const { cleanDescription } = require('./lib/clean-description');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const DRY_RUN = !!args['dry-run'];
const FORCE = !!args.force;

// Ordem de preferência das lojas como fonte de descrição (empate de
// comprimento → loja mais à esquerda ganha). PT-first / qualidade editorial.
const STORE_PRIORITY = ['atida', 'wells', 'farmaciapt', 'byfarma', 'druni', 'sweetcare', 'farmacia365'];
const FULL_FILES = STORE_PRIORITY
  .map(s => ({ store: s, file: path.join(CATALOG_DIR, `${s}-full.json`) }))
  .filter(x => fs.existsSync(x.file));

function isRealEan(ean) { return /^\d{8,14}$/.test(ean || ''); }
function loadJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }}

(function main() {
  const seed = loadJSON(SEED_BUNDLE);
  if (!seed?.products) { console.error('✗ seed-bundle.json inválido.'); process.exit(1); }
  console.log(`📦 Seed: ${seed.products.length} produtos\n`);

  // ── 1) Construir índices de descrições limpas a partir dos raw ────────
  // byEan[ean]  = { desc, source, len }
  // byFp[fp]    = { desc, source, len }
  const byEan = {};
  const byFp = {};
  let rawSeen = 0, rawCleaned = 0;

  for (const { store, file } of FULL_FILES) {
    const data = loadJSON(file);
    const arr = data?.products || [];
    let storeCleaned = 0;
    for (const p of arr) {
      if (p.status && p.status !== 'ok') continue;
      if (!p.description || !String(p.description).trim()) continue;
      rawSeen++;
      const clean = cleanDescription(p.description, { brand: p.brand, name: p.name });
      if (!clean) continue;
      rawCleaned++; storeCleaned++;
      const entry = { desc: clean, source: store, len: clean.length };

      if (isRealEan(p.ean)) {
        const ex = byEan[p.ean];
        if (!ex || entry.len > ex.len) byEan[p.ean] = entry;
      }
      const fp = productFingerprint(p);
      if (fp) {
        const ex = byFp[fp];
        if (!ex || entry.len > ex.len) byFp[fp] = entry;
      }
    }
    console.log(`  ${store.padEnd(12)} → ${storeCleaned} descrições limpas`);
  }
  console.log(`\n🧼 Total raw c/ descrição: ${rawSeen} · limpas válidas: ${rawCleaned}`);
  console.log(`   índices: ${Object.keys(byEan).length} por EAN, ${Object.keys(byFp).length} por fingerprint\n`);

  // ── 2) Aplicar ao seed ────────────────────────────────────────────────
  let setByEan = 0, setByFp = 0, updated = 0, unchanged = 0, noMatch = 0;
  for (const prod of seed.products) {
    let entry = null, via = null;
    if (isRealEan(prod.ean) && byEan[prod.ean]) { entry = byEan[prod.ean]; via = 'ean'; }
    if (!entry) {
      const fp = productFingerprint(prod);
      if (fp && byFp[fp]) { entry = byFp[fp]; via = 'fp'; }
    }
    if (!entry) { noMatch++; continue; }

    const already = prod.description;
    // Só escreve se: não tinha, ou a nova é mais longa, ou --force.
    if (already && !FORCE && entry.len <= String(already).length) { unchanged++; continue; }

    if (already) updated++;
    else if (via === 'ean') setByEan++; else setByFp++;

    prod.description = entry.desc;
    prod.description_source = entry.source;
  }

  const withDesc = seed.products.filter(p => p.description).length;
  console.log('══════ Resultado ══════');
  console.log(`  Novas via EAN:        ${setByEan}`);
  console.log(`  Novas via fingerprint:${setByFp}`);
  console.log(`  Actualizadas (melhor):${updated}`);
  console.log(`  Inalteradas:          ${unchanged}`);
  console.log(`  Sem match:            ${noMatch}`);
  console.log(`\n  Cobertura final: ${withDesc}/${seed.products.length} (${Math.round(withDesc / seed.products.length * 100)}%)`);

  if (DRY_RUN) { console.log('\n[DRY-RUN] Não escrito.'); return; }

  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  const kb = (fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1);
  console.log(`\n✓ ${SEED_BUNDLE.replace(ROOT, '.')} (${kb} MB)`);
  console.log('\nPróximo: node scripts/inject-seed-into-demo.js  ← re-injecta (descrição é STRIPPED do render)');
})();
