#!/usr/bin/env node
// Lê data/prices-verified.json (v3.4) e actualiza data/inventory/{slug}-verified.json
// para notino, sephora, douglas, wells, atida.
//
// Mapeia status → inventory item:
//   confirmed (com preço seed-size)        → status: "verified" + observed_price
//   variant_confirmed (seed-size diferente) → status: "variant"  + observed_price (do tamanho mais próximo)
//   confirmed_oos                           → status: "verified" + observed_in_stock: false
//   brand_not_sold | not_found              → status: "not-found"
//   url_only | pdp_found_price_pending      → status: "verified" sem observed_price
//   outros                                  → omite

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERIFIED = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prices-verified.json'), 'utf8'));

const STORE_META = {
  notino:  { name: 'Notino PT',          base: 'https://www.notino.pt' },
  sephora: { name: 'Sephora PT',         base: 'https://www.sephora.pt' },
  douglas: { name: 'Douglas PT',         base: 'https://www.douglas.pt' },
  wells:   { name: 'Wells',              base: 'https://wells.pt' },
  atida:   { name: 'Atida | Mifarma PT', base: 'https://www.atida.com' },
};

// Extrai preço para o tamanho seed (volume_ml). Procura várias chaves preco_*.
function extractPriceForVolume(storeBlock, productVolumeML, productCategory) {
  if (!storeBlock) return null;
  const v = productVolumeML;
  // chaves possíveis no JSON: preco_50ml, preco_30ml, preco_100ml, preco_340g, preco_500ml, etc.
  const keyExact = `preco_${v}ml`;
  const keyExactG = `preco_${v}g`;
  const candidates = [keyExact, keyExactG, 'preco', `preco_${v}ml_cream`, `preco_${v}ml_serum`, `preco_${v}ml_fluido`];
  for (const k of candidates) {
    if (typeof storeBlock[k] === 'number') return { price: storeBlock[k], previous: storeBlock[`preco_anterior_${v}ml`] ?? storeBlock[`preco_anterior_${v}g`] ?? storeBlock.preco_anterior ?? null, exactMatch: true };
  }
  // tamanho não bate — devolver preço mais barato disponível como variante
  const numericKeys = Object.keys(storeBlock).filter(k => k.startsWith('preco_') && !k.includes('anterior') && typeof storeBlock[k] === 'number');
  if (numericKeys.length) {
    const minKey = numericKeys.reduce((a, b) => storeBlock[a] < storeBlock[b] ? a : b);
    return { price: storeBlock[minKey], previous: null, exactMatch: false, variantKey: minKey };
  }
  return null;
}

function inventoryItemFor(product, storeSlug, storeBlock) {
  if (!storeBlock) return null;
  const base = {
    ean: product.ean,
    name: product.nome_canonico,
    brand: product.brand,
    expected_volume_ml: extractVolumeFromName(product.nome_canonico),
    verified_at: storeBlock.verified_at || '2026-05-15T11:00:00.000Z',
  };

  const st = storeBlock.status;

  if (st === 'brand_not_sold' || st === 'not_found' || st === 'not_found_variant_only') {
    return { ...base, resolved_url: null, status: 'not-found', notes: storeBlock.evidence || storeBlock.notas || st };
  }

  if (st === 'not_checked' || st === 'not_checked_this_session' || st === 'blocked_waf' || st === 'pdp_found_price_pending' || st === 'url_known_not_priced') {
    if (!storeBlock.url) return null;
    return {
      ...base,
      resolved_url: storeBlock.url,
      resolution_method: 'sidepanel-or-mcp',
      observed_name: null,
      confidence: 0.6,
      status: 'low-confidence',
      notes: storeBlock.notas || storeBlock.evidence || 'URL conhecida; preço pendente',
    };
  }

  if (st === 'confirmed' || st === 'confirmed_oos' || st === 'variant_confirmed' || st === 'variant_confirmed_different_size' || st === 'variant_confirmed_other_size_oos' || st === 'variant_possible') {
    const priceInfo = extractPriceForVolume(storeBlock, base.expected_volume_ml, product.category);
    if (!priceInfo) {
      // tem URL mas sem preço extraível
      return storeBlock.url ? {
        ...base,
        resolved_url: storeBlock.url,
        resolution_method: 'sidepanel-or-mcp',
        observed_name: storeBlock.variant || null,
        confidence: 0.7,
        status: 'low-confidence',
        notes: 'PDP confirmada; preço por extrair',
      } : null;
    }
    return {
      ...base,
      resolved_url: storeBlock.url || null,
      resolution_method: 'json-ld-realtime',
      observed_name: storeBlock.variant ? `${product.nome_canonico} (${storeBlock.variant})` : product.nome_canonico,
      observed_brand: product.brand,
      observed_volume_ml: base.expected_volume_ml,
      observed_price: priceInfo.price,
      observed_previous_price: priceInfo.previous,
      observed_currency: storeBlock.moeda || 'EUR',
      observed_in_stock: st !== 'confirmed_oos' && (storeBlock.em_stock !== false),
      confidence: priceInfo.exactMatch ? 0.95 : 0.80,
      status: st.startsWith('variant') ? 'variant' : 'verified',
      notes: storeBlock.variant ? `Variante: ${storeBlock.variant}` : (storeBlock.notas || ''),
    };
  }

  return null;
}

function extractVolumeFromName(name) {
  const m = name.match(/(\d+)\s*ml/i);
  return m ? parseInt(m[1], 10) : null;
}

// Constrói inventories
const inventoriesByStore = {};
for (const slug of Object.keys(STORE_META)) {
  inventoriesByStore[slug] = {
    version: '2.0',
    store_slug: slug,
    store_name: STORE_META[slug].name,
    store_url: STORE_META[slug].base,
    verified_at: '2026-05-15T11:30:00.000Z',
    method: 'Real-time via Claude in Chrome MCP + sidepanel (sync-from-verified.js)',
    items: [],
  };
}

for (const p of VERIFIED.products) {
  for (const slug of Object.keys(STORE_META)) {
    const block = p[slug];
    const item = inventoryItemFor(p, slug, block);
    if (item) inventoriesByStore[slug].items.push(item);
  }
}

// Calcula stats e escreve
for (const slug of Object.keys(STORE_META)) {
  const inv = inventoriesByStore[slug];
  const stats = { total: inv.items.length, verified: 0, variant: 0, not_found: 0, low_confidence: 0 };
  for (const it of inv.items) {
    if (it.status === 'verified') stats.verified++;
    else if (it.status === 'variant') stats.variant++;
    else if (it.status === 'not-found') stats.not_found++;
    else if (it.status === 'low-confidence') stats.low_confidence++;
  }
  inv.stats = stats;
  const fp = path.join(ROOT, 'data', 'inventory', `${slug}-verified.json`);
  fs.writeFileSync(fp, JSON.stringify(inv, null, 2), 'utf8');
  const withPrice = inv.items.filter(i => typeof i.observed_price === 'number').length;
  console.log(`✔ ${slug}-verified.json — ${inv.items.length} items (verified=${stats.verified}, variant=${stats.variant}, not-found=${stats.not_found}, low-conf=${stats.low_confidence}, com preço=${withPrice})`);
}

console.log('\nAgora corre: node scripts/build-catalog.js para regenerar demo.html');
