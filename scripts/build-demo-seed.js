#!/usr/bin/env node
// Converte data/{stores,products-master,prices-snapshot}.json → data/seed-bundle.json no formato que o demo.html consome.
/**
 * SmartCartCosmetics — build-demo-seed.js
 *
 * Lê:
 *   data/stores.json           (slug-style: id, nome, url, tier)
 *   data/products-master.json  (novo schema: products[] com ean/name/brand/category)
 *   data/prices-snapshot.json  (novo schema: prices[] com store_slug/price/in_stock/url)
 *
 * Produz:
 *   data/seed-bundle.json no formato esperado pelo demo:
 *     { stores, products, store_products }
 *
 * Idempotente. Corre standalone ou via scripts/build-catalog.js.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STORES_RAW   = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stores.json'), 'utf8')).stores;
const PRODUCTS_RAW = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products-master.json'), 'utf8')).products;
const PRICES_DOC   = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prices-snapshot.json'), 'utf8'));
// Aceita o novo schema (campo `prices`) ou o legado (campo `precos`)
const PRICES_RAW = PRICES_DOC.prices || PRICES_DOC.precos || [];

// Threshold de portes grátis por tier
const FREE_SHIP_BY_TIER = { 1: 29, 2: 30, 3: 39, 4: 49, 5: 30, 6: 25, 7: 30 };

// STORES — formato que o demo.html espera
const stores = STORES_RAW.map((s) => ({
  slug: s.id,
  name: s.nome,
  base_url: s.url,
  logo_url: s.logo_url || null,
  free_shipping_threshold: s.free_shipping_threshold || FREE_SHIP_BY_TIER[s.tier] || 30,
  shipping_zones: s.shipping_zones || { mainland: 0, madeira: 1.5, acores: 1.5 },
}));

// PRODUCTS — accept either new (en) or legacy (pt) field names
const products = PRODUCTS_RAW.map((p) => ({
  ean: p.ean,
  name: p.name || p.nome,
  brand: p.brand || p.marca,
  category: p.category || p.categoria,
  image_url: p.image_url || p.imagem_url || null,
}));

// STORE_PRODUCTS agrupados por loja
const byStore = new Map();
for (const s of stores) byStore.set(s.slug, []);
for (const pr of PRICES_RAW) {
  const slug = pr.store_slug || pr.loja_id;
  if (!byStore.has(slug)) continue;
  byStore.get(slug).push({
    ean: pr.ean,
    price: Number(pr.price ?? pr.preco),
    previous_price: pr.previous_price != null ? Number(pr.previous_price) : null,
    discount_pct: pr.discount_pct != null ? Number(pr.discount_pct) : null,
    in_stock: !!(pr.in_stock ?? pr.em_stock),
    url: pr.url || pr.url_produto,
    verified: pr.verified === true,
    verified_url: pr.verified_url === true || pr.verified === true,
    verified_at: pr.verified_at || pr.scraped_at || null,
    source: pr.source || (pr.verified ? 'scraped' : 'estimated'),
    variant_note: pr.variant_note || undefined,
    variants: Array.isArray(pr.variants) && pr.variants.length > 0 ? pr.variants : undefined,
  });
}

// ── Cross-store volume validation ────────────────────────────────────────
// Conta quantas lojas verificadas listam cada (ean, volume_ml) par.
// Mantém só volumes que apareçam em ≥2 lojas OU = produto seed volume.
// Mata contaminação (e.g., Druni 100ml €41.95 sozinho = body lotion).
const volumeVotes = {};
for (const sp of byStore.values()) {
  for (const item of sp) {
    if (!item.verified || !Array.isArray(item.variants)) continue;
    for (const v of item.variants) {
      const k = `${item.ean}|${v.volume_ml}`;
      volumeVotes[k] = (volumeVotes[k] || 0) + 1;
    }
  }
}
// Seed volumes (do nome do produto) sempre válidos
const seedVolumes = {};
for (const p of products) {
  const m = (p.name || '').match(/(\d+(?:[.,]\d+)?)\s*ml/i);
  if (m) seedVolumes[`${p.ean}|${parseFloat(m[1].replace(',', '.'))}`] = true;
}
let filteredCount = 0;
for (const sp of byStore.values()) {
  for (const item of sp) {
    if (!Array.isArray(item.variants)) continue;
    const before = item.variants.length;
    item.variants = item.variants.filter(v => {
      const k = `${item.ean}|${v.volume_ml}`;
      return (volumeVotes[k] || 0) >= 2 || seedVolumes[k];
    });
    filteredCount += (before - item.variants.length);
    if (item.variants.length === 0) delete item.variants;
  }
}
if (filteredCount > 0) console.log(`  ⓘ cross-store filter: ${filteredCount} variant(s) descartadas (volume único numa só loja)`);
const store_products = [...byStore.entries()].map(([store_slug, items]) => ({ store_slug, items }));

const bundle = { stores, products, store_products };

const outPath = path.join(ROOT, 'data', 'seed-bundle.json');
fs.writeFileSync(outPath, JSON.stringify(bundle), 'utf8');
const totalOffers = store_products.reduce((s, sp) => s + sp.items.length, 0);
const verifiedOffers = store_products.reduce((s, sp) => s + sp.items.filter(i => i.verified).length, 0);
console.log(`✔ ${outPath}`);
console.log(`  stores: ${stores.length} · products: ${products.length}`);
console.log(`  total offers: ${totalOffers} (${verifiedOffers} verificadas / ${totalOffers - verifiedOffers} estimadas)`);
console.log(`  tamanho: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
