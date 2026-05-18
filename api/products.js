#!/usr/bin/env node
// REST API HTTP simples: modo BD (schema unificado: products/stores/prices) ou modo seed (fallback dev). Serve catálogo ao demo.html.
/**
 * SmartCartCosmetics — REST API products
 *
 * Modos:
 *   1. Modo BD (DATABASE_URL definido): usa schema unificado v1.1
 *      tabelas em inglês — products, stores, prices, latest_prices
 *   2. Modo seed (fallback): lê db/seed-data.json
 *
 * Endpoints:
 *   GET /api/health                       → status + modo
 *   GET /api/products                     → listagem (?category, ?brand, ?q, ?page, ?limit)
 *   GET /api/products/:ean                → detalhe + preços por loja
 *   GET /api/products/:ean/prices         → histórico (BD) ou snapshot (seed)
 *   GET /api/categories                   → lista de categorias
 *   GET /api/stores                       → lista de lojas (com tier)
 *   GET /api/catalog                      → bundle completo no formato seed-bundle.json
 *                                            (consumido por loadLiveCatalog() do demo.html)
 *
 * Standalone: `node api/products.js` arranca em :3001
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT || '3001', 10);
const DATABASE_URL = process.env.DATABASE_URL;

// -----------------------------------------------------------
// Modo BD ou seed
// -----------------------------------------------------------
let mode = 'seed';
let pool = null;

if (DATABASE_URL) {
  try {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: DATABASE_URL });
    mode = 'bd';
  } catch (err) {
    console.warn(`[api] pg indisponível — fallback para seed: ${err.message}`);
  }
}

let SEED = null;
function loadSeed() {
  if (SEED) return SEED;
  const seedPath = path.resolve(__dirname, '..', 'db', 'seed-data.json');
  SEED = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  return SEED;
}

const FREE_SHIP_BY_TIER = { 1: 29, 2: 30, 3: 39, 4: 49, 5: 30, 6: 25, 7: 30 };

// -----------------------------------------------------------
// Repositório BD (schema unificado)
// -----------------------------------------------------------
const repoDb = {
  async listProducts({ category, brand, q, page, limit }) {
    const args = [];
    const where = ['p.active = TRUE'];
    if (category) { args.push(category); where.push(`p.category = $${args.length}`); }
    if (brand)    { args.push(brand);    where.push(`(p.brand ILIKE $${args.length} OR p.brand_slug = $${args.length})`); }
    if (q)        { args.push(`%${q}%`); where.push(`(p.name ILIKE $${args.length} OR p.brand ILIKE $${args.length})`); }
    const offset = (page - 1) * limit;
    args.push(limit, offset);
    const sql = `
      SELECT p.id, p.ean, p.name, p.brand, p.brand_slug, p.category, p.segment,
             p.volume_ml, p.volume_unit, p.image_url, p.ean_source,
             (SELECT MIN(price) FROM latest_prices lp
                WHERE lp.product_id = p.id AND lp.in_stock) AS min_price,
             (SELECT COUNT(*) FROM latest_prices lp
                WHERE lp.product_id = p.id AND lp.in_stock) AS stores_in_stock
        FROM products p
       WHERE ${where.join(' AND ')}
       ORDER BY p.brand, p.name
       LIMIT $${args.length - 1} OFFSET $${args.length}
    `;
    const { rows } = await pool.query(sql, args);
    return rows;
  },

  async getProduct(ean) {
    const { rows } = await pool.query(`
      SELECT id, ean, name, brand, brand_slug, category, segment,
             volume_ml, volume_unit, base_price, image_url, ean_source
      FROM products WHERE ean = $1 AND active = TRUE
    `, [ean]);
    if (!rows[0]) return null;
    const product = rows[0];
    const { rows: prices } = await pool.query(`
      SELECT s.slug AS store_slug, s.name AS store_name, s.tier AS store_tier,
             lp.price, lp.previous_price, lp.discount_pct, lp.in_stock,
             lp.url, lp.verified, lp.source, lp.scraped_at
        FROM latest_prices lp
        JOIN stores s    ON s.id = lp.store_id
        JOIN products p  ON p.id = lp.product_id
       WHERE p.ean = $1
       ORDER BY lp.price ASC NULLS LAST
    `, [ean]);
    return { ...product, prices };
  },

  async productHistory(ean, daysBack = 30) {
    const { rows } = await pool.query(`
      SELECT s.slug AS store_slug, pr.price, pr.in_stock, pr.scraped_at
        FROM prices pr
        JOIN stores s   ON s.id = pr.store_id
        JOIN products p ON p.id = pr.product_id
       WHERE p.ean = $1 AND pr.scraped_at >= NOW() - ($2 || ' days')::interval
       ORDER BY pr.scraped_at DESC
    `, [ean, daysBack]);
    return rows;
  },

  async listStores() {
    const { rows } = await pool.query(`
      SELECT slug, name, base_url, tier, tipo, free_shipping_threshold, last_scraped_at
      FROM stores WHERE active ORDER BY tier, name
    `);
    return rows;
  },

  async listCategories() {
    const { rows } = await pool.query(`
      SELECT DISTINCT category FROM products WHERE active ORDER BY category
    `);
    return rows.map(r => ({ slug: r.category }));
  },

  async fullCatalog() {
    const { rows: stores } = await pool.query(`
      SELECT slug, name, base_url, logo_url,
             COALESCE(free_shipping_threshold, 30)::float AS free_shipping_threshold,
             COALESCE(shipping_zones, '{}'::jsonb) AS shipping_zones
      FROM stores WHERE active ORDER BY tier, name
    `);
    const { rows: products } = await pool.query(`
      SELECT ean, name, brand, category, image_url
      FROM products WHERE active ORDER BY brand, name
    `);
    const { rows: offers } = await pool.query(`
      SELECT p.ean, s.slug AS store_slug, lp.price, lp.in_stock, lp.url, lp.verified, lp.source
        FROM latest_prices lp
        JOIN products p ON p.id = lp.product_id
        JOIN stores s   ON s.id = lp.store_id
       WHERE p.active = TRUE AND s.active = TRUE
    `);
    // Agrupar offers por store_slug → formato { store_slug, items[] }
    const byStore = new Map(stores.map(s => [s.slug, []]));
    for (const o of offers) {
      if (!byStore.has(o.store_slug)) continue;
      byStore.get(o.store_slug).push({
        ean: o.ean,
        price: Number(o.price),
        in_stock: !!o.in_stock,
        url: o.url,
        verified: o.verified === true,
        source: o.source || (o.verified ? 'scraped' : 'estimated'),
      });
    }
    const store_products = [...byStore.entries()].map(([store_slug, items]) => ({ store_slug, items }));
    return { stores, products, store_products };
  },
};

// -----------------------------------------------------------
// Repositório Seed (fallback dev)
// -----------------------------------------------------------
const repoSeed = {
  listProducts({ category, brand, q, page, limit }) {
    const seed = loadSeed();
    let items = seed.products.slice();
    if (category) items = items.filter((p) => p.category === category);
    if (brand)    items = items.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(needle) || p.brand.toLowerCase().includes(needle));
    }
    items = items.map((p) => {
      const offers = collectOffersForEan(seed, p.ean).filter((o) => o.in_stock);
      const prices = offers.map((o) => Number(o.price)).filter((n) => !isNaN(n));
      return {
        ean: p.ean, name: p.name, brand: p.brand, category: p.category,
        image_url: p.image_url || null,
        min_price: prices.length ? Math.min(...prices) : null,
        stores_in_stock: prices.length,
      };
    });
    const offset = (page - 1) * limit;
    return items.slice(offset, offset + limit);
  },

  getProduct(ean) {
    const seed = loadSeed();
    const p = seed.products.find((x) => x.ean === ean);
    if (!p) return null;
    const offers = collectOffersForEan(seed, ean);
    const prices = offers.map((o) => {
      const s = seed.stores.find((s) => s.slug === o.store_slug) || {};
      return {
        store_slug: o.store_slug,
        store_name: s.name || o.store_slug,
        price: Number(o.price),
        in_stock: !!o.in_stock,
        url: o.url || s.base_url || null,
      };
    }).sort((a, b) => a.price - b.price);
    return {
      ean: p.ean, name: p.name, brand: p.brand, category: p.category,
      image_url: p.image_url || null,
      prices,
    };
  },

  productHistory(ean) {
    const p = this.getProduct(ean);
    if (!p) return [];
    return p.prices.map((pr) => ({ ...pr, scraped_at: new Date().toISOString() }));
  },

  listCategories() {
    return [
      { slug: 'perfume' }, { slug: 'skincare' }, { slug: 'makeup' },
      { slug: 'hair' }, { slug: 'body' },
    ];
  },

  listStores() {
    const stores = loadSeed().stores || [];
    return stores.map((s) => ({
      slug: s.slug, name: s.name, base_url: s.base_url,
      tier: 1, tipo: 'especializada',
      free_shipping_threshold: s.free_shipping_threshold || 30,
    }));
  },

  fullCatalog() {
    const seed = loadSeed();
    const stores = (seed.stores || []).map(s => ({
      slug: s.slug, name: s.name, base_url: s.base_url, logo_url: s.logo_url || null,
      free_shipping_threshold: Number(s.free_shipping_threshold || 30),
      shipping_zones: s.shipping_zones || {},
    }));
    const products = (seed.products || []).map(p => ({
      ean: p.ean, name: p.name, brand: p.brand, category: p.category,
      image_url: p.image_url || null,
    }));
    const store_products = (seed.store_products || []).map(sp => ({
      store_slug: sp.store_slug,
      items: (sp.items || []).map(it => ({
        ean: it.ean, price: Number(it.price), in_stock: !!it.in_stock, url: it.url,
        verified: it.verified === true,
        source: it.source || (it.verified ? 'scraped' : 'estimated'),
      })),
    }));
    return { stores, products, store_products };
  },
};

function collectOffersForEan(seed, ean) {
  // suporta dois formatos seed: 'offers' (legacy) ou 'store_products' (current)
  if (Array.isArray(seed.offers) && seed.offers.length) {
    return seed.offers.filter((o) => o.ean === ean);
  }
  const out = [];
  for (const sp of seed.store_products || []) {
    for (const it of sp.items || []) {
      if (it.ean === ean) out.push({ ...it, store_slug: sp.store_slug });
    }
  }
  return out;
}

const repo = () => (mode === 'bd' ? repoDb : repoSeed);

// -----------------------------------------------------------
// HTTP server (sem framework)
// -----------------------------------------------------------
function sendJSON(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}
const notFound = (res) => sendJSON(res, 404, { error: 'not_found' });
const badRequest = (res, msg) => sendJSON(res, 400, { error: 'bad_request', detail: msg });
const internal = (res, err) => { console.error('[api]', err); sendJSON(res, 500, { error: 'internal', detail: err.message }); };

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }
  if (req.method !== 'GET') return sendJSON(res, 405, { error: 'method_not_allowed' });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = url;
  const r = repo();

  try {
    if (pathname === '/api/health') {
      return sendJSON(res, 200, { ok: true, mode, time: new Date().toISOString() });
    }
    if (pathname === '/api/catalog') {
      const data = await r.fullCatalog();
      return sendJSON(res, 200, data);
    }
    if (pathname === '/api/products') {
      const page  = Math.max(1, parseInt(searchParams.get('page')  || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
      const filters = {
        category: searchParams.get('category') || searchParams.get('categoria'),
        brand:    searchParams.get('brand')    || searchParams.get('marca'),
        q:        searchParams.get('q'),
        page, limit,
      };
      const data = await r.listProducts(filters);
      return sendJSON(res, 200, { mode, page, limit, count: data.length, items: data });
    }
    const matchProduct = pathname.match(/^\/api\/products\/([^/]+)(\/prices|\/precos)?$/);
    if (matchProduct) {
      const ean = decodeURIComponent(matchProduct[1]);
      if (!/^\d{8,14}$/.test(ean)) return badRequest(res, 'ean inválido');
      if (matchProduct[2]) {
        const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30', 10)));
        const data = await r.productHistory(ean, days);
        return sendJSON(res, 200, { ean, days, count: data.length, items: data });
      }
      const prod = await r.getProduct(ean);
      if (!prod) return notFound(res);
      return sendJSON(res, 200, prod);
    }
    if (pathname === '/api/categories' || pathname === '/api/categorias') {
      return sendJSON(res, 200, { items: await r.listCategories() });
    }
    if (pathname === '/api/stores' || pathname === '/api/lojas') {
      return sendJSON(res, 200, { items: await r.listStores() });
    }
    return notFound(res);
  } catch (err) {
    return internal(res, err);
  }
}

function createApp() { return http.createServer(handle); }

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[api] SmartCartCosmetics em http://localhost:${PORT} (modo ${mode})`);
    console.log(`[api] endpoints: /api/health /api/products /api/products/:ean/prices /api/categories /api/stores /api/catalog`);
  });
}

module.exports = { createApp, handle, mode };
