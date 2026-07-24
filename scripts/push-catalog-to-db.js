#!/usr/bin/env node
/**
 * CosMath — SYNC do catálogo para a BD (Fase 1 do backend, 2026-07-23)
 * ============================================================================
 * Lê data/seed-bundle.json e faz upsert de stores/products/offers no Supabase
 * via PostgREST (bulk, on_conflict=merge). No fim apaga as ofertas que saíram
 * do seed (synced_at < run). O site NÃO lê daqui ainda — a BD nasce ao lado
 * (dual-write); a Fase 2 muda a leitura.
 *
 * Segurança/robustez:
 *   • precisa de SUPABASE_URL + SUPABASE_SERVICE_KEY (secrets do CI); sem
 *     eles sai em silêncio com código 0 — nunca falha um workflow por isso;
 *   • aplica a blocklist ANTES de enviar (a BD só vê ofertas limpas);
 *   • headline apenas (variantes = Fase 2);
 *   • lotes de 1000 linhas; retry simples; --dry-run valida payloads local.
 *
 * Uso:
 *   node scripts/push-catalog-to-db.js [--dry-run] [--batch=1000]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const BL = path.join(ROOT, 'data', 'offer-ean-blocklist.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY = !!args['dry-run'];
const BATCH = args.batch ? parseInt(args.batch, 10) : 1000;

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function upsert(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    let ok = false;
    for (let att = 1; att <= 3 && !ok; att++) {
      try {
        const r = await fetch(`${URL_}/rest/v1/${table}?on_conflict=${onConflict}`, {
          method: 'POST',
          headers: {
            apikey: KEY, Authorization: 'Bearer ' + KEY,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(chunk),
          signal: AbortSignal.timeout(60000),
        });
        if (r.status >= 400) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 180)}`);
        ok = true;
      } catch (e) {
        if (att === 3) throw new Error(`${table} lote ${i / BATCH}: ${e.message}`);
        await new Promise(s => setTimeout(s, 2000 * att));
      }
    }
    if ((i / BATCH) % 20 === 0) console.log(`  ${table}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log(`  ✓ ${table}: ${rows.length} linhas`);
}

(async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const blocked = new Set((() => { try { return (JSON.parse(fs.readFileSync(BL, 'utf8')).blocked || []).map(b => b.store_slug + '|' + b.ean); } catch { return []; } })());
  const runTs = new Date().toISOString();

  const stores = (seed.stores || []).map(s => ({
    slug: s.slug, name: s.name || s.slug, base_url: s.base_url || null,
    free_shipping_threshold: s.free_shipping_threshold ?? null,
    shipping_mainland: s.shipping_zones?.mainland ?? null,
    shipping_madeira: s.shipping_zones?.madeira ?? null,
    shipping_acores: s.shipping_zones?.acores ?? null,
    pickup_cost: s.pickup_cost ?? null, pickup_note: s.pickup_note ?? null,
    updated_at: runTs,
  }));

  // popularidade por produto (nº lojas com preço em stock + melhor preço) —
  // preenche as colunas da migration 005; se ainda não existirem na BD,
  // degrada graciosamente (ver hasPopCols mais abaixo).
  const pop = {};
  for (const g of seed.store_products || []) {
    for (const it of g.items || []) {
      if (!it.ean || it.in_stock === false || !(it.price > 0)) continue;
      if (blocked.has(g.store_slug + '|' + it.ean)) continue;
      const e = pop[it.ean] || (pop[it.ean] = { stores: new Set(), min: Infinity, minStore: null });
      e.stores.add(g.store_slug);
      if (it.price < e.min) { e.min = it.price; e.minStore = g.store_slug; }
    }
  }
  let hasPopCols = false;
  if (URL_ && KEY) {
    try {
      const r = await fetch(`${URL_}/rest/v1/products?select=n_stores&limit=0`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }, signal: AbortSignal.timeout(15000) });
      hasPopCols = r.status < 400;
    } catch { /* mantém false */ }
    console.log(`  colunas de popularidade (migration 005): ${hasPopCols ? 'presentes ✓' : 'ausentes — sync sem elas (aplicar 005)'}`);
  }
  const products = (seed.products || []).filter(p => p.ean && p.name).map(p => {
    const base = {
      ean: p.ean, name: p.name, brand: p.brand || null, category: p.category || null,
      image_url: p.image_url || null, updated_at: runTs,
    };
    if (hasPopCols) {
      const e = pop[p.ean];
      base.n_stores = e ? e.stores.size : 0;
      base.min_price = e && isFinite(e.min) ? e.min : null;
      base.min_price_store = e ? e.minStore : null;
    }
    return base;
  });
  const eanSet = new Set(products.map(p => p.ean));

  const offers = [];
  for (const g of seed.store_products || []) {
    for (const it of g.items || []) {
      if (!it.ean || !eanSet.has(it.ean) || !(it.price > 0)) continue;
      if (blocked.has(g.store_slug + '|' + it.ean)) continue;
      offers.push({
        store_slug: g.store_slug, ean: it.ean,
        price: it.price, previous_price: it.previous_price ?? null,
        discount_pct: it.discount_pct != null ? Math.round(it.discount_pct) : null,
        in_stock: it.in_stock !== false, url: it.url || null,
        verified_at: it.verified_at || null, synced_at: runTs,
      });
    }
  }

  console.log(`📦 payloads: ${stores.length} lojas · ${products.length} produtos · ${offers.length} ofertas (blocklist aplicada)`);
  if (DRY) { console.log('🧪 --dry-run: nada enviado.'); return; }
  if (!URL_ || !KEY) { console.log('ℹ Sem SUPABASE_URL/SERVICE_KEY — sync saltado (Fase 1 ainda não ativada).'); return; }

  await upsert('stores', stores, 'slug');
  await upsert('products', products, 'ean');
  await upsert('offers', offers, 'store_slug,ean');

  // apagar ofertas que saíram do seed (não tocadas neste run)
  const del = await fetch(`${URL_}/rest/v1/offers?synced_at=lt.${encodeURIComponent(runTs)}`, {
    method: 'DELETE',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'return=minimal' },
    signal: AbortSignal.timeout(60000),
  });
  console.log(`  limpeza de ofertas saídas: HTTP ${del.status}`);

  // verificação: contagens na BD
  for (const t of ['stores', 'products', 'offers']) {
    const r = await fetch(`${URL_}/rest/v1/${t}?select=count`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact', Range: '0-0' } });
    console.log(`  BD ${t}: ${r.headers.get('content-range')}`);
  }
  console.log('✓ sync completo.');
})().catch(e => { console.error('✗ sync falhou:', e.message); process.exit(1); });
