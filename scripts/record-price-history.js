#!/usr/bin/env node
/**
 * CosMath — Gravador de HISTÓRICO DE PREÇOS (a fundação da plataforma dinâmica)
 * ============================================================
 *
 * Grava, 1×/dia, o melhor preço vivo de cada produto. Isto alimenta:
 *   • gráficos/sparklines de preço (30/90 dias) nas fichas;
 *   • selo "mínimo dos últimos 30 dias" (= regra Omnibus UE p/ descontos);
 *   • conselho de compra dinâmico: "compra agora" (preço ≤ p10 dos últimos 90d)
 *     vs "espera" (acima da mediana + histórico mostra descidas frequentes);
 *   • alertas de descida (quando houver backend de email).
 *
 * FORMATO (data/price-history.json) — compacto, append-só-quando-muda:
 *   {
 *     v: 1,
 *     stores: ["atida", "druni", ...],          // índice → slug (append-only)
 *     series: {
 *       "<ean>": [[day, cents, storeIdx], ...]  // day = dias desde epoch UTC
 *     }
 *   }
 * Regras de escrita:
 *   • 1ª observação de um produto → grava sempre (baseline).
 *   • Depois: só grava quando o PREÇO muda (tick data). Re-corridas no mesmo
 *     dia substituem a entrada do dia (idempotente).
 *   • ~5-10% dos preços mudam por dia → ficheiro cresce devagar.
 *
 * MELHOR PREÇO = mínimo absoluto entre ofertas/variantes EM STOCK, FRESCAS
 * (verified_at ≤72h — exclui podres/fantasmas na prática) e fora da blocklist
 * — consistente com o "desde X€" do site (decisão de marketing do user).
 *
 * Uso:
 *   node scripts/record-price-history.js            # grava o dia de hoje
 *   node scripts/record-price-history.js --dry-run  # só mostra o que faria
 */

const fs = require('fs');
const path = require('path');
const { isBlockedOffer } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const HISTORY_FILE = path.join(ROOT, 'data', 'price-history.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY_RUN = !!args['dry-run'];

const FRESH_MS = 72 * 3600e3;   // oferta conta se verificada nas últimas 72h

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));
  let hist;
  try { hist = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); }
  catch { hist = { v: 1, stores: [], series: {} }; }
  if (!hist.series || !Array.isArray(hist.stores)) { console.error('✗ price-history.json corrompido — abortar (não sobrescrevo).'); process.exit(1); }

  const storeIdx = new Map(hist.stores.map((s, i) => [s, i]));
  function idxOf(slug) {
    if (!storeIdx.has(slug)) { storeIdx.set(slug, hist.stores.length); hist.stores.push(slug); }
    return storeIdx.get(slug);
  }

  const now = Date.now();
  const day = Math.floor(now / 86400000);

  // melhor preço vivo por ean
  const best = {};   // ean -> {cents, slug}
  for (const g of seed.store_products) {
    for (const it of g.items) {
      if (!it.ean) continue;
      if (isBlockedOffer(g.store_slug, it.ean)) continue;
      const fresh = it.verified_at && (now - new Date(it.verified_at).getTime()) <= FRESH_MS;
      if (!fresh) continue;
      const candidates = [];
      if (it.in_stock !== false && it.price > 0) candidates.push(it.price);
      for (const v of (it.variants || [])) if (v.in_stock !== false && v.price > 0) candidates.push(v.price);
      if (!candidates.length) continue;
      const p = Math.min(...candidates);
      const cents = Math.round(p * 100);
      if (!best[it.ean] || cents < best[it.ean].cents) best[it.ean] = { cents, slug: g.store_slug };
    }
  }

  let baselines = 0, changes = 0, sameDayUpdates = 0, unchanged = 0;
  for (const [ean, b] of Object.entries(best)) {
    const s = hist.series[ean] || (hist.series[ean] = []);
    const last = s[s.length - 1];
    if (!last) { s.push([day, b.cents, idxOf(b.slug)]); baselines++; continue; }
    if (last[0] === day) {
      // re-corrida no mesmo dia: substitui (idempotente); só conta se mudou
      if (last[1] !== b.cents) { last[1] = b.cents; last[2] = idxOf(b.slug); sameDayUpdates++; }
      else unchanged++;
      continue;
    }
    if (last[1] !== b.cents) { s.push([day, b.cents, idxOf(b.slug)]); changes++; }
    else unchanged++;
  }

  const nSeries = Object.keys(hist.series).length;
  console.log('══════ record-price-history ══════');
  console.log(`  dia UTC: ${day} (${new Date(day * 86400000).toISOString().slice(0, 10)})`);
  console.log(`  produtos com preço vivo hoje: ${Object.keys(best).length}`);
  console.log(`  baselines novas: ${baselines} · mudanças de preço: ${changes} · updates mesmo-dia: ${sameDayUpdates} · sem mudança: ${unchanged}`);
  console.log(`  séries totais: ${nSeries}`);

  if (Object.keys(best).length === 0) { console.error('✗ 0 preços vivos (seed vazio/corrompido?) — NÃO escrevo.'); process.exit(1); }
  if (DRY_RUN) { console.log('\n🧪 --dry-run: nada escrito.'); return; }

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(hist), 'utf8');
  console.log(`\n✓ ${HISTORY_FILE.replace(ROOT, '.')} (${(fs.statSync(HISTORY_FILE).size / 1024).toFixed(0)} KB)`);
})();
