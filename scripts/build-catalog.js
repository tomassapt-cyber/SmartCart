#!/usr/bin/env node
// Fonte de verdade do catálogo. Gera data/{products-master,prices-snapshot}.json deterministicamente + (opcional) popula Postgres + regenera demo.
/**
 * SmartCartCosmetics — build-catalog.js
 * ============================================================
 *
 * Fonte de verdade do catálogo. Adicionar produtos aqui após validar
 * cada loja. EAN real preferido. Se não confirmado: prefixo 200... e
 * ean_source: "pending".
 *
 * O que faz:
 *   1. Lê PRODUCTS (array literal abaixo, 20 produtos reais de seed-data.json)
 *   2. Aplica regras de tier × segment para decidir que (produto, loja)
 *      são elegíveis usando data/stores.json
 *   3. Gera preços determinísticos por hash(ean+store_slug)
 *   4. Escreve data/products-master.json + data/prices-snapshot.json
 *   5. Se DATABASE_URL → popula PostgreSQL (schema unificado)
 *   6. Corre build-demo-seed.js + inject-seed-into-demo.js para o
 *      demo.html ficar sincronizado
 *
 * Uso:
 *   node scripts/build-catalog.js              # JSON + demo
 *   DATABASE_URL=... node scripts/build-catalog.js   # + popula BD
 *
 * Idempotente.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

// ============================================================
// CATÁLOGO — fonte de verdade (20 produtos reais de seed-data.json)
// ============================================================
const PRODUCTS = [
  // ─── PERFUMARIA ───
  { ean: '3145891264100', name: 'Chanel No. 5 Eau de Parfum 50 ml',                                 brand: 'Chanel',             brand_slug: 'chanel',          segment: 'luxe',     category: 'perfume',  base_price: 119.00, volume_ml: 50,  volume_unit: 'ml', image_url: 'https://images.openbeautyfacts.org/images/products/314/589/125/5607/front_fr.9.400.jpg', ean_source: 'real' },
  { ean: '3365440787858', name: 'YSL Black Opium Eau de Parfum 50 ml',                              brand: 'Yves Saint Laurent', brand_slug: 'ysl',             segment: 'luxe',     category: 'perfume',  base_price: 105.00, volume_ml: 50,  volume_unit: 'ml', image_url: 'https://images.openbeautyfacts.org/images/products/336/544/078/7858/front_en.5.400.jpg', ean_source: 'real' },
  { ean: '3348901250146', name: 'Dior Sauvage Eau de Toilette 100 ml',                              brand: 'Dior',               brand_slug: 'dior',            segment: 'luxe',     category: 'perfume',  base_price: 109.00, volume_ml: 100, volume_unit: 'ml', image_url: 'https://images.openfoodfacts.org/images/products/334/890/125/0146/front_fr.3.400.jpg',  ean_source: 'real' },
  { ean: '3360372059707', name: 'Giorgio Armani Code Homme Eau de Toilette 75 ml',                  brand: 'Giorgio Armani',     brand_slug: 'armani',          segment: 'luxe',     category: 'perfume',  base_price: 79.00,  volume_ml: 75,  volume_unit: 'ml', image_url: null, ean_source: 'real' },
  { ean: '8011003845460', name: 'Versace Bright Crystal Eau de Toilette 90 ml',                     brand: 'Versace',            brand_slug: 'versace',         segment: 'prestige', category: 'perfume',  base_price: 75.00,  volume_ml: 90,  volume_unit: 'ml', image_url: null, ean_source: 'real' },

  // ─── SKINCARE ───
  { ean: '3614271326072', name: 'Lancôme Génifique Sérum Avançado 50 ml',                           brand: 'Lancôme',            brand_slug: 'lancome',         segment: 'prestige', category: 'skincare', base_price: 89.00,  volume_ml: 50,  volume_unit: 'ml', image_url: 'https://images.openbeautyfacts.org/images/products/361/427/132/6072/front_fr.6.400.jpg',  ean_source: 'real' },
  { ean: '0887167491625', name: 'Estée Lauder Advanced Night Repair Sérum 50 ml',                   brand: 'Estée Lauder',       brand_slug: 'esteelauder',     segment: 'prestige', category: 'skincare', base_price: 109.00, volume_ml: 50,  volume_unit: 'ml', image_url: 'https://images.openbeautyfacts.org/images/products/088/716/749/1625/front_nl.9.400.jpg',  ean_source: 'real' },
  { ean: '3337875585132', name: 'Vichy Minéral 89 Sérum Hidratante 50 ml',                          brand: 'Vichy',              brand_slug: 'vichy',           segment: 'derma',    category: 'skincare', base_price: 32.00,  volume_ml: 50,  volume_unit: 'ml', image_url: 'https://images.openbeautyfacts.org/images/products/333/787/558/5132/front_en.5.400.jpg',  ean_source: 'real' },
  { ean: '3337875585026', name: 'La Roche-Posay Effaclar Duo+ 40 ml',                               brand: 'La Roche-Posay',     brand_slug: 'larocheposay',    segment: 'derma',    category: 'skincare', base_price: 19.00,  volume_ml: 40,  volume_unit: 'ml', image_url: 'https://images.openbeautyfacts.org/images/products/333/787/558/5026/front_fr.3.400.jpg',  ean_source: 'real' },
  { ean: '3264680004605', name: 'Nuxe Huile Prodigieuse 100 ml',                                    brand: 'Nuxe',               brand_slug: 'nuxe',            segment: 'derma',    category: 'skincare', base_price: 34.00,  volume_ml: 100, volume_unit: 'ml', image_url: 'https://images.openbeautyfacts.org/images/products/326/468/000/4605/front_fr.10.400.jpg', ean_source: 'real' },
  { ean: '3522930003151', name: 'Caudalie Vinoperfect Sérum Luminosidade 30 ml',                    brand: 'Caudalie',           brand_slug: 'caudalie',        segment: 'derma',    category: 'skincare', base_price: 49.00,  volume_ml: 30,  volume_unit: 'ml', image_url: 'https://images.openbeautyfacts.org/images/products/352/293/000/3151/front_fr.8.400.jpg',  ean_source: 'real' },
  { ean: '3337875597196', name: 'CeraVe Creme Hidratante 250 ml',                                   brand: 'CeraVe',             brand_slug: 'cerave',          segment: 'derma',    category: 'skincare', base_price: 16.00,  volume_ml: 250, volume_unit: 'ml', image_url: 'https://images.openbeautyfacts.org/images/products/333/787/559/7196/front_en.28.400.jpg', ean_source: 'real' },

  // ─── HAIR ───
  { ean: '3600523432059', name: "L'Oréal Paris Elvive Óleo Extraordinário 100 ml",                  brand: "L'Oréal Paris",      brand_slug: 'lorealparis',     segment: 'mass',     category: 'hair',     base_price: 9.00,   volume_ml: 100, volume_unit: 'ml', image_url: null, ean_source: 'real' },
  { ean: '3474630639785', name: 'Kérastase Elixir Ultime Óleo Original 100 ml',                     brand: 'Kérastase',          brand_slug: 'kerastase',       segment: 'prestige', category: 'hair',     base_price: 38.00,  volume_ml: 100, volume_unit: 'ml', image_url: null, ean_source: 'real' },
  { ean: '0884486373601', name: 'Redken All Soft Shampoo 300 ml',                                   brand: 'Redken',             brand_slug: 'redken',          segment: 'prestige', category: 'hair',     base_price: 19.00,  volume_ml: 300, volume_unit: 'ml', image_url: null, ean_source: 'real' },

  // ─── BODY ───
  { ean: '8719134109924', name: 'Rituals The Ritual of Sakura Body Cream 220 ml',                   brand: 'Rituals',            brand_slug: 'rituals',         segment: 'masstige', category: 'body',     base_price: 22.00,  volume_ml: 220, volume_unit: 'ml', image_url: null, ean_source: 'real' },
  { ean: '3401395614172', name: 'Bioderma Sensibio H2O Água Micelar 500 ml',                        brand: 'Bioderma',           brand_slug: 'bioderma',        segment: 'derma',    category: 'body',     base_price: 15.00,  volume_ml: 500, volume_unit: 'ml', image_url: null, ean_source: 'real' },

  // ─── MAKEUP ───
  { ean: '3600524025632', name: 'Maybelline Fit Me Foundation 30 ml (120 Classic Ivory)',           brand: 'Maybelline',         brand_slug: 'maybelline',      segment: 'mass',     category: 'makeup',   base_price: 11.00,  volume_ml: 30,  volume_unit: 'ml', image_url: null, ean_source: 'real' },
  { ean: '5060542790147', name: 'Charlotte Tilbury Magic Cream Hidratante 50 ml',                   brand: 'Charlotte Tilbury',  brand_slug: 'charlottetilbury',segment: 'prestige', category: 'makeup',   base_price: 89.00,  volume_ml: 50,  volume_unit: 'ml', image_url: null, ean_source: 'real' },
  { ean: '0607845029250', name: 'NARS Radiant Creamy Concealer 6 ml (Vanilla)',                     brand: 'NARS',               brand_slug: 'nars',            segment: 'prestige', category: 'makeup',   base_price: 33.00,  volume_ml: 6,   volume_unit: 'ml', image_url: null, ean_source: 'real' },

  // ─── NOVOS PRODUTOS DERMA (Mai 2026) — preço confirmado em ≥1 loja ───
  { ean: '3337875585668', name: 'La Roche-Posay Hyalu B5 Sérum 30 ml',                              brand: 'La Roche-Posay',     brand_slug: 'larocheposay',    segment: 'derma',    category: 'skincare', base_price: 33.27,  volume_ml: 30,  volume_unit: 'ml', image_url: null, ean_source: 'pending' },
  { ean: '8470001763440', name: 'ISDIN Fotoprotector Fusion Water Magic SPF50 50 ml',               brand: 'ISDIN',              brand_slug: 'isdin',           segment: 'derma',    category: 'skincare', base_price: 29.60,  volume_ml: 50,  volume_unit: 'ml', image_url: null, ean_source: 'pending' },
  { ean: '3337875797436', name: 'La Roche-Posay Anthelios UVMune 400 Creme SPF50+ 50 ml',           brand: 'La Roche-Posay',     brand_slug: 'larocheposay',    segment: 'derma',    category: 'skincare', base_price: 18.02,  volume_ml: 50,  volume_unit: 'ml', image_url: null, ean_source: 'pending' },
];

// ============================================================
// PRNG determinístico — hash(ean+store_slug) → [0,1)
// ============================================================
function det01(seed) {
  const h = crypto.createHash('sha256').update(seed).digest();
  // primeiros 8 bytes → uint64 → divide por 2^53 para ficar dentro de safe int
  return Number(h.readBigUInt64BE(0) & 0x1FFFFFFFFFFFFFn) / Number(0x1FFFFFFFFFFFFFn);
}

// ============================================================
// Regras de elegibilidade por (loja × produto)
// ============================================================
function eligible(store, product) {
  const tier = store.tier;
  if (tier === 1) return true;                                                     // especialistas
  if (tier === 2) return ['mass', 'masstige', 'derma'].includes(product.segment);   // generalistas
  if (tier === 3) {
    // Farmácias premium (Wells, SweetCare, Pharma2you, Atida) vendem prestige
    // skincare (Lancôme, Estée Lauder, Caudalie). Apenas excluem luxe (Chanel,
    // Dior, YSL — distribuição selectiva) e perfumaria prestige (vai em
    // especialistas/perfumarias dedicadas).
    if (product.segment === 'luxe') return false;
    if (product.segment === 'prestige' && product.category === 'perfume') return false;
    return ['derma', 'mass', 'masstige', 'prestige'].includes(product.segment);
  }
  if (tier === 4) {                                                                 // mono-marca
    if (!product.brand_slug) return false;
    return store.id.toLowerCase().includes(product.brand_slug) ||
           product.brand_slug.includes(store.id.toLowerCase());
  }
  if (tier === 5) {
    if (store.id.toLowerCase().includes('perfume')) return product.category === 'perfume';
    return true;
  }
  return true;  // tier 6/7
}

// ============================================================
// Geração de preço determinístico por tier
// ============================================================
function priceFor(store, product) {
  const r = det01(`${product.ean}|${store.id}|price`);
  let lo, hi;
  switch (store.tier) {
    case 1: lo = 0.85; hi = 1.00; break;
    case 2: lo = 0.92; hi = 1.05; break;
    case 3: lo = 0.90; hi = 1.02; break;
    case 4: lo = 1.00; hi = 1.00; break;  // PVP cheio
    case 5: lo = 0.75; hi = 0.95; break;
    default: lo = 0.88; hi = 1.02;
  }
  let mult = lo + r * (hi - lo);
  if (store.tier === 3 && product.segment === 'derma') mult -= 0.03;
  return Math.round(product.base_price * mult * 100) / 100;
}

function inStockFor(store, product) {
  return det01(`${product.ean}|${store.id}|stock`) < 0.85;   // 85% determinístico
}
function isPromo(store, product) {
  return det01(`${product.ean}|${store.id}|promo`) < 0.05;   // 5%
}

// URL de SEARCH na loja (não fabricada como PDP). Usa search_strategy se existir,
// senão constrói um link genérico tipo loja.pt/search?q=...
// Honesto: leva o utilizador a procurar o produto na loja real em vez de mentir.
function buildSearchUrl(store, product) {
  const query = encodeURIComponent(`${product.brand} ${product.name}`.replace(/\s+/g, ' ').trim());
  const strat = store.search_strategy;
  if (strat?.type === 'url-template' && strat.template) {
    return strat.template.replace('{q}', query);
  }
  // Fallback: tentativa genérica de /?q= (funciona em muitos sites)
  return `${store.url.replace(/\/$/, '')}/?q=${query}`;
}

// ============================================================
// 1. Gerar JSONs (encapsulado em função para permitir import sem side effects)
// ============================================================
function generateAll() {
  const storesPath = path.join(DATA_DIR, 'stores.json');
  const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8')).stores;

  // Lê inventory/{slug}-verified.json para cada loja, se existir (FASE B do pipeline)
  const verifications = loadVerifications(stores);

  // Image overrides: data/image-overrides.json mapeia ean → image_url.
  // Permite preencher imagens em falta sem editar a array hardcoded.
  // Apenas preenche se o produto não tem image_url (sticky — não sobrescreve).
  const overridesPath = path.join(DATA_DIR, 'image-overrides.json');
  const imageOverrides = fs.existsSync(overridesPath)
    ? JSON.parse(fs.readFileSync(overridesPath, 'utf8'))
    : {};
  const productsOut = PRODUCTS.map(p => ({
    ...p,
    image_url: p.image_url || imageOverrides[p.ean] || null,
  }));
  const overrideHits = productsOut.filter(p => imageOverrides[p.ean] && !PRODUCTS.find(orig => orig.ean === p.ean && orig.image_url)).length;
  if (overrideHits > 0) console.log(`  ⓘ image overrides aplicados: ${overrideHits}`);
  const pricesOut = [];

  for (const product of PRODUCTS) {
    for (const store of stores) {
      // Verificação real existe?
      const v = verifications[store.id]?.[product.ean];
      // Override: se temos dados verificados com preço/URL, a loja PROVADAMENTE
      // vende → ignora a regra de elegibilidade (que é heurística, não verdade)
      const hasVerifiedData = v && (v.observed_price != null || (v.status === 'verified' || v.status === 'variant'));
      if (!hasVerifiedData && !eligible(store, product)) continue;

      // CASO 1: loja não vende este produto → saltar (sem oferta falsa)
      if (v && (v.status === 'not-found' || v.status === 'mismatch')) {
        continue;
      }

      // CASO 2: temos preço real (verified OU variant com preço extraído)
      if (v && v.observed_price != null) {
        const prev = v.observed_previous_price != null ? Number(v.observed_previous_price) : null;
        const discount = prev ? Math.round((1 - v.observed_price / prev) * 1000) / 10 : null;
        pricesOut.push({
          ean: product.ean,
          store_slug: store.id,
          price: v.observed_price,
          previous_price: prev,
          discount_pct: discount,
          currency: v.observed_currency || 'EUR',
          in_stock: v.observed_in_stock !== false,
          url: v.resolved_url,
          verified: true,
          source: v.status === 'variant' ? 'scraped-variant' : 'scraped',
          variant_note: v.status === 'variant' ? (v.notes || 'Variante diferente do canónico') : undefined,
          scraped_at: v.verified_at,
          verified_at: v.verified_at,
          // Variantes de tamanho disponíveis nesta loja para este produto
          // (vem do scrape DOM — Wells, Druni, etc.)
          variants: Array.isArray(v.observed_variants) && v.observed_variants.length > 0
            ? v.observed_variants
            : undefined,
        });
        continue;
      }

      // CASO 3: URL canónica resolvida mas sem preço extraído
      // → estimativa de preço + URL canónica (melhor que search URL)
      // → flag verified_url=true para a UI saber que pelo menos a URL é real
      const hasCanonicalUrl = v && v.resolved_url && ['verified', 'variant', 'low-confidence'].includes(v.status);

      // Estimativa determinística (caso 3 ou caso default sem verificação)
      const price = priceFor(store, product);
      const promo = isPromo(store, product);
      const stock = inStockFor(store, product);
      const previous_price = promo ? Math.round((price / 0.85) * 100) / 100 : null;
      const discount_pct = previous_price ? Math.round((1 - price / previous_price) * 1000) / 10 : null;
      pricesOut.push({
        ean: product.ean,
        store_slug: store.id,
        price,
        previous_price,
        discount_pct,
        currency: 'EUR',
        in_stock: stock,
        url: hasCanonicalUrl ? v.resolved_url : buildSearchUrl(store, product),
        verified: false,                                 // preço continua estimado
        verified_url: hasCanonicalUrl === true,          // mas a URL é canónica
        source: hasCanonicalUrl ? 'estimated-with-canonical-url' : 'estimated',
        scraped_at: new Date().toISOString(),
      });
    }
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'products-master.json'),
    JSON.stringify({ version: '2.0', generated_at: new Date().toISOString(), count: productsOut.length, products: productsOut }, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'prices-snapshot.json'),
    JSON.stringify({ version: '2.0', generated_at: new Date().toISOString(), count: pricesOut.length, prices: pricesOut }, null, 2));

  const inStockCount = pricesOut.filter(p => p.in_stock).length;
  const promoCount = pricesOut.filter(p => p.previous_price !== null).length;
  const verifiedCount = pricesOut.filter(p => p.verified).length;
  const estimatedCount = pricesOut.length - verifiedCount;
  console.log(`✔ ${productsOut.length} produtos · ${pricesOut.length} linhas de preço`);
  console.log(`  ${verifiedCount} verificadas (source=scraped) · ${estimatedCount} estimadas (source=estimated)`);
  console.log(`  ${inStockCount} em stock (${(100 * inStockCount / pricesOut.length).toFixed(0)}%) · ${promoCount} em promo`);
  console.log(`  data/products-master.json`);
  console.log(`  data/prices-snapshot.json`);

  return { stores, productsOut, pricesOut };
}

/**
 * Carrega data/inventory/{slug}-verified.json para cada loja com inventário.
 * Devolve { storeSlug: { ean: <verification entry> } }
 */
function loadVerifications(stores) {
  const out = {};
  const invDir = path.join(ROOT, 'data', 'inventory');
  for (const s of stores) {
    const fp = path.join(invDir, `${s.id}-verified.json`);
    if (!fs.existsSync(fp)) continue;
    try {
      const doc = JSON.parse(fs.readFileSync(fp, 'utf8'));
      out[s.id] = {};
      for (const item of doc.items || []) {
        out[s.id][item.ean] = item;
      }
      const counts = (doc.items || []).reduce((a, i) => { a[i.status] = (a[i.status]||0) + 1; return a; }, {});
      console.log(`  ⓘ verificações ${s.id}: ${JSON.stringify(counts)}`);
    } catch (err) {
      console.warn(`  ⚠ inválido ${fp}: ${err.message}`);
    }
  }
  return out;
}

// ============================================================
// 2. Populate Postgres (se DATABASE_URL)
// ============================================================
async function populateDb({ stores, productsOut, pricesOut }) {
  let Pool;
  try { ({ Pool } = require('pg')); } catch { console.warn('  ⚠ pg não instalado — skip BD'); return; }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // stores
    for (const s of stores) {
      const tipo = ['especializada','farmacia','generalista','nicho','marca-propria'].includes(s.tipo) ? s.tipo : 'especializada';
      const shippingZones = JSON.stringify({ mainland: 0, madeira: 1.5, acores: 1.5 });
      const freeShip = ({1:29,2:30,3:39,4:49,5:30,6:25,7:30})[s.tier] || 30;
      await client.query(`
        INSERT INTO stores (slug, name, base_url, tier, tipo, shipping_zones, free_shipping_threshold)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        ON CONFLICT (slug) DO UPDATE SET
          name=EXCLUDED.name, base_url=EXCLUDED.base_url, tier=EXCLUDED.tier,
          tipo=EXCLUDED.tipo, free_shipping_threshold=EXCLUDED.free_shipping_threshold
      `, [s.id, s.nome, s.url, s.tier, tipo, shippingZones, freeShip]);
    }

    // products
    for (const p of productsOut) {
      await client.query(`
        INSERT INTO products (ean, name, brand, brand_slug, category, segment, volume_ml, volume_unit, base_price, image_url, ean_source)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (ean) DO UPDATE SET
          name=EXCLUDED.name, brand=EXCLUDED.brand, brand_slug=EXCLUDED.brand_slug,
          category=EXCLUDED.category, segment=EXCLUDED.segment,
          volume_ml=EXCLUDED.volume_ml, volume_unit=EXCLUDED.volume_unit,
          base_price=EXCLUDED.base_price, image_url=EXCLUDED.image_url,
          ean_source=EXCLUDED.ean_source, updated_at=NOW()
      `, [p.ean, p.name, p.brand, p.brand_slug, p.category, p.segment, p.volume_ml, p.volume_unit, p.base_price, p.image_url, p.ean_source]);
    }

    // prices — append-only (cada corrida adiciona snapshot novo)
    let inserted = 0;
    for (const pr of pricesOut) {
      await client.query(`
        INSERT INTO prices (product_id, store_id, price, previous_price, discount_pct, currency, in_stock, url, verified, source, scraped_at)
        SELECT p.id, s.id, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz
          FROM products p, stores s
         WHERE p.ean = $1 AND s.slug = $2
      `, [pr.ean, pr.store_slug, pr.price, pr.previous_price, pr.discount_pct, pr.currency, pr.in_stock, pr.url, pr.verified, pr.source, pr.scraped_at]);
      inserted++;
    }

    await client.query(`UPDATE stores SET last_scraped_at = NOW() WHERE slug = ANY($1)`, [stores.map(s => s.id)]);
    await client.query('COMMIT');
    console.log(`✔ BD: ${stores.length} lojas + ${productsOut.length} produtos + ${inserted} preços`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// ============================================================
// 3. Run build-demo-seed.js + inject-seed-into-demo.js
// ============================================================
function runScript(name) {
  const r = spawnSync(process.execPath, [path.join(__dirname, name)], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${name} falhou (exit ${r.status})`);
}

// Exportações para reuso (ex.: verify-store.js lê PRODUCTS daqui)
module.exports = { PRODUCTS, eligible, priceFor, generateAll };

// Side effects (gerar JSON, popular BD, regenerar demo) só quando corrido directamente
if (require.main === module) {
  (async () => {
    const generated = generateAll();
    if (process.env.DATABASE_URL) {
      try { await populateDb(generated); } catch (err) { console.error('  ⚠ BD falhou:', err.message); }
    } else {
      console.log('  ⓘ DATABASE_URL não definido — skip populate BD');
    }
    runScript('build-demo-seed.js');
    runScript('inject-seed-into-demo.js');
    runScript('remap-eans.js');
    console.log('✔ pipeline completo');
  })();
}
