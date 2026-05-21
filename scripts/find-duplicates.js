#!/usr/bin/env node
/**
 * find-duplicates — audita o seed-bundle à procura de produtos
 * potencialmente duplicados que o fingerprint canónico falhou em apanhar.
 *
 * Sinais (do mais forte para o mais fraco):
 *  1. MESMA image_url       → quase de certeza duplicados
 *  2. MESMA URL de loja     → idem
 *  3. Mesma brand + 80%+ tokens em comum no nome canónico
 *  4. EAN diferentes mas mesmo prefixo GTIN-13 (mesma marca/produto)
 *
 * Output: data/audit/duplicate-candidates.json + console summary.
 *
 * Uso: node scripts/find-duplicates.js
 */

const fs = require('fs');
const path = require('path');
const { productFingerprint, normalizeBrand, canonicalName } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const OUT_DIR = path.join(ROOT, 'data', 'audit');
const OUT_FILE = path.join(OUT_DIR, 'duplicate-candidates.json');

if (!fs.existsSync(SEED)) {
  console.error('✗ seed-bundle.json não existe');
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
const products = seed.products;

console.log(`📦 A auditar ${products.length} produtos...\n`);

// ─── 1. Por image_url ───
const byImage = {};
for (const p of products) {
  if (!p.image_url) continue;
  if (!byImage[p.image_url]) byImage[p.image_url] = [];
  byImage[p.image_url].push(p);
}
const imageGroups = Object.entries(byImage).filter(([, ps]) => ps.length > 1);

console.log(`═══ 🖼  Duplicados por MESMA IMAGEM (sinal forte) — ${imageGroups.length} grupos ═══`);
imageGroups.slice(0, 30).forEach(([img, ps]) => {
  console.log(`\n  ${ps.length} produtos partilham ${img.slice(0, 70)}...`);
  ps.forEach(p => console.log(`    • ${p.ean.padEnd(15)} | ${p.brand} — ${p.name.slice(0, 60)}`));
});

// ─── 2. Por URL de loja ───
const byStoreUrl = {};
for (const sp of seed.store_products) {
  for (const item of sp.items) {
    if (!item.url || item.url.includes('?q=') || item.url.includes('search')) continue;
    const key = `${sp.store_slug}|${item.url}`;
    if (!byStoreUrl[key]) byStoreUrl[key] = [];
    byStoreUrl[key].push({ ean: item.ean, store: sp.store_slug, url: item.url });
  }
}
const urlGroups = Object.entries(byStoreUrl).filter(([, items]) => items.length > 1);

console.log(`\n═══ 🔗 Duplicados por MESMA URL de loja — ${urlGroups.length} grupos ═══`);
urlGroups.slice(0, 30).forEach(([key, items]) => {
  const [store, url] = key.split('|');
  const eans = items.map(i => i.ean);
  const names = eans.map(e => products.find(p => p.ean === e)?.name.slice(0, 50));
  console.log(`\n  ${store} → ${url.slice(0, 60)}...`);
  eans.forEach((e, i) => console.log(`    • ${e.padEnd(15)} | ${names[i]}`));
});

// ─── 3. Por similaridade fingerprint (mesmo brand + ≥70% tokens overlap) ───
const byBrandFp = {};
for (const p of products) {
  const fp = productFingerprint(p);
  if (!fp) continue;
  const [brand, name] = fp.split('|');
  if (!byBrandFp[brand]) byBrandFp[brand] = [];
  byBrandFp[brand].push({ p, tokens: new Set((name || '').split('-').filter(Boolean)) });
}

const similarPairs = [];
for (const [brand, items] of Object.entries(byBrandFp)) {
  if (items.length < 2) continue;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.tokens.size === 0 || b.tokens.size === 0) continue;
      const intersection = [...a.tokens].filter(t => b.tokens.has(t)).length;
      const union = new Set([...a.tokens, ...b.tokens]).size;
      const sim = union > 0 ? intersection / union : 0;
      // Threshold 0.6 — pelo menos 60% tokens em comum
      if (sim >= 0.6 && intersection >= 2) {
        similarPairs.push({
          sim: sim.toFixed(2),
          shared: intersection,
          a: { ean: a.p.ean, name: a.p.name.slice(0, 60) },
          b: { ean: b.p.ean, name: b.p.name.slice(0, 60) },
          brand,
        });
      }
    }
  }
}
similarPairs.sort((x, y) => parseFloat(y.sim) - parseFloat(x.sim));

console.log(`\n═══ 🧬 Pares com 60%+ overlap de tokens (mesmo brand) — ${similarPairs.length} pares ═══`);
similarPairs.slice(0, 40).forEach(pair => {
  console.log(`\n  [${pair.sim} sim, ${pair.shared} tokens] ${pair.brand}`);
  console.log(`    • ${pair.a.ean.padEnd(15)} | ${pair.a.name}`);
  console.log(`    • ${pair.b.ean.padEnd(15)} | ${pair.b.name}`);
});

// ─── Output ───
fs.mkdirSync(OUT_DIR, { recursive: true });
const output = {
  audited_at: new Date().toISOString(),
  seed_products: products.length,
  signals: {
    same_image_groups: imageGroups.map(([img, ps]) => ({ image: img, count: ps.length, eans: ps.map(p => ({ ean: p.ean, name: p.name })) })),
    same_store_url_groups: urlGroups.map(([key, items]) => ({ store: key.split('|')[0], url: key.split('|')[1], count: items.length, eans: items.map(i => i.ean) })),
    similar_fingerprint_pairs: similarPairs,
  },
};

fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
console.log(`\n💾 Output: ${OUT_FILE.replace(ROOT, '.')}`);
console.log(`\nResumo:`);
console.log(`  Duplicados por imagem:          ${imageGroups.length} grupos (${imageGroups.reduce((a, [, ps]) => a + ps.length - 1, 0)} duplicados potenciais)`);
console.log(`  Duplicados por URL de loja:     ${urlGroups.length} grupos`);
console.log(`  Pares similares por fingerprint: ${similarPairs.length}`);
