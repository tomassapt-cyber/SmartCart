#!/usr/bin/env node
/**
 * SmartCart — Refresh seed-bundle prices in-place
 * ============================================================
 *
 * Actualiza os preços do seed-bundle.json a partir das inventories
 * (data/inventory/{slug}-verified.json) e do prices-snapshot.json,
 * SEM tocar na lista de produtos. Preserva integrações Druni/Wells.
 *
 * Substitui o `build-catalog.js` no daily-scrape (que regenera tudo
 * do zero e destrói integrações).
 *
 * Estratégia:
 *  1. Para cada item em store_products[store].items[]:
 *     - Procura na inventory da mesma loja por EAN
 *     - Se encontrar com price mais recente, actualiza price + url + verified_at
 *  2. Para os 23 produtos seed (EANs em PRODUCTS), também actualiza
 *     a partir de prices-snapshot.json (que tem prices estimados).
 *
 * Uso:
 *   node scripts/refresh-seed-prices.js
 *   node scripts/refresh-seed-prices.js --dry-run
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const INV_DIR = path.join(ROOT, 'data', 'inventory');
const PRICES_SNAP = path.join(ROOT, 'data', 'prices-snapshot.json');

const DRY_RUN = process.argv.includes('--dry-run');

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

(function main() {
  if (!fs.existsSync(SEED_BUNDLE)) {
    console.error('✗ Falta', SEED_BUNDLE);
    process.exit(1);
  }
  const seed = loadJSON(SEED_BUNDLE);
  if (!seed?.store_products) {
    console.error('✗ seed-bundle inválido');
    process.exit(1);
  }

  console.log(`📦 Seed: ${seed.products.length} produtos, ${seed.store_products.length} lojas`);

  // ── Inventories ──
  const inventories = {};
  for (const sp of seed.store_products) {
    const invFile = path.join(INV_DIR, `${sp.store_slug}-verified.json`);
    if (fs.existsSync(invFile)) {
      const inv = loadJSON(invFile);
      if (inv?.items) {
        const byEan = {};
        for (const it of inv.items) byEan[it.ean] = it;
        inventories[sp.store_slug] = { verified_at: inv.verified_at, byEan };
      }
    }
  }
  console.log(`📋 Inventories carregadas: ${Object.keys(inventories).length}`);

  // ── Prices snapshot ──
  const pricesSnap = loadJSON(PRICES_SNAP);
  const snapByEanStore = {};
  if (pricesSnap?.prices) {
    for (const p of pricesSnap.prices) {
      snapByEanStore[`${p.ean}|${p.store_slug}`] = p;
    }
  }
  console.log(`📊 Prices snapshot: ${Object.keys(snapByEanStore).length} entries`);

  let updatedCount = 0;
  let urlUpdatedCount = 0;
  let inventoryHits = 0;
  let snapshotHits = 0;

  for (const sp of seed.store_products) {
    const inv = inventories[sp.store_slug];
    for (const item of sp.items) {
      // Tentar 1: inventory (URL verificada)
      const invItem = inv?.byEan?.[item.ean];
      if (invItem) {
        if (invItem.resolved_url && invItem.resolved_url !== item.url) {
          item.url = invItem.resolved_url;
          item.verified_url = true;
          urlUpdatedCount++;
        }
        if (invItem.verified_at && (!item.verified_at || invItem.verified_at > item.verified_at)) {
          item.verified_at = invItem.verified_at;
        }
        inventoryHits++;
      }
      // Tentar 2: prices-snapshot (price + URL)
      const snap = snapByEanStore[`${item.ean}|${sp.store_slug}`];
      if (snap) {
        if (snap.price && snap.price !== item.price) {
          item.previous_price = item.price;
          item.price = snap.price;
          item.discount_pct = snap.discount_pct ?? null;
          updatedCount++;
        }
        if (snap.in_stock != null) item.in_stock = snap.in_stock;
        if (snap.scraped_at && (!item.verified_at || snap.scraped_at > item.verified_at)) {
          item.verified_at = snap.scraped_at;
        }
        snapshotHits++;
      }
    }
  }

  console.log('\n══════ Resumo ══════');
  console.log(`  Inventory hits:    ${inventoryHits}`);
  console.log(`  Snapshot hits:     ${snapshotHits}`);
  console.log(`  Preços actualizados: ${updatedCount}`);
  console.log(`  URLs verificadas actualizadas: ${urlUpdatedCount}`);

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] Nada escrito.');
    return;
  }

  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')} (${(fs.statSync(SEED_BUNDLE).size / 1024).toFixed(0)} KB)`);
})();
