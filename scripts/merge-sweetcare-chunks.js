#!/usr/bin/env node
/**
 * SmartCart — Merge Sweetcare chunk files into sweetcare-full.json
 * ============================================================
 *
 * Lê todos os sweetcare-chunk-*.json de data/catalog/ e faz merge
 * num único sweetcare-full.json, deduplicando por URL (mais recente ganha).
 *
 * Uso:
 *   node scripts/merge-sweetcare-chunks.js
 */

const fs = require('fs');
const path = require('path');
const { glob } = fs;

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'sweetcare-full.json');

const chunkFiles = fs.readdirSync(CATALOG_DIR)
  .filter(f => /^sweetcare-chunk-\d+-\d+\.json$/.test(f))
  .map(f => path.join(CATALOG_DIR, f))
  .sort();

if (chunkFiles.length === 0) {
  console.error('✗ Nenhum sweetcare-chunk-*.json encontrado em', CATALOG_DIR);
  process.exit(1);
}

console.log(`📦 Merge de ${chunkFiles.length} chunk(s):`);

const byUrl = new Map();
let totalStats = { ok: 0, blocked: 0, no_jsonld: 0, error: 0 };

for (const f of chunkFiles) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    console.warn(`  ⚠ ${path.basename(f)}: parse error — ${e.message}`);
    continue;
  }
  const products = data.products || [];
  console.log(`  ${path.basename(f)}: ${products.length} produtos`);

  for (const p of products) {
    const existing = byUrl.get(p.url);
    // Mais recente ganha (scraped_at mais alto)
    if (!existing || (p.scraped_at || '') >= (existing.scraped_at || '')) {
      byUrl.set(p.url, p);
    }
  }

  // Acumula stats
  const s = data.stats || {};
  for (const k of Object.keys(totalStats)) {
    totalStats[k] = (totalStats[k] || 0) + (s[k] || 0);
  }
}

const merged = [...byUrl.values()];
const byCat = {};
for (const p of merged) byCat[p.category] = (byCat[p.category] || 0) + 1;

console.log(`\n✓ Total merged: ${merged.length} produtos`);
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([c, n]) =>
  console.log(`  ${c.padEnd(15)} ${n}`)
);

const output = {
  merged_at: new Date().toISOString(),
  source_chunks: chunkFiles.map(f => path.basename(f)),
  total: merged.length,
  stats: totalStats,
  by_category: byCat,
  products: merged,
};

fs.writeFileSync(OUT_FILE, JSON.stringify(output));
console.log(`\n💾 ${OUT_FILE.replace(ROOT, '.')}`);
