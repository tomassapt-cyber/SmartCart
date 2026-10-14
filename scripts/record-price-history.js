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
 * MELHOR PREÇO = mínimo absoluto entre ofertas/variantes EM STOCK, fora da
 * blocklist e PUBLICADAS — a mesma regra de ofertas podres que o site e a BD
 * aplicam (dropRottenOffers, scripts/lib/catalog-visibility.js). Assim a linha
 * do gráfico é o "Melhor preço" que a ficha mostrou nesse dia. (Até 09/10 era
 * "verificada há ≤72h": a ficha mostrava ofertas de 3–14 dias — notino e lojas
 * só-PC — que a linha ignorava; 90,7% de coincidência contra 99,1% agora.)
 *
 * Uso:
 *   node scripts/record-price-history.js            # grava o dia de hoje
 *   node scripts/record-price-history.js --dry-run  # só mostra o que faria
 *   node scripts/record-price-history.js --as-of=2026-09-25T23:40:00Z
 *       # recuperar um dia perdido: corre como se fosse aquele momento, sobre o
 *       # seed desse momento (posto em data/seed-bundle.json por quem chama).
 *       # Só aceita dias a partir do último gravado — as séries são por ordem.
 */

const fs = require('fs');
const path = require('path');
const { isBlockedOffer } = require('./lib/store-item-merge');
const { dropRottenOffers } = require('./lib/catalog-visibility');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const HISTORY_FILE = path.join(ROOT, 'data', 'price-history.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY_RUN = !!args['dry-run'];
const AS_OF = args['as-of'] ? new Date(args['as-of']) : null;
if (AS_OF && isNaN(AS_OF)) { console.error(`✗ --as-of inválido: ${args['as-of']}`); process.exit(1); }

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

  const now = AS_OF ? AS_OF.getTime() : Date.now();
  const day = Math.floor(now / 86400000);
  if (AS_OF) {
    let lastDay = -1;
    for (const s of [...Object.values(hist.series), ...Object.values(hist.vseries || {})]) if (s.length) lastDay = Math.max(lastDay, s[s.length - 1][0]);
    if (day < lastDay) { console.error(`✗ --as-of ${args['as-of']} é anterior ao último dia gravado (${new Date(lastDay * 86400000).toISOString().slice(0, 10)}) — as séries ficariam fora de ordem.`); process.exit(1); }
  }

  // melhor preço vivo por ean (mínimo absoluto — série legada/"desde")
  // + melhor preço POR VOLUME (vseries — cada volume tem o SEU mínimo/média/hoje;
  //   sem isto o gráfico mostrava o preço do volume mais pequeno em fichas multi-volume)
  const best = {};      // ean -> {cents, slug}
  const bestVol = {};   // ean -> { ml -> {cents, slug} }  (só de variantes com volume_ml)
  // o mesmo GTIN com/sem zeros é UM produto, como na página e na BD — senão a
  // série da ficha perdia as lojas que publicam a outra grafia (2026-10-14)
  require('./dedup-ean-variants').mergeEanVariants(seed, ROOT);
  dropRottenOffers(seed, now);   // em memória: fica só o que o site publica
  for (const g of seed.store_products) {
    for (const it of g.items) {
      if (!it.ean) continue;
      if (isBlockedOffer(g.store_slug, it.ean)) continue;
      const candidates = [];
      if (it.in_stock !== false && it.price > 0) candidates.push(it.price);
      for (const v of (it.variants || [])) {
        if (v.in_stock === false || !(v.price > 0)) continue;
        candidates.push(v.price);
        const ml = Math.round(Number(v.volume_ml) || 0);
        if (ml > 0) {
          const c = Math.round(v.price * 100);
          const bucket = bestVol[it.ean] || (bestVol[it.ean] = {});
          if (!bucket[ml] || c < bucket[ml].cents) bucket[ml] = { cents: c, slug: g.store_slug };
        }
      }
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

  // vseries: só p/ produtos com ≥2 volumes distintos hoje (1 volume = série legada)
  if (!hist.vseries) hist.vseries = {};
  let vBaselines = 0, vChanges = 0, vSame = 0;
  for (const [ean, bucket] of Object.entries(bestVol)) {
    const vols = Object.keys(bucket);
    if (vols.length < 2) continue;
    for (const ml of vols) {
      const key = ean + '|' + ml;
      const b = bucket[ml];
      const s = hist.vseries[key] || (hist.vseries[key] = []);
      const last = s[s.length - 1];
      if (!last) { s.push([day, b.cents, idxOf(b.slug)]); vBaselines++; continue; }
      if (last[0] === day) {
        if (last[1] !== b.cents) { last[1] = b.cents; last[2] = idxOf(b.slug); vChanges++; }
        continue;
      }
      if (last[1] !== b.cents) { s.push([day, b.cents, idxOf(b.slug)]); vChanges++; }
      else vSame++;
    }
  }

  const nSeries = Object.keys(hist.series).length;
  console.log('══════ record-price-history ══════');
  console.log(`  dia UTC: ${day} (${new Date(day * 86400000).toISOString().slice(0, 10)})`);
  console.log(`  produtos com preço vivo hoje: ${Object.keys(best).length}`);
  console.log(`  baselines novas: ${baselines} · mudanças de preço: ${changes} · updates mesmo-dia: ${sameDayUpdates} · sem mudança: ${unchanged}`);
  console.log(`  séries totais: ${nSeries}`);
  console.log(`  vseries (por volume): ${Object.keys(hist.vseries).length} · baselines: ${vBaselines} · mudanças: ${vChanges} · sem mudança: ${vSame}`);

  if (Object.keys(best).length === 0) { console.error('✗ 0 preços vivos (seed vazio/corrompido?) — NÃO escrevo.'); process.exit(1); }
  if (DRY_RUN) { console.log('\n🧪 --dry-run: nada escrito.'); return; }

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(hist), 'utf8');
  console.log(`\n✓ ${HISTORY_FILE.replace(ROOT, '.')} (${(fs.statSync(HISTORY_FILE).size / 1024).toFixed(0)} KB)`);
})();
