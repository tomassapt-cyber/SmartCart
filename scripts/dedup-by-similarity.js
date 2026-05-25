#!/usr/bin/env node
/**
 * GirlMath — Dedup por similaridade (Jaccard) dentro da mesma marca
 * ============================================================
 *
 * Encontra produtos com a MESMA marca canónica + tokens de nome
 * suficientemente sobrepostos para serem o mesmo produto físico
 * mas com EANs diferentes (sintéticos por scrape diferente).
 *
 * Estratégia conservadora (alta precisão):
 *  1. Agrupar produtos por marca canónica
 *  2. Para cada par, calcular Jaccard de tokens canonical_name
 *  3. Se Jaccard >= THRESHOLD (default 0.90) → candidato a merge
 *  4. Critério para "manter" vs "remover":
 *      - GTIN-real > sintético (sempre)
 *      - Se ambos sintéticos: maior nº de lojas
 *      - Empate: produto mais antigo (menor "novo" risk)
 *  5. Migrar TODAS as ofertas do removido → mantido (EAN-rekey)
 *  6. Remover o produto duplicado
 *
 * Uso:
 *   node scripts/dedup-by-similarity.js                # dry-run, threshold 0.90
 *   node scripts/dedup-by-similarity.js --apply
 *   node scripts/dedup-by-similarity.js --threshold=0.85 --apply
 *   node scripts/dedup-by-similarity.js --threshold=0.85 --show=50
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { canonicalName, normalizeBrand, jaccard, extractVolumeMl } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const APPLY = !!args.apply;
const THRESHOLD = args.threshold ? parseFloat(args.threshold) : 0.90;
const SHOW = args.show ? parseInt(args.show, 10) : 20;

function isRealEan(ean) { return /^\d{12,14}$/.test(ean || ''); }

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  console.log(`📊 Catálogo: ${seed.products.length} produtos\n`);

  // Index lojas por produto
  const eanToStoreCount = {};
  for (const sp of seed.store_products) {
    for (const it of sp.items) {
      eanToStoreCount[it.ean] = (eanToStoreCount[it.ean] || 0) + 1;
    }
  }

  // Agrupar por marca + pré-computar tokens
  const byBrand = {};
  for (const p of seed.products) {
    const b = normalizeBrand(p.brand);
    if (!b) continue;
    if (!byBrand[b]) byBrand[b] = [];
    byBrand[b].push({
      p,
      tokens: new Set(canonicalName(p.name, p.brand).split('-').filter(Boolean)),
    });
  }

  // Encontrar candidatos com guard de volume: se AMBOS têm volume detectável
  // no nome e os volumes DIFEREM, são SKUs diferentes — não fundir.
  const candidates = [];
  let skippedByVolume = 0;
  for (const [b, list] of Object.entries(byBrand)) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], c = list[j];
        if (a.tokens.size < 3 || c.tokens.size < 3) continue;
        const s = jaccard(a.tokens, c.tokens);
        if (s < THRESHOLD) continue;
        // Volume guard
        const va = extractVolumeMl(a.p.name);
        const vc = extractVolumeMl(c.p.name);
        if (va && vc && va !== vc) { skippedByVolume++; continue; }
        candidates.push({ score: s, a: a.p, b: c.p });
      }
    }
  }
  if (skippedByVolume) console.log(`⚠ Skipped ${skippedByVolume} pares por volume diferente (correcto — são SKUs distintos)`);
  console.log(`🔍 Pares candidatos (Jaccard ≥ ${THRESHOLD}): ${candidates.length}`);

  // Decidir merge direction: keepEan vs removeEan
  const merges = candidates.map(({ score, a, b }) => {
    const aReal = isRealEan(a.ean);
    const bReal = isRealEan(b.ean);
    let keep, remove;
    if (aReal && !bReal) { keep = a; remove = b; }
    else if (bReal && !aReal) { keep = b; remove = a; }
    else {
      // empate: o que tem mais ofertas (cobertura maior)
      const aN = eanToStoreCount[a.ean] || 0;
      const bN = eanToStoreCount[b.ean] || 0;
      if (aN >= bN) { keep = a; remove = b; } else { keep = b; remove = a; }
    }
    return { score, keep, remove };
  });

  // Build a graph: cada produto pode ser removido apenas UMA vez
  // Se A → B e B → C, queremos A → C (resolver transitivamente)
  const removedBy = {}; // ean removido → ean kept
  const toRemove = new Set();
  // Ordenar por score desc para processar matches mais certeiros primeiro
  merges.sort((x, y) => y.score - x.score);
  for (const m of merges) {
    if (toRemove.has(m.keep.ean)) continue; // o "keep" já foi marcado para remoção
    if (toRemove.has(m.remove.ean)) continue; // o "remove" já foi processado
    toRemove.add(m.remove.ean);
    removedBy[m.remove.ean] = m.keep.ean;
  }

  console.log(`\n══════ Sumário do merge ══════`);
  console.log(`  Pares candidatos:     ${candidates.length}`);
  console.log(`  Merges efectivos:     ${toRemove.size}`);
  console.log(`  Catálogo depois:      ${seed.products.length - toRemove.size}`);

  // Show samples
  console.log(`\n══════ Amostras (top ${SHOW} merges) ══════`);
  let shown = 0;
  for (const m of merges) {
    if (shown >= SHOW) break;
    if (!removedBy[m.remove.ean]) continue;
    console.log(`\n  score=${m.score.toFixed(2)}`);
    console.log(`    KEEP   ${m.keep.ean.padEnd(45).slice(0,45)} | ${m.keep.name.slice(0,50)}`);
    console.log(`    REMOVE ${m.remove.ean.padEnd(45).slice(0,45)} | ${m.remove.name.slice(0,50)}`);
    shown++;
  }

  if (!APPLY) {
    console.log(`\n[DRY-RUN] Re-corre com --apply para aplicar os ${toRemove.size} merges.`);
    return;
  }

  console.log(`\n⚙ A aplicar merges…`);

  // 1. Migrar ofertas
  let migratedOffers = 0;
  for (const sp of seed.store_products) {
    for (const it of sp.items) {
      if (removedBy[it.ean]) {
        it.ean = removedBy[it.ean];
        migratedOffers++;
      }
    }
  }
  console.log(`  ${migratedOffers} ofertas re-keyed para produtos canónicos`);

  // 2. Remover produtos duplicados
  const before = seed.products.length;
  seed.products = seed.products.filter(p => !toRemove.has(p.ean));
  console.log(`  ${before - seed.products.length} produtos removidos`);

  // 3. Deduplicar ofertas migradas: agora pode haver 2+ items no mesmo store
  // para o mesmo EAN (uma original, uma migrada). FUNDIR variantes + manter
  // headline mais barato in-stock. NÃO descartar variantes do "perdedor".
  let mergedItems = 0;
  for (const sp of seed.store_products) {
    const byEan = new Map();
    for (const it of sp.items) {
      const existing = byEan.get(it.ean);
      if (!existing) { byEan.set(it.ean, it); continue; }
      mergedItems++;
      // Fundir variantes (union por volume_ml, manter preço mais baixo por vol)
      const mergedVariants = [...(existing.variants || [])];
      for (const v of (it.variants || [])) {
        const dup = mergedVariants.find(ev => ev.volume_ml === v.volume_ml);
        if (!dup) { mergedVariants.push(v); }
        else {
          if (v.price < dup.price) { dup.price = v.price; dup.in_stock = dup.in_stock || v.in_stock; }
          if (!dup.url && v.url) dup.url = v.url;
          if (!dup.previous_price && v.previous_price) dup.previous_price = v.previous_price;
        }
      }
      // Headline price: min entre os dois items
      const headlinePrice = Math.min(existing.price, it.price);
      const headlineWinner = (existing.price <= it.price) ? existing : it;
      byEan.set(it.ean, {
        ...headlineWinner,
        price: headlinePrice,
        in_stock: existing.in_stock || it.in_stock,
        variants: mergedVariants.length > 0 ? mergedVariants : undefined,
        // Preserve URL of cheapest in_stock
        url: headlineWinner.url || existing.url || it.url,
      });
    }
    sp.items = [...byEan.values()];
  }
  console.log(`  ${mergedItems} ofertas duplicadas fundidas (variantes preservadas)`);

  fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
  console.log(`\n✓ Escrito ${SEED}`);

  console.log('\n▶ Re-injectando no demo.html…');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) console.log('\n✅ Dedup completo.');
})();
