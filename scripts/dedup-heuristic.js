#!/usr/bin/env node
/**
 * dedup-heuristic — encontra duplicados que o image/fingerprint não apanhou.
 *
 * Sinais combinados:
 *  - Same brand
 *  - Token Jaccard ≥ 0.5 após strip de "Refill/Cofre/Pack/Mini/Set/Limited"
 *  - Mesma "linha de produto" (ex: "genifique", "effaclar", "anthelios")
 *  - EXCLUI variantes legítimas: refill, eye/yeux, cofre, mini, kit
 *
 * Output em data/audit/heuristic-merges.json + console diff plan.
 *
 * Uso:
 *   node scripts/dedup-heuristic.js                # dry-run (default)
 *   node scripts/dedup-heuristic.js --apply        # aplica merge
 *   node scripts/dedup-heuristic.js --threshold=0.6  # mais estrito
 */

const fs = require('fs');
const path = require('path');
const { productFingerprint, normalizeBrand } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const OUT_DIR = path.join(ROOT, 'data', 'audit');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const APPLY = !!args.apply;
const THRESHOLD = args.threshold ? parseFloat(args.threshold) : 0.5;

// Modificadores que indicam variante legítima (NÃO fundir)
const VARIANT_MARKERS = /\b(refill|cofre|pack|mini|set|kit|gift|estuche|conjunto|special|edition|limited|edicao|edição|yeux|eye|olhos|olho|lips|labios|lábios)\b/i;

// Tokens irrelevantes para comparação (descartados antes de Jaccard)
const STOP_TOKENS = new Set([
  'serum', 'sérum', 'cream', 'creme', 'gel', 'oil', 'óleo', 'oleo',
  'spray', 'lotion', 'loção', 'locao', 'mist', 'water', 'agua', 'água',
  'eau', 'de', 'la', 'le', 'el', 'a', 'o', 'da', 'do', 'das', 'dos',
  'with', 'avec', 'para', 'mulher', 'homem', 'femme', 'homme',
  'edp', 'edt', 'cologne', 'colónia', 'colonia', // perfume types ficam diferenciados via category-specific filter
]);

function tokenize(name) {
  return String(name).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOP_TOKENS.has(t) && !/^\d+(ml|gr|g|kg|l)?$/.test(t));
}

function jaccard(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  const inter = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return inter / union;
}

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const products = seed.products;
  console.log(`📦 ${products.length} produtos · threshold Jaccard ≥ ${THRESHOLD}\n`);

  // Agrupar por marca
  const byBrand = {};
  for (const p of products) {
    const b = normalizeBrand(p.brand);
    if (!b) continue;
    if (!byBrand[b]) byBrand[b] = [];
    byBrand[b].push({ p, tokens: new Set(tokenize(p.name)), isVariant: VARIANT_MARKERS.test(p.name) });
  }

  // Encontrar pares de duplicados POR BRANCH
  const pairs = [];
  let comparisons = 0;
  for (const [brand, items] of Object.entries(byBrand)) {
    if (items.length < 2) continue;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        comparisons++;
        const a = items[i], b = items[j];
        // Pular se ambos são variantes (refill vs cofre são legitimamente diferentes)
        if (a.isVariant && b.isVariant) continue;
        // Pular se um é variante mas outro não (refill vs original são diferentes)
        if (a.isVariant !== b.isVariant) continue;
        const sim = jaccard(a.tokens, b.tokens);
        if (sim >= THRESHOLD) {
          pairs.push({
            sim: parseFloat(sim.toFixed(3)),
            a: { ean: a.p.ean, name: a.p.name, image: a.p.image_url },
            b: { ean: b.p.ean, name: b.p.name, image: b.p.image_url },
            brand,
          });
        }
      }
    }
  }
  pairs.sort((x, y) => y.sim - x.sim);
  console.log(`🔍 ${comparisons} comparações; ${pairs.length} pares ≥ ${THRESHOLD}\n`);

  // Connected components: se A~B e B~C, então A,B,C são todos o mesmo grupo
  const parent = {};
  function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
  function union(x, y) {
    const px = find(x), py = find(y);
    if (px !== py) parent[px] = py;
  }
  for (const pair of pairs) {
    parent[pair.a.ean] = parent[pair.a.ean] || pair.a.ean;
    parent[pair.b.ean] = parent[pair.b.ean] || pair.b.ean;
    union(pair.a.ean, pair.b.ean);
  }
  const groups = {};
  for (const ean of Object.keys(parent)) {
    const root = find(ean);
    if (!groups[root]) groups[root] = [];
    groups[root].push(ean);
  }
  const dupGroups = Object.values(groups).filter(g => g.length >= 2);

  console.log(`🧩 ${dupGroups.length} grupos finais (após connected components)\n`);

  // Print top 15 grupos
  for (const group of dupGroups.slice(0, 15)) {
    console.log(`  Grupo (${group.length} produtos):`);
    for (const ean of group) {
      const p = products.find(x => x.ean === ean);
      if (!p) continue;
      console.log(`    ${ean.padEnd(20)} | ${p.name.slice(0, 60)}`);
    }
    console.log('');
  }

  // Salvar para review
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, 'heuristic-merges.json');
  fs.writeFileSync(outFile, JSON.stringify({
    threshold: THRESHOLD,
    audited_at: new Date().toISOString(),
    groups: dupGroups.map(group => group.map(ean => {
      const p = products.find(x => x.ean === ean);
      return { ean, name: p?.name, image: p?.image_url };
    })),
  }, null, 2));
  console.log(`💾 Audit completo: ${outFile.replace(ROOT, '.')}`);
  console.log(`   Total a fundir: ${dupGroups.reduce((a, g) => a + g.length - 1, 0)} produtos em ${dupGroups.length} canonicals`);

  if (!APPLY) {
    console.log('\n[DRY-RUN] Use --apply para aplicar o merge.');
    return;
  }

  // Aplicar merge
  function isRealEan(ean) { return /^\d{8,14}$/.test(ean || ''); }
  function pickCanonical(group) {
    const ps = group.map(e => products.find(p => p.ean === e)).filter(Boolean);
    const real = ps.find(p => isRealEan(p.ean));
    if (real) return real;
    const nonSynthetic = ps.find(p => !p.ean.startsWith('wells-') && !p.ean.startsWith('druni-'));
    return nonSynthetic || ps[0];
  }

  const eanRemap = {};
  for (const group of dupGroups) {
    const canonical = pickCanonical(group);
    if (!canonical) continue;
    // Promover imagem: se canonical não tem mas grupo tem, copiar
    if (!canonical.image_url) {
      const withImg = group.find(e => {
        const p = products.find(x => x.ean === e);
        return p?.image_url && !/placeholder/i.test(p.image_url);
      });
      if (withImg) canonical.image_url = products.find(x => x.ean === withImg).image_url;
    }
    for (const ean of group) {
      if (ean === canonical.ean) continue;
      eanRemap[ean] = canonical.ean;
    }
  }

  // Remapear store_products items (merge variants)
  let merged = 0, kept = 0;
  for (const sp of seed.store_products) {
    const newItems = [];
    const itemByEan = {};
    for (const item of sp.items) {
      const targetEan = eanRemap[item.ean] || item.ean;
      if (itemByEan[targetEan]) {
        const existing = itemByEan[targetEan];
        const incomingVariants = item.variants || [];
        const allVariants = [...(existing.variants || [])];
        for (const v of incomingVariants) {
          if (!v.volume_ml) continue;
          const dup = allVariants.find(ev => ev.volume_ml === v.volume_ml && ev.url === v.url);
          if (!dup) allVariants.push(v);
          else if (v.price < dup.price) dup.price = v.price;
        }
        allVariants.sort((a, b) => (a.volume_ml || 0) - (b.volume_ml || 0));
        existing.variants = allVariants.length ? allVariants : existing.variants;
        if (item.price < existing.price) {
          existing.price = item.price;
          existing.url = item.url;
        }
        merged++;
      } else {
        item.ean = targetEan;
        newItems.push(item);
        itemByEan[targetEan] = item;
        kept++;
      }
    }
    sp.items = newItems;
  }

  const removed = new Set(Object.keys(eanRemap));
  const before = products.length;
  seed.products = products.filter(p => !removed.has(p.ean));
  console.log(`\n✓ Merge: ${before - seed.products.length} produtos removidos; ${merged} store_products fundidos`);
  console.log(`  Catálogo final: ${seed.products.length} produtos`);

  fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
  console.log(`✓ Escrito ${SEED.replace(ROOT, '.')}`);
})();
