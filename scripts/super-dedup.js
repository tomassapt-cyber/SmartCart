#!/usr/bin/env node
/**
 * GirlMath — Super Dedup multi-sinal
 * ============================================================
 *
 * Detecta produtos duplicados combinando 5 sinais de identidade:
 *
 *   1. EAN real (GTIN-13) idêntico                  → 100 (definitivo)
 *   2. Imagem URL/hash igual                        → 40
 *   3. Fingerprint exacto (brand + canonical name)  → 35
 *   4. Jaccard tokens ≥ 0.85                        → 25
 *   5. Token "signature" partilhado (>5 chars)      → 20
 *
 * Score >= 60 → merge automático
 * Score 40-59 → review (relatório, não auto-merge)
 *
 * Guards (sempre):
 *   • Mesma marca canónica
 *   • Mesmo volume se AMBOS têm volume detectável
 *   • Skip se "kit/cofre/pack/duplo" só num lado (são bundles ≠ singles)
 *
 * Uso:
 *   node scripts/super-dedup.js                   # dry-run report
 *   node scripts/super-dedup.js --apply           # merge confidence>=60
 *   node scripts/super-dedup.js --threshold=50    # mais agressivo
 *   node scripts/super-dedup.js --show=30         # mais samples
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  productFingerprint,
  canonicalName,
  normalizeBrand,
  extractVolumeMl,
  stripAccents,
  jaccard,
} = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const APPLY = !!args.apply;
const THRESHOLD = args.threshold ? parseInt(args.threshold, 10) : 60;
const SHOW = args.show ? parseInt(args.show, 10) : 20;
const REPORT_FILE = path.join(ROOT, 'data', '.super-dedup-report.json');

function isRealEan(ean) { return /^\d{12,14}$/.test(ean || ''); }

// ── Normalização agressiva PT/EN/FR/ES ──────────────────────────────
// Extra synonyms beyond what canonicalName() already does.
const EXTRA_SYNONYMS = [
  // Hair products (champô / shampoo / champu / shampoing)
  [/\b(champ[oôu])\b/gi, 'shampoo'],
  [/\bshampoing\b/gi, 'shampoo'],
  // Conditioner
  [/\b(condicionador|acondicionador|conditioner|apr[eè]s[- ]shampoo)\b/gi, 'condicionador'],
  // Hidratante (moisturizing)
  [/\b(hidratant[ae]|hydratant|hydrating|moisturi[zs]ing|moisturi[zs]er)\b/gi, 'hidratante'],
  // Cream
  [/\b(creme|cr[eè]me|cream|crema)\b/gi, 'creme'],
  // Lotion
  [/\b(loç[ãa]o|lotion|loci[oó]n)\b/gi, 'locao'],
  // Oil
  [/\b([oó]leo|huile|oil|aceite)\b/gi, 'oleo'],
  // Mask
  [/\b(m[aá]scara|masque|mask|mascarilla)\b/gi, 'mascara'],
  // Serum
  [/\b(s[eé]rum|serum)\b/gi, 'serum'],
  // Solar / sunscreen
  [/\b(solar|sunscreen|protetor.solar|protector.solar)\b/gi, 'solar'],
  // Hair (capilar/hair)
  [/\b(capilar|hair|cabelo)\b/gi, 'capilar'],
  // Face / facial
  [/\b(rosto|face|facial|cara)\b/gi, 'rosto'],
  // Body
  [/\b(corpo|body)\b/gi, 'corpo'],
  // Bath
  [/\b(banho|bath)\b/gi, 'banho'],
  // Refill
  [/\b(recarga|refill|recharge)\b/gi, 'refill'],
  // Promo descriptors that are noise
  [/\bdesconto\b/gi, ''],
  [/\bcom\s+desconto\b/gi, ''],
  [/\bpreço\s+especial\b/gi, ''],
  [/\boferta\b/gi, ''],
  // Volume packaging that isn't actually a volume
  [/\bunidades?\b/gi, ''],
  [/\bpack\b/gi, ''],
];

const FILLER_WORDS = new Set([
  'a', 'o', 'e', 'de', 'da', 'do', 'em', 'com', 'sem', 'para', 'pelo', 'pela',
  'the', 'of', 'and', 'or', 'for', 'with', 'without',
  'le', 'la', 'les', 'des', 'au', 'aux', 'en',
  'el', 'los', 'las', 'y', 'con', 'sin', 'por',
]);

// Cor/tone descriptors — quando só diferem nestes, são variantes não duplicados
const COLOR_TONES = new Set([
  'light', 'medium', 'dark', 'claro', 'escuro', 'medio', 'natural',
  'beige', 'bege', 'rose', 'rosa', 'sand', 'areia', 'gold', 'dourado',
  'doré', 'porcelain', 'porcelana', 'ivory', 'marfim',
]);

// Bundle markers — produto agrupado, NÃO é single
const BUNDLE_MARKERS = /\b(kit|cofre|pack|duplo|estuche|conjunto|coffret|trio|duo)\b/i;

// Size discriminators — tamanho de roupa, mm, comprimento, %
const SIZE_MARKERS = /\b(\d+\s*mm|\d+\s*cm|\d+%|xxs|xs|small|medium|large|xl|xxl|\bs\b|\bm\b|\bl\b|tamanho)\b/i;

// Color/tone discriminators no nome (não os do COLOR_TONES set que são stripped)
// Quando AMBOS têm cor distinta mencionada, são SKUs separados.
const TONE_MARKERS = /\btom\s+(claro|m[eé]dio|escuro|natural|porcelana|areia|bege|dourado|rosado)\b|\bshade\s+\w+\b|\b(preto|branco|black|white|gold|silver|dourado|prata|rosa|rose|bege|beige|claro|escuro|nude|natural|bronze|bronzeado|marfim|ivory|porcelana|porcelain|amarelo|yellow|caramelo|caramel)\b/i;

// Product type discriminators — se AMBOS têm tipos distintos da mesma família
// (shampoo vs condicionador, creme vs serum, etc.) NÃO são duplicados.
const PRODUCT_TYPES = [
  /\b(shampoo|champo|champu|shampoing)\b/i,
  /\b(condicionador|conditioner|acondicionador)\b/i,
  /\b(serum|s[eé]rum)\b/i,
  /\b(creme|cream|crema|cr[eè]me)\b/i,
  /\b(loca[oc]a[oõ]|locao|lotion|locion)\b/i,
  /\b(oleo|huile|aceite|oil)\b/i,
  /\b(mascara|masque|mask|mascarilla)\b/i,
  /\b(gel|gel-creme|gel-cream)\b/i,
  /\b(spray|brume|mist)\b/i,
  /\b(stick|barra)\b/i,
  /\b(p[oó]|powder|polvo|pudra)\b/i,
];
function productType(name) {
  if (!name) return null;
  const n = stripAccents(name).toLowerCase();
  for (let i = 0; i < PRODUCT_TYPES.length; i++) {
    if (PRODUCT_TYPES[i].test(n)) return i; // return index of family
  }
  return null;
}

function aggressiveNormalize(name, brand) {
  if (!name) return '';
  let n = stripAccents(String(name).toLowerCase());

  // Apply extra synonyms
  for (const [re, repl] of EXTRA_SYNONYMS) {
    n = n.replace(re, repl);
  }

  // Strip volume (already removed in canonicalName but defensive)
  n = n.replace(/\b\d+(?:[.,]\d+)?\s*(ml|gr|g|kg|l|fl\.?\s*oz|oz)\b/gi, ' ');

  // Strip brand tokens
  if (brand) {
    const brandTokens = stripAccents(String(brand).toLowerCase())
      .replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
    for (const w of brandTokens) {
      n = n.replace(new RegExp(`\\b${w}\\b`, 'g'), ' ');
    }
  }

  // Reduce punctuation to spaces
  n = n.replace(/[^\w\s+-]/g, ' ').replace(/[-_]+/g, ' ');

  // Tokenize + filter
  const tokens = n.split(/\s+/).filter(Boolean).filter(t => {
    if (t.length < 2) return false;
    if (FILLER_WORDS.has(t)) return false;
    if (COLOR_TONES.has(t)) return false; // remove cor tones from comparison
    return true;
  });

  return tokens;
}

function distinctiveTokens(tokens) {
  // Tokens >= 5 chars, não números puros, não muito genéricos
  const GENERIC = new Set(['creme', 'serum', 'oleo', 'shampoo', 'gel', 'spray', 'mask']);
  return new Set(tokens.filter(t => t.length >= 5 && !GENERIC.has(t) && !/^\d+$/.test(t)));
}

// Normalize image URL — strip CDN-specific size/cache params for cross-product comparison
function normImg(url) {
  if (!url) return null;
  return String(url).split('?')[0]
    .replace(/(_\d+x\d+|_grande|_large|_medium|_small|_thumb|_main|_500x500|_600x600)(?=\.[a-z]+$)/i, '')
    .replace(/\/cache\/[a-f0-9]+\//, '/')
    .toLowerCase();
}

function computeScore(a, b) {
  let score = 0;
  const reasons = [];

  // 1. Real EAN match
  if (isRealEan(a.ean) && a.ean === b.ean) {
    return { score: 100, reasons: ['ean-real-match'] };
  }

  // 2. Image match (reduzido de 40→20: lojas re-usam fotos para variantes)
  if (a.normImg && a.normImg === b.normImg) {
    score += 20; reasons.push('img-match');
  }

  // 3. Fingerprint exacto
  if (a.fp && a.fp === b.fp) {
    score += 35; reasons.push('fp-exact');
  }

  // 4. Jaccard tokens (canonical aggressive)
  const jc = jaccard(a.aggTokenSet, b.aggTokenSet);
  if (jc >= 0.85) { score += 25; reasons.push(`jaccard-${jc.toFixed(2)}`); }
  else if (jc >= 0.70) { score += 12; reasons.push(`jaccard-low-${jc.toFixed(2)}`); }

  // 5. Distinctive tokens shared (subido de 20→30 — mais reliable)
  let sharedDistinctive = 0;
  for (const t of a.distinctive) if (b.distinctive.has(t)) sharedDistinctive++;
  if (sharedDistinctive >= 3) {
    score += 35; reasons.push(`distinctive-${sharedDistinctive}`);
  } else if (sharedDistinctive >= 2) {
    score += 25; reasons.push(`distinctive-${sharedDistinctive}`);
  } else if (sharedDistinctive === 1) {
    score += 8; reasons.push('distinctive-1');
  }

  return { score, reasons };
}

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  console.log(`📊 Catálogo: ${seed.products.length} produtos\n`);

  // Pre-compute all signals
  console.log('🔧 A pré-computar sinais por produto…');
  const eanToStoreCount = {};
  for (const sp of seed.store_products) {
    for (const it of sp.items) eanToStoreCount[it.ean] = (eanToStoreCount[it.ean] || 0) + 1;
  }
  const enriched = seed.products.map(p => {
    const brandCanon = normalizeBrand(p.brand);
    const aggTokens = aggressiveNormalize(p.name, p.brand);
    return {
      ean: p.ean,
      brand: p.brand,
      brandCanon,
      name: p.name,
      fp: productFingerprint(p),
      aggTokens,
      aggTokenSet: new Set(aggTokens),
      distinctive: distinctiveTokens(aggTokens),
      volume: extractVolumeMl(p.name),
      normImg: normImg(p.image_url),
      isBundle: BUNDLE_MARKERS.test(p.name || ''),
      // stripAccents + replace underscores (Easyfarma names usam '_' como
      // separador) para que tone/size markers detectem correctamente.
      sizeMarker: stripAccents(String(p.name || '').replace(/[_]+/g, ' ')).match(SIZE_MARKERS)?.[0]?.toLowerCase() || null,
      toneMarker: stripAccents(String(p.name || '').replace(/[_]+/g, ' ')).match(TONE_MARKERS)?.[0]?.toLowerCase() || null,
      productType: productType(String(p.name || '').replace(/[_]+/g, ' ')),
      eanPrefix: p.ean.match(/^[a-z-]+-/)?.[0] || null, // store-prefix of synthetic
      storeCount: eanToStoreCount[p.ean] || 0,
    };
  });

  // Group by brand canon
  const byBrand = {};
  for (const p of enriched) {
    if (!p.brandCanon) continue;
    if (!byBrand[p.brandCanon]) byBrand[p.brandCanon] = [];
    byBrand[p.brandCanon].push(p);
  }

  // Find candidate pairs
  console.log(`🔍 A comparar pares dentro de ${Object.keys(byBrand).length} marcas…\n`);
  const candidates = [];
  let comparedPairs = 0;
  let skipped = { volume: 0, bundle: 0, size: 0, tone: 0, sameStore: 0, productType: 0 };

  for (const [brand, list] of Object.entries(byBrand)) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        comparedPairs++;
        const a = list[i], b = list[j];

        // === Guards (hard skips) ===
        // Mesma loja (mesmo prefix sintético) → quase sempre variantes
        // intencionais, NÃO duplicação. Se a loja tem 4 SKUs separados,
        // é porque vende como SKUs separados.
        if (a.eanPrefix && a.eanPrefix === b.eanPrefix) { skipped.sameStore++; continue; }
        // Volume diferente
        if (a.volume && b.volume && a.volume !== b.volume) { skipped.volume++; continue; }
        // Bundle vs single
        if (a.isBundle !== b.isBundle) { skipped.bundle++; continue; }
        // Size markers diferentes (S vs M, 21mm vs 27mm, etc.)
        if (a.sizeMarker && b.sizeMarker && a.sizeMarker !== b.sizeMarker) { skipped.size++; continue; }
        // Tone markers diferentes (Tom Claro vs Tom Médio, Preto vs Branco)
        if (a.toneMarker && b.toneMarker && a.toneMarker !== b.toneMarker) { skipped.tone++; continue; }
        // Product types diferentes (Shampoo vs Conditioner, Creme vs Sérum)
        if (a.productType !== null && b.productType !== null && a.productType !== b.productType) {
          skipped.productType++; continue;
        }

        const { score, reasons } = computeScore(a, b);
        if (score >= 40) {
          candidates.push({ a, b, score, reasons });
        }
      }
    }
  }
  console.log(`  Pares comparados: ${comparedPairs}`);
  console.log(`  Skipped:`);
  Object.entries(skipped).forEach(([k, n]) => console.log(`    ${k.padEnd(12)} ${n}`));
  console.log(`  Candidatos (score ≥ 40): ${candidates.length}\n`);

  // Sort by score desc, transitive resolution
  candidates.sort((x, y) => y.score - x.score);

  // Decide merges (auto threshold)
  const toMerge = []; // { keep, remove, score, reasons }
  const review = []; // medium confidence
  const removedSet = new Set();
  const keepMap = new Map(); // ean → final canonical ean (transitive)

  function findCanon(ean) {
    let cur = ean;
    while (keepMap.has(cur)) cur = keepMap.get(cur);
    return cur;
  }

  for (const c of candidates) {
    const aCanon = findCanon(c.a.ean);
    const bCanon = findCanon(c.b.ean);
    if (aCanon === bCanon) continue; // already same group
    // Decide keep direction
    const aRow = enriched.find(e => e.ean === aCanon);
    const bRow = enriched.find(e => e.ean === bCanon);
    if (!aRow || !bRow) continue;
    let keep, remove;
    if (isRealEan(aRow.ean) && !isRealEan(bRow.ean)) { keep = aRow; remove = bRow; }
    else if (isRealEan(bRow.ean) && !isRealEan(aRow.ean)) { keep = bRow; remove = aRow; }
    else if (aRow.storeCount !== bRow.storeCount) {
      keep = aRow.storeCount > bRow.storeCount ? aRow : bRow;
      remove = keep === aRow ? bRow : aRow;
    } else {
      keep = aRow; remove = bRow;
    }
    if (c.score >= THRESHOLD) {
      toMerge.push({ keep, remove, score: c.score, reasons: c.reasons });
      keepMap.set(remove.ean, keep.ean);
      removedSet.add(remove.ean);
    } else {
      review.push({ keep, remove, score: c.score, reasons: c.reasons });
    }
  }

  console.log('══════ Resultado ══════');
  console.log(`  Merges auto (score ≥ ${THRESHOLD}): ${toMerge.length}`);
  console.log(`  Review (score 40-${THRESHOLD - 1}):  ${review.length}`);
  console.log(`  Catálogo depois: ${seed.products.length - removedSet.size}`);

  // Score distribution
  const buckets = { '90-100': 0, '70-89': 0, '60-69': 0, '40-59': 0 };
  for (const c of [...toMerge, ...review]) {
    if (c.score >= 90) buckets['90-100']++;
    else if (c.score >= 70) buckets['70-89']++;
    else if (c.score >= 60) buckets['60-69']++;
    else buckets['40-59']++;
  }
  console.log(`\n  Distribuição:`);
  Object.entries(buckets).forEach(([k, n]) => console.log(`    ${k}: ${n}`));

  // Save report
  const report = {
    generated_at: new Date().toISOString(),
    threshold: THRESHOLD,
    summary: {
      products_before: seed.products.length,
      auto_merges: toMerge.length,
      review_pairs: review.length,
      products_after: seed.products.length - removedSet.size,
    },
    auto_merges: toMerge.slice(0, 200).map(m => ({
      score: m.score,
      reasons: m.reasons,
      keep: { ean: m.keep.ean, brand: m.keep.brand, name: m.keep.name },
      remove: { ean: m.remove.ean, brand: m.remove.brand, name: m.remove.name },
    })),
    review_pairs: review.slice(0, 100).map(m => ({
      score: m.score,
      reasons: m.reasons,
      a: { ean: m.keep.ean, brand: m.keep.brand, name: m.keep.name },
      b: { ean: m.remove.ean, brand: m.remove.brand, name: m.remove.name },
    })),
  };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report: ${REPORT_FILE.replace(ROOT, '.')}`);

  // Show samples
  console.log(`\n══════ Top ${SHOW} auto-merges ══════`);
  toMerge.slice(0, SHOW).forEach(m => {
    console.log(`\n  score=${m.score} · ${m.reasons.join(',')}`);
    console.log(`    KEEP   ${m.keep.ean.padEnd(45).slice(0,45)} | ${m.keep.name.slice(0,55)}`);
    console.log(`    REMOVE ${m.remove.ean.padEnd(45).slice(0,45)} | ${m.remove.name.slice(0,55)}`);
  });

  if (!APPLY) {
    console.log(`\n[DRY-RUN] Re-corre com --apply para fundir os ${toMerge.length} pares.`);
    return;
  }

  console.log(`\n⚙ A aplicar ${toMerge.length} merges…`);

  // 1. Migrate offers — re-key all items[].ean from removed to keep
  let migratedOffers = 0;
  for (const sp of seed.store_products) {
    for (const it of sp.items) {
      const canon = findCanon(it.ean);
      if (canon !== it.ean) { it.ean = canon; migratedOffers++; }
    }
  }
  console.log(`  ${migratedOffers} ofertas re-keyed`);

  // 2. Remove dup products
  const before = seed.products.length;
  seed.products = seed.products.filter(p => !removedSet.has(p.ean));
  console.log(`  ${before - seed.products.length} produtos removidos`);

  // 3. Fuse duplicate items in same store (after migration)
  let fusedItems = 0;
  for (const sp of seed.store_products) {
    const byEan = new Map();
    for (const it of sp.items) {
      const existing = byEan.get(it.ean);
      if (!existing) { byEan.set(it.ean, it); continue; }
      fusedItems++;
      // Fuse variantes
      const mergedVariants = [...(existing.variants || [])];
      for (const v of (it.variants || [])) {
        const dup = mergedVariants.find(ev => ev.volume_ml === v.volume_ml);
        if (!dup) mergedVariants.push(v);
        else {
          if (v.price < dup.price) { dup.price = v.price; dup.in_stock = dup.in_stock || v.in_stock; }
          if (!dup.url && v.url) dup.url = v.url;
          if (!dup.previous_price && v.previous_price) dup.previous_price = v.previous_price;
        }
      }
      const winnerByPrice = (existing.price <= it.price) ? existing : it;
      byEan.set(it.ean, {
        ...winnerByPrice,
        price: Math.min(existing.price, it.price),
        in_stock: existing.in_stock || it.in_stock,
        variants: mergedVariants.length > 0 ? mergedVariants : undefined,
        url: winnerByPrice.url || existing.url || it.url,
      });
    }
    sp.items = [...byEan.values()];
  }
  console.log(`  ${fusedItems} ofertas duplicadas fundidas (variantes preservadas)`);

  fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
  console.log(`\n✓ Escrito ${SEED}`);

  console.log('\n▶ Re-injectando no demo.html…');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) console.log('\n✅ Super dedup completo.');
})();
