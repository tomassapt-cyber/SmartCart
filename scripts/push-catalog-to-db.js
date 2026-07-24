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
        if (r.status >= 400) {
          const body = (await r.text()).slice(0, 180);
          // 4xx = determinístico (dado mau) → falhar JÁ, retry só ajuda em 5xx/rede
          if (r.status < 500) throw Object.assign(new Error(`HTTP ${r.status}: ${body}`), { fatal: true });
          throw new Error(`HTTP ${r.status}: ${body}`);
        }
        ok = true;
      } catch (e) {
        if (e.fatal || att === 3) throw new Error(`${table} lote ${i / BATCH}: ${e.message}`);
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
  // url/image só http(s) — a BD nunca guarda javascript:/data: vindos do
  // scraping (defesa em profundidade; app.html já valida no href) (auditoria).
  const safeUrl = u => { const x = String(u || ''); return /^https?:\/\//i.test(x) ? x : null; };
  const products = (seed.products || []).filter(p => p.ean && p.name).map(p => {
    const base = {
      ean: p.ean, name: p.name, brand: p.brand || null, category: p.category || null,
      image_url: safeUrl(p.image_url), updated_at: runTs,
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
  const storeSet = new Set(stores.map(s => s.slug));   // FK offers.store_slug (auditoria)

  const offers = [];
  let semLoja = 0;
  for (const g of seed.store_products || []) {
    if (!storeSet.has(g.store_slug)) { semLoja += (g.items || []).length; continue; }   // FK: loja tem de existir em stores
    for (const it of g.items || []) {
      if (!it.ean || !eanSet.has(it.ean) || !(it.price > 0)) continue;
      if (blocked.has(g.store_slug + '|' + it.ean)) continue;
      offers.push({
        store_slug: g.store_slug, ean: it.ean,
        price: it.price, previous_price: it.previous_price ?? null,
        discount_pct: it.discount_pct != null ? Math.round(it.discount_pct) : null,
        in_stock: it.in_stock !== false, url: safeUrl(it.url),
        verified_at: it.verified_at || null, synced_at: runTs,
      });
    }
  }

  // variantes de volume: melhor preço por (loja, ean, volume) — migration 006;
  // deteção da tabela como as colunas de popularidade (degrada sem ela).
  let hasVariants = false;
  if (URL_ && KEY) {
    try {
      const r = await fetch(`${URL_}/rest/v1/offer_variants?select=ean&limit=0`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }, signal: AbortSignal.timeout(15000) });
      hasVariants = r.status < 400;
    } catch { /* mantém false */ }
    console.log(`  tabela offer_variants (migration 006): ${hasVariants ? 'presente ✓' : 'ausente — sync sem variantes (aplicar 006)'}`);
  }
  const variants = [];
  if (hasVariants) {
    const offerKey = new Set(offers.map(o => o.store_slug + '|' + o.ean));
    const bestVar = new Map();   // store|ean|ml → melhor
    for (const g of seed.store_products || []) {
      for (const it of g.items || []) {
        if (!it.ean || !eanSet.has(it.ean)) continue;
        if (!offerKey.has(g.store_slug + '|' + it.ean)) continue;   // FK: só variantes de ofertas presentes
        for (const v of (it.variants || [])) {
          const ml = Math.round(Number(v.volume_ml) || 0);
          if (!(ml > 0) || !(v.price > 0)) continue;
          const k = g.store_slug + '|' + it.ean + '|' + ml;
          const cur = bestVar.get(k);
          if (!cur || v.price < cur.price) bestVar.set(k, {
            store_slug: g.store_slug, ean: it.ean, volume_ml: ml, price: v.price,
            url: safeUrl(v.url) || safeUrl(it.url), in_stock: v.in_stock !== false, synced_at: runTs,
          });
        }
      }
    }
    variants.push(...bestVar.values());
  }

  // DEDUPE por PK antes de enviar (auditoria 2026-07-24): uma PK repetida no
  // MESMO lote faz o PostgREST abortar ("cannot affect row a second time").
  const dedupe = (rows, keyFn, pick) => {
    const m = new Map();
    for (const r of rows) { const k = keyFn(r); const cur = m.get(k); if (!cur || (pick && pick(r, cur))) m.set(k, r); }
    return [...m.values()];
  };
  const products2 = dedupe(products, p => p.ean);
  const stores2 = dedupe(stores, s => s.slug);
  const offers2 = dedupe(offers, o => o.store_slug + '|' + o.ean, (r, c) => r.price < c.price);
  const variants2 = dedupe(variants, v => v.store_slug + '|' + v.ean + '|' + v.volume_ml, (r, c) => r.price < c.price);
  const dupN = (products.length - products2.length) + (offers.length - offers2.length) + (variants.length - variants2.length);
  if (dupN) console.log(`  dedupe: ${dupN} PKs repetidas removidas`);

  if (semLoja) console.log(`  ⚠ ${semLoja} ofertas de lojas ausentes de seed.stores — ignoradas (FK)`);
  console.log(`📦 payloads: ${stores2.length} lojas · ${products2.length} produtos · ${offers2.length} ofertas · ${variants2.length} variantes (blocklist aplicada)`);
  if (DRY) { console.log('🧪 --dry-run: nada enviado.'); return; }
  if (!URL_ || !KEY) { console.log('ℹ Sem SUPABASE_URL/SERVICE_KEY — sync saltado (Fase 1 ainda não ativada).'); return; }

  // GUARDRAIL anti-apagão (auditoria): se o seed vier truncado (scraper de uma
  // loja grande falhou → vaga parcial), a semântica-espelho apagaria milhares
  // de ofertas vivas da BD pública. Se o payload tem < 80% do que a BD já tem,
  // fazemos os UPSERTS mas SALTAMOS as limpezas (ofertas stale sobrevivem 1
  // ciclo — muito melhor que apagar uma loja inteira).
  let skipPurge = false;
  try {
    const rc = await fetch(`${URL_}/rest/v1/offers?select=count`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact', Range: '0-0' }, signal: AbortSignal.timeout(20000) });
    const countBD = parseInt((rc.headers.get('content-range') || '/0').split('/')[1], 10) || 0;
    if (countBD > 1000 && offers2.length < 0.8 * countBD) {
      skipPurge = true;
      console.log(`  ⛔ GUARDRAIL: payload ${offers2.length} < 80% da BD (${countBD}) — seed truncado? UPSERTS sim, limpezas SALTADAS.`);
    }
  } catch { /* sem count → segue normal */ }

  await upsert('stores', stores2, 'slug');
  await upsert('products', products2, 'ean');
  await upsert('offers', offers2, 'store_slug,ean');
  if (hasVariants && variants2.length) await upsert('offer_variants', variants2, 'store_slug,ean,volume_ml');

  // apagar o que saiu do seed (não tocado neste run). Ordem por FK: variantes →
  // ofertas → produtos. Status VERIFICADO (auditoria 2026-07-24: uma limpeza
  // falhada terminava com "✓ completo"); um DELETE que falha aborta o sync.
  async function purge(table) {
    const r = await fetch(`${URL_}/rest/v1/${table}?synced_at=lt.${encodeURIComponent(runTs)}`, {
      method: 'DELETE', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'return=minimal' }, signal: AbortSignal.timeout(60000),
    });
    if (r.status >= 400) throw new Error(`limpeza ${table}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
    console.log(`  limpeza ${table} saídas: HTTP ${r.status} ✓`);
  }
  if (skipPurge) {
    console.log('  ⛔ limpezas saltadas pelo guardrail (ofertas stale sobrevivem 1 ciclo).');
  } else {
    if (hasVariants) await purge('offer_variants');
    await purge('offers');
    // produtos-fantasma: um produto que saiu do seed nunca era apagado e ficava
    // no topo do catálogo com n_stores/min_price congelados (auditoria). products
    // usa updated_at (é o carimbo do upsert deste run).
    const r = await fetch(`${URL_}/rest/v1/products?updated_at=lt.${encodeURIComponent(runTs)}`, {
      method: 'DELETE', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'return=minimal' }, signal: AbortSignal.timeout(60000),
    });
    if (r.status >= 400) throw new Error(`limpeza products: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
    console.log(`  limpeza products fantasma: HTTP ${r.status} ✓`);
  }

  // verificação: contagens na BD
  for (const t of ['stores', 'products', 'offers']) {
    const r = await fetch(`${URL_}/rest/v1/${t}?select=count`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact', Range: '0-0' } });
    console.log(`  BD ${t}: ${r.headers.get('content-range')}`);
  }
  console.log('✓ sync completo.');
})().catch(e => { console.error('✗ sync falhou:', e.message); process.exit(1); });
