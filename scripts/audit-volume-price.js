#!/usr/bin/env node
/**
 * GirlMath — Audit volumes e preços nas ofertas scraped
 * ============================================================
 *
 * Detecta e (em --apply) corrige 4 tipos de problema:
 *
 *  A) Volume implausível para a categoria
 *     - serum/creme/sérum solar:  3 < ml ≤ 500
 *     - body/lotion:             10 < ml ≤ 2000
 *     - shampoo/condicionador:   30 < ml ≤ 2000
 *     - perfume (edp/edt):        3 < ml ≤ 250
 *     - máscara capilar:          5 < ml ≤ 1500
 *     Fora destes intervalos = volume falso (capturado por regex de "Pack 30 unid",
 *     códigos como "/L" interpretados como litros, etc.) → variant removida.
 *
 *  B) Price/ml outlier intra-store-product
 *     Dentro do mesmo item (com múltiplas variantes), se uma variant tem
 *     price/ml fora de [0.3×, 3×] da mediana das outras → removida.
 *
 *  C) Variant duplicada (mesmo volume_ml, preço diferente)
 *     Mantém a mais barata in_stock, ou a mais recente.
 *
 *  D) Inconsistência cross-store
 *     Quando o mesmo EAN aparece em ≥3 lojas com mesma variante volume,
 *     se uma loja tem price/ml > 5× a mediana das outras → flag suspeito.
 *     NÃO remove automaticamente (pode ser luxury / impressionado pricing
 *     real); só reporta para revisão humana.
 *
 * Uso:
 *   node scripts/audit-volume-price.js                # dry-run report
 *   node scripts/audit-volume-price.js --apply        # aplicar fixes A, B, C
 *   node scripts/audit-volume-price.js --apply --aggressive  # também regenera item.price/url
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const APPLY = !!args.apply;
const AGGRESSIVE = !!args.aggressive;

// Categoria → intervalo (min, max) plausível em ml
const VOLUME_RANGE = {
  skincare: [3, 500],
  haircare: [30, 2000],
  body:     [10, 2000],
  perfume:  [3, 250],
  makeup:   [1, 500],
};

function categoryRange(cat) {
  return VOLUME_RANGE[cat] || [1, 2000];
}

function median(arr) {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));
  const productByEan = {};
  for (const p of seed.products) productByEan[p.ean] = p;

  console.log('🔍 A auditar volumes e preços…\n');
  console.log(`Categorias e intervalos plausíveis:`);
  Object.entries(VOLUME_RANGE).forEach(([c, [lo, hi]]) => {
    console.log(`  ${c.padEnd(10)} ${lo}–${hi} ml`);
  });
  console.log('');

  const issues = {
    implausibleVolume: [],
    intraItemOutlier: [],
    duplicateVariant: [],
    crossStoreSuspect: [],
  };
  let variantsRemoved = 0;
  let itemsTouched = 0;
  let itemsWithEmptyVariants = 0;

  // ── Passo 1: por item, fix A, B, C ──
  for (const sp of seed.store_products) {
    for (const it of sp.items) {
      if (!Array.isArray(it.variants) || it.variants.length === 0) continue;

      const product = productByEan[it.ean];
      const cat = product?.category;
      const [vMin, vMax] = categoryRange(cat);

      const before = it.variants.length;
      const seen = new Map(); // volume_ml → variant escolhido

      // A) volume implausível → flag + remove
      let cleaned = it.variants.filter(v => {
        const ok = v.volume_ml > vMin && v.volume_ml <= vMax;
        if (!ok) {
          issues.implausibleVolume.push({
            store: sp.store_slug, ean: it.ean,
            product: product?.name || it.ean,
            volume_ml: v.volume_ml, category: cat,
            range: `${vMin}–${vMax}`,
          });
        }
        return ok;
      });

      // B) outlier intra-item por price/ml (só com ≥ 3 variantes)
      if (cleaned.length >= 3) {
        const ppms = cleaned.map(v => v.price / v.volume_ml);
        const med = median(ppms);
        if (med > 0) {
          cleaned = cleaned.filter(v => {
            const ppm = v.price / v.volume_ml;
            const ratio = ppm / med;
            const outlier = ratio < 0.33 || ratio > 3;
            if (outlier) {
              issues.intraItemOutlier.push({
                store: sp.store_slug, ean: it.ean,
                product: product?.name || it.ean,
                volume_ml: v.volume_ml, price: v.price,
                ppm: ppm.toFixed(3), median_ppm: med.toFixed(3),
                ratio: ratio.toFixed(2),
              });
            }
            return !outlier;
          });
        }
      }

      // C) duplicados (mesmo volume_ml) — manter o mais barato in_stock
      cleaned.sort((a, b) => {
        if (a.volume_ml !== b.volume_ml) return a.volume_ml - b.volume_ml;
        // mesmo volume: in_stock primeiro, depois mais barato
        if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;
        return a.price - b.price;
      });
      const deduped = [];
      for (const v of cleaned) {
        if (seen.has(v.volume_ml)) {
          issues.duplicateVariant.push({
            store: sp.store_slug, ean: it.ean,
            product: product?.name || it.ean,
            volume_ml: v.volume_ml,
            kept: seen.get(v.volume_ml).price,
            removed: v.price,
          });
          continue;
        }
        seen.set(v.volume_ml, v);
        deduped.push(v);
      }
      cleaned = deduped;

      const removed = before - cleaned.length;
      if (removed > 0) {
        variantsRemoved += removed;
        itemsTouched++;
        it.variants = cleaned.length > 0 ? cleaned : undefined;

        // AGGRESSIVE: regenerar headline price e url se variantes mudaram
        if (AGGRESSIVE && cleaned.length > 0) {
          const inStock = cleaned.filter(v => v.in_stock);
          const pool = inStock.length ? inStock : cleaned;
          const cheapest = pool.reduce((a, b) => (b.price < a.price ? b : a));
          it.price = Number(cheapest.price.toFixed(2));
          if (cheapest.url) it.url = cheapest.url;
          if (cheapest.previous_price) {
            it.previous_price = cheapest.previous_price;
            it.discount_pct = Math.round((1 - cheapest.price / cheapest.previous_price) * 100);
          }
        }

        if (!cleaned.length) itemsWithEmptyVariants++;
      }
    }
  }

  // ── Passo 2: D) cross-store outliers (só report) ──
  // Para cada EAN, agrupar ofertas por volume; se a mesma volume aparece em
  // ≥3 lojas e uma tem price/ml > 5× mediana das outras → suspeita.
  const byEan = {};
  for (const sp of seed.store_products) {
    for (const it of sp.items) {
      if (!Array.isArray(it.variants)) continue;
      for (const v of it.variants) {
        if (!byEan[it.ean]) byEan[it.ean] = [];
        byEan[it.ean].push({ store: sp.store_slug, volume_ml: v.volume_ml, price: v.price });
      }
    }
  }
  for (const [ean, offers] of Object.entries(byEan)) {
    // agrupar por volume
    const byVol = {};
    for (const o of offers) {
      if (!byVol[o.volume_ml]) byVol[o.volume_ml] = [];
      byVol[o.volume_ml].push(o);
    }
    for (const [vol, vOffers] of Object.entries(byVol)) {
      if (vOffers.length < 3) continue;
      const prices = vOffers.map(o => o.price);
      const med = median(prices);
      if (med <= 0) continue;
      for (const o of vOffers) {
        const ratio = o.price / med;
        if (ratio > 5) {
          issues.crossStoreSuspect.push({
            ean, store: o.store, volume_ml: Number(vol),
            price: o.price, median_across_stores: med,
            ratio: ratio.toFixed(1),
            product: productByEan[ean]?.name || ean,
          });
        }
      }
    }
  }

  // ── Report ──
  console.log('══════ Problemas detectados ══════');
  console.log(`A) Volumes implausíveis:        ${issues.implausibleVolume.length}`);
  console.log(`B) Outliers price/ml intra-item: ${issues.intraItemOutlier.length}`);
  console.log(`C) Variantes duplicadas:        ${issues.duplicateVariant.length}`);
  console.log(`D) Cross-store suspeitos (só report): ${issues.crossStoreSuspect.length}`);
  console.log('');

  function showSample(arr, label, fmt) {
    if (arr.length === 0) return;
    const n = Math.min(10, arr.length);
    console.log(`── ${label} — primeiras ${n} de ${arr.length}: ──`);
    arr.slice(0, n).forEach(fmt);
    console.log('');
  }

  showSample(issues.implausibleVolume, 'A) Volumes implausíveis', x =>
    console.log(`  ${x.store.padEnd(11)} ${String(x.volume_ml).padStart(6)} ml [${x.category}, esperado ${x.range}] | ${x.product}`)
  );
  showSample(issues.intraItemOutlier, 'B) Outliers price/ml intra-item', x =>
    console.log(`  ${x.store.padEnd(11)} ${x.volume_ml}ml @ ${x.price}€ → ppm=${x.ppm} (×${x.ratio} da mediana ${x.median_ppm}) | ${x.product}`)
  );
  showSample(issues.duplicateVariant, 'C) Variantes duplicadas', x =>
    console.log(`  ${x.store.padEnd(11)} ${x.volume_ml}ml | kept @ ${x.kept}€, removed @ ${x.removed}€ | ${x.product}`)
  );
  showSample(issues.crossStoreSuspect, 'D) Cross-store suspeitos', x =>
    console.log(`  ${x.store.padEnd(11)} ${x.volume_ml}ml @ ${x.price}€ vs mediana €${x.median_across_stores.toFixed(2)} (×${x.ratio}) | ${x.product}`)
  );

  console.log('══════ Impacto previsto ══════');
  console.log(`  Variantes a remover:   ${variantsRemoved}`);
  console.log(`  Items afectados:       ${itemsTouched}`);
  console.log(`  Items que ficam vazios após fix: ${itemsWithEmptyVariants}`);

  if (!APPLY) {
    console.log('\n[DRY-RUN] Re-corre com --apply para aplicar fixes A+B+C.');
    console.log('         (D não é auto-fixed — requer revisão humana)');
    return;
  }

  console.log('\n⚙ A aplicar fixes A+B+C…');
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')}`);

  console.log('\n▶ Re-injectando no demo.html…');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], {
    cwd: ROOT, stdio: 'inherit',
  });
  if (r.status === 0) console.log('\n✅ Audit concluído.');
})();
