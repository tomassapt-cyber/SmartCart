#!/usr/bin/env node
/**
 * CosMath — AGREGAÇÃO das pesquisas REAIS do site → hero "Mais procurados"
 * ============================================================================
 * Lê public.search_events (tracking anónimo: termo + ean + instante, ver
 * database/migrations/003_search_events.sql) e, SE houver volume suficiente,
 * reescreve data/popular-searches.json com os produtos mais abertos a partir
 * de pesquisa — passando à frente da semente do Google Suggest.
 *
 * Enquanto o site não tiver tráfego, sai sem escrever (código 0) e a semente
 * do build-popular-searches.js continua a mandar. É o "interruptor automático"
 * entre a popularidade emprestada da internet e a popularidade real do site.
 *
 * Precisa de SUPABASE_URL + SUPABASE_SERVICE_KEY (secrets do GitHub). Sem eles,
 * sai em silêncio — nunca falha o workflow.
 *
 * Uso: node scripts/aggregate-search-popularity.js [--dry-run] [--days=30]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const BLOCKLIST = path.join(ROOT, 'data', 'offer-ean-blocklist.json');
const OUT = path.join(ROOT, 'data', 'popular-searches.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY = !!args['dry-run'];
const DAYS = args.days ? parseInt(args.days, 10) : 30;

// limiares: só troca a semente quando os dados reais já são significativos
const MIN_EVENTS = 60;      // eventos totais na janela
const MIN_PRODUCTS = 5;     // produtos distintos com opens suficientes
const MIN_PER_PRODUCT = 3;  // opens mínimos para um produto contar
const OUT_N = 8;

const URL = process.env.SUPABASE_URL || '';
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function bestOffer(seed, ean, blocked) {
  let best = null;
  for (const g of seed.store_products) {
    if (blocked.has(g.store_slug + '|' + ean)) continue;
    for (const it of g.items) {
      if (it.ean !== ean || it.in_stock === false) continue;
      const cands = [];
      if (it.price > 0) cands.push({ price: it.price, url: it.url });
      for (const v of (it.variants || [])) if (v.price > 0 && v.in_stock !== false) cands.push({ price: v.price, url: v.url || it.url });
      for (const c of cands) if (!best || c.price < best.price) {
        const st = seed.stores.find(s => s.slug === g.store_slug);
        best = { price: c.price, store_slug: g.store_slug, store_name: st ? st.name : g.store_slug, url: c.url };
      }
    }
  }
  return best;
}

async function fetchEvents() {
  const since = new Date(Date.now() - DAYS * 864e5).toISOString();
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; from < 50000; from += PAGE) {
    const u = `${URL.replace(/\/+$/, '')}/rest/v1/search_events?select=ean,term&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc`;
    const r = await fetch(u, {
      headers: {
        apikey: KEY, Authorization: 'Bearer ' + KEY,
        Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items',
      },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 120));
    const batch = await r.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

async function main() {
  if (!URL || !KEY) { console.log('ℹ Sem SUPABASE_URL/SERVICE_KEY — agregação saltada (a semente do Suggest mantém-se).'); return; }
  let events;
  try { events = await fetchEvents(); }
  catch (e) { console.log('ℹ Não consegui ler search_events (' + e.message + ') — semente mantém-se.'); return; }

  console.log(`📊 ${events.length} eventos nos últimos ${DAYS} dias`);
  if (events.length < MIN_EVENTS) { console.log(`ℹ < ${MIN_EVENTS} eventos — ainda sem tráfego suficiente; semente do Suggest mantém-se.`); return; }

  const byEan = new Map();
  for (const e of events) {
    if (!e || !e.ean) continue;
    const cur = byEan.get(e.ean) || { n: 0, terms: new Map() };
    cur.n++;
    if (e.term) cur.terms.set(e.term, (cur.terms.get(e.term) || 0) + 1);
    byEan.set(e.ean, cur);
  }
  const ranked = [...byEan.entries()].filter(([, v]) => v.n >= MIN_PER_PRODUCT).sort((a, b) => b[1].n - a[1].n);
  if (ranked.length < MIN_PRODUCTS) { console.log(`ℹ só ${ranked.length} produtos com >=${MIN_PER_PRODUCT} aberturas — semente mantém-se.`); return; }

  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const blocked = new Set((() => { try { return (JSON.parse(fs.readFileSync(BLOCKLIST, 'utf8')).blocked || []).map(b => b.store_slug + '|' + b.ean); } catch { return []; } })());
  const out = [];
  for (const [ean, info] of ranked) {
    if (out.length >= OUT_N) break;
    const p = seed.products.find(x => x.ean === ean);
    if (!p || !p.image_url) continue;
    const off = bestOffer(seed, ean, blocked);
    if (!off) continue;
    const topTerm = [...info.terms.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push({
      ean, name: String(p.name || '').replace(/\s*\d+(?:[.,]\d+)?\s*(?:ml|gr|g|kg|l)\b/gi, '').trim(),
      brand: p.brand, image_url: p.image_url,
      best_price: off.price, best_store: off.store_name, best_store_slug: off.store_slug, best_url: off.url,
      search_term: topTerm ? topTerm[0] : null, pop_score: info.n,
    });
  }
  if (out.length < MIN_PRODUCTS) { console.log(`ℹ só ${out.length} mapeáveis com oferta viva — semente mantém-se.`); return; }

  console.log('\n=== TOP mais procurados (pesquisas REAIS do site) ===');
  out.forEach((o, i) => console.log(`  ${i + 1}. [${o.pop_score} aberturas] ${o.brand} · ${o.name.slice(0, 38)}${o.search_term ? '  («' + o.search_term + '»)' : ''}`));
  if (DRY) { console.log('\n🧪 --dry-run: nada escrito.'); return; }
  fs.writeFileSync(OUT, JSON.stringify({ generated_at: new Date().toISOString(), source: 'site-search', window_days: DAYS, products: out }, null, 2));
  console.log(`\n✓ ${OUT.replace(ROOT, '.')} substituído por dados REAIS do site (${out.length} produtos).`);
}

if (require.main === module) {
  process.on('unhandledRejection', e => console.warn('⚠ unhandledRejection:', e && e.message));
  main().catch(e => { console.error('⚠ agregação falhou (não-fatal):', e.message); process.exit(0); });
}
