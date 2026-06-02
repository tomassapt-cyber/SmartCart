#!/usr/bin/env node
/**
 * SmartCart — Normalização do display da MARCA
 * ============================================================
 *
 * Problema: a mesma marca aparece 2× no filtro do site porque foi scrapada
 * com capitalizações diferentes — "La Mer" (Sweetcare/Wells, Title Case) vs
 * "LA MER" (Druni, ALL CAPS). O fingerprint já é case-insensitive (os
 * produtos JÁ fundem), mas o campo `brand` guardado em cada produto mantém
 * o texto original, por isso o filtro lista duas entradas.
 *
 * Este passo escolhe UM display canónico por marca e reescreve `p.brand`
 * em todos os produtos, eliminando os duplicados do filtro.
 *
 * Escolha do canónico (por chave = brand sem acentos/minúsculas):
 *   1. Override curado (BRAND_DISPLAY) — casing oficial (CeraVe, RoC, …)
 *   2. Acrónimos curtos (≤4 letras, ALL CAPS existe) → mantém ALL CAPS
 *   3. Heurística: prefere mixed-case > minúsculas > ALL CAPS; desempate por
 *      frequência (nº de produtos) e depois alfabético.
 *
 * Uso:
 *   node scripts/normalize-brand-display.js            # audit (dry-run)
 *   node scripts/normalize-brand-display.js --apply     # aplica + inject
 *   node scripts/normalize-brand-display.js --apply --no-inject
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
const NO_INJECT = !!args['no-inject'];

const strip = x => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '');
const keyOf = x => strip(String(x).toLowerCase()).replace(/\s+/g, ' ').trim();

// ── Casing oficial curado (chave = keyOf da marca) ───────────────────────────
const BRAND_DISPLAY = {
  'cerave': 'CeraVe',
  'biretix': 'BiRetix',
  'anne moller': 'Anne Möller',
  'rene furterer': 'René Furterer',
  'jowae': 'Jowaé',
  'cosrx': 'COSRX',
  'it cosmetics': 'IT Cosmetics',
  'neostrata': 'NeoStrata',
  'roc': 'RoC',
  'akileine': 'Akileïne',
  'nestle': 'Nestlé',
  "o'keeffe's": "O'Keeffe's",
  'bioactivo': 'BioActivo',
  'mentalaction': 'MentalAction',
  'skinceuticals': 'SkinCeuticals',
  'vitace': 'Vitacê',
  'zzzquil': 'ZzzQuil',
  'fullmarks': 'FullMarks',
  'benamor': 'Benamôr',
  'babe': 'Babé',
  'toskin': 'ToSkin',
  'genove': 'Genové',
  'nutreov': 'Nutréov',
  'just for men': 'Just For Men',
  'axis-y': 'AXIS-Y',
  'caudalie': 'Caudalie',
  'suavinex': 'Suavinex',
  'remescar': 'Remescar',
  'maternatura': 'Maternatura',
  // Acrónimos / casing especial frequentes
  'svr': 'SVR',
  'ysl': 'Yves Saint Laurent',
  'nyx': 'NYX',
  'sk-ii': 'SK-II',
  'skii': 'SK-II',
  'kiko': 'KIKO',
  'kiko milano': 'KIKO Milano',
  'pca skin': 'PCA Skin',
  'iunik': "i'unik",
  'ogx': 'OGX',
  'tena': 'TENA',
  'tous': 'TOUS',
  'nan': 'NAN',
  'gum': 'GUM',
  'idc institute': 'IDC Institute',
};

// keyOf(marca) ≤4 letras e existe variante ALL CAPS → provável acrónimo
function caseScore(sx) {
  const L = sx.replace(/[^a-zA-Z]/g, '');
  if (!L) return 0;
  const isUpper = L === L.toUpperCase();
  const isLower = L === L.toLowerCase();
  if (isUpper) return 0;   // ALL CAPS — pior
  if (isLower) return 1;   // tudo minúsculo
  return 2;                // mixed/proper — melhor
}

const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));

const cnt = {};
for (const p of seed.products) { if (p.brand) cnt[p.brand] = (cnt[p.brand] || 0) + 1; }

const groups = {};
for (const b of Object.keys(cnt)) (groups[keyOf(b)] ||= []).push(b);

function pickCanonical(k, variants) {
  // Acrónimos / casing oficial só via override curado (BRAND_DISPLAY).
  // A heurística genérica prefere mixed-case > minúsculas > ALL CAPS,
  // desempate por frequência e depois alfabético.
  if (BRAND_DISPLAY[k]) return BRAND_DISPLAY[k];
  return variants.slice().sort((a, b) =>
    caseScore(b) - caseScore(a) || cnt[b] - cnt[a] || a.localeCompare(b)
  )[0];
}

// Mapa final: brand original → display canónico (só quando muda)
const remap = {};
let collisions = 0;
for (const [k, variants] of Object.entries(groups)) {
  const canon = pickCanonical(k, variants);
  const isCollision = variants.length > 1;
  if (isCollision) collisions++;
  for (const v of variants) if (v !== canon) remap[v] = canon;
}

console.log(`📊 ${seed.products.length} produtos · ${Object.keys(cnt).length} brands distintas · ${Object.keys(groups).length} chaves`);
console.log(`   colisões de capitalização: ${collisions} | brands a reescrever: ${Object.keys(remap).length}\n`);

if (Object.keys(remap).length === 0) { console.log('✅ Nada a normalizar.'); process.exit(0); }

console.log('═══ Reescritas (amostra ordenada por impacto) ═══');
Object.entries(remap)
  .sort((a, b) => (cnt[b[0]] || 0) - (cnt[a[0]] || 0))
  .slice(0, 60)
  .forEach(([from, to]) => console.log(`  ${String(cnt[from]).padStart(4)}×  ${JSON.stringify(from)} → ${JSON.stringify(to)}`));

if (!APPLY) { console.log('\n💡 Aplicar: node scripts/normalize-brand-display.js --apply'); process.exit(0); }

let changed = 0;
for (const p of seed.products) {
  if (p.brand && remap[p.brand]) { p.brand = remap[p.brand]; changed++; }
}

console.log(`\n═══ Resultado ═══`);
console.log(`Produtos com brand reescrita: ${changed}`);
const brandsAfter = new Set(seed.products.map(p => p.brand).filter(Boolean));
console.log(`Brands distintas depois: ${brandsAfter.size}`);

fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
console.log(`✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')}`);

if (!NO_INJECT) {
  console.log('\n▶ inject-seed-into-demo...');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) console.warn('⚠ inject falhou.');
}
