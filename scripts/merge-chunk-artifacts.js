#!/usr/bin/env node
/**
 * GirlMath — Merge chunk artifacts into single catalog JSON
 * ============================================================
 * Junta vários JSONs de chunks (do scraper Druni/Sweetcare chunked) num
 * único catalog file, preferindo:
 *   1. Produtos com status=ok > no_jsonld > error
 *   2. Quando ambos OK, o com scraped_at mais recente
 *
 * Usage:
 *   node scripts/merge-chunk-artifacts.js data/.artifacts/druni-1.json druni-2.json druni-3.json --output=data/catalog/druni-full.json
 */
const fs = require('fs');

const args = process.argv.slice(2);
const outputArg = args.find(a => a.startsWith('--output='));
if (!outputArg) {
  console.error('Missing --output=path');
  process.exit(1);
}
const OUT = outputArg.split('=')[1];
const inputs = args.filter(a => !a.startsWith('--'));

if (inputs.length === 0) {
  console.error('No input JSONs given');
  process.exit(1);
}

const STATUS_RANK = { ok: 3, no_jsonld: 2, 'no-jsonld': 2, error: 1, undefined: 0 };

const byUrl = {};
let totalSeen = 0;
for (const f of inputs) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const p of d.products || []) {
    totalSeen++;
    const url = p.url;
    if (!url) continue;
    const existing = byUrl[url];
    if (!existing) { byUrl[url] = p; continue; }
    const newRank = STATUS_RANK[p.status] || 0;
    const oldRank = STATUS_RANK[existing.status] || 0;
    if (newRank > oldRank) { byUrl[url] = p; continue; }
    if (newRank === oldRank) {
      // empate: mais recente
      const tNew = new Date(p.scraped_at || 0).getTime();
      const tOld = new Date(existing.scraped_at || 0).getTime();
      if (tNew > tOld) byUrl[url] = p;
    }
  }
}

const products = Object.values(byUrl);
const statuses = {};
products.forEach(p => statuses[p.status || 'no-status'] = (statuses[p.status || 'no-status'] || 0) + 1);

console.log(`Inputs: ${inputs.length} files, ${totalSeen} produtos vistos`);
console.log(`Output: ${products.length} produtos únicos por URL`);
console.log(`Status breakdown:`, JSON.stringify(statuses));

const latestScraped = products.reduce((max, p) => {
  const t = new Date(p.scraped_at || 0).getTime();
  return t > max ? t : max;
}, 0);

const out = {
  scraped_at: new Date(latestScraped).toISOString(),
  source: 'merged-chunks',
  merged_from: inputs.map(f => f.split(/[\\/]/).pop()),
  products,
};
fs.writeFileSync(OUT, JSON.stringify(out), 'utf8');
const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`✓ ${OUT} (${kb} KB)`);
