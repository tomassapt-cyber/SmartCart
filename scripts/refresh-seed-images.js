#!/usr/bin/env node
/**
 * SmartCart — Refresh seed product images from Druni catalog
 * ============================================================
 *
 * Pega nos 23 produtos seed (definidos em build-catalog.js) que estão
 * SEM image_url e tenta encontrar o produto correspondente na Druni
 * via slug-similarity. Quando encontra, scrapa o og:image e guarda em
 * data/image-overrides.json (que o build-catalog consome).
 *
 * Idempotente: produtos já em overrides são saltados.
 *
 * Uso:
 *   node scripts/refresh-seed-images.js                  # tudo
 *   node scripts/refresh-seed-images.js --ean=3360372059707  # só 1
 *   node scripts/refresh-seed-images.js --dry-run        # mostra matches, não scraper
 *   node scripts/refresh-seed-images.js --force          # ignora cache em overrides
 *   node scripts/refresh-seed-images.js --headed         # browser visível (debug)
 */

const fs = require('fs');
const path = require('path');
const { PRODUCTS } = require('./build-catalog');
const { normalizeBrand, canonicalName, stripAccents } = require('./lib/product-fingerprint');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('✗ playwright não instalado'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const DRUNI_URLS = path.join(ROOT, 'data', 'catalog', 'druni-urls.json');
const OVERRIDES_FILE = path.join(ROOT, 'data', 'image-overrides.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const EAN_FILTER = args.ean || null;
const DRY_RUN = !!args['dry-run'];
const FORCE = !!args.force;
const HEADED = !!args.headed;

if (!fs.existsSync(DRUNI_URLS)) {
  console.error('✗ Falta', DRUNI_URLS, '— corre primeiro: node scripts/discover-druni-catalog.js');
  process.exit(1);
}

// Load existing overrides
let overrides = {};
if (fs.existsSync(OVERRIDES_FILE)) {
  overrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8'));
}

// Druni URLs
const druniData = JSON.parse(fs.readFileSync(DRUNI_URLS, 'utf8'));
const druniUrls = druniData.urls;
console.log(`📦 ${druniUrls.length} Druni URLs disponíveis`);
console.log(`📋 ${Object.keys(overrides).length} overrides em cache\n`);

// Identificar produtos seed elegíveis
let candidates = PRODUCTS.filter(p => !p.image_url);
if (EAN_FILTER) candidates = candidates.filter(p => p.ean === EAN_FILTER);
if (!FORCE) candidates = candidates.filter(p => !overrides[p.ean]);

console.log(`🎯 Produtos seed elegíveis: ${candidates.length}\n`);

// ─ Slug-based fuzzy match ───────────────────────────────────────
function scoreCandidate(slug, brandWords, nameWords) {
  const s = slug.toLowerCase();
  let brandHits = 0;
  let nameHits = 0;
  for (const w of brandWords) if (s.includes(w)) brandHits++;
  for (const w of nameWords) if (s.includes(w)) nameHits++;
  let score = brandHits * 5 + nameHits * 3;
  // Penalizar slugs de packs/gifts (quase nunca queremos)
  if (/\b(cofre|estuche|kit|pack|set|conjunto)\b/.test(s)) score -= 8;
  return { score, brandHits, nameHits };
}

function findBestMatch(product) {
  const brand = normalizeBrand(product.brand);
  const brandWords = brand.split('-').filter(w => w.length > 2);
  const name = canonicalName(product.name, product.brand);
  const nameWords = name.split('-').filter(w => w.length > 2);
  // Variações de marca
  if (brand === 'la-roche-posay') brandWords.push('roche', 'posay');
  if (brand === 'ysl') brandWords.push('yves', 'saint', 'laurent');
  if (brand === 'estee-lauder') brandWords.push('estee', 'lauder');
  if (brand === 'loreal-paris') brandWords.push('elvive', 'oreal');
  if (brand === 'giorgio-armani') brandWords.push('armani');
  if (brand === 'maybelline') brandWords.push('maybelline');
  if (brand === 'charlotte-tilbury') brandWords.push('charlotte', 'tilbury');

  // Mínimos de qualidade:
  //  - PELO MENOS 1 palavra de brand match
  //  - PELO MENOS 50% das palavras do nome match (arredondado para cima, min 1)
  const minBrandHits = Math.min(1, brandWords.length);
  const minNameHits = Math.max(1, Math.ceil(nameWords.length / 2));

  const ranked = druniUrls
    .map(u => ({ ...u, ...scoreCandidate(u.slug, brandWords, nameWords) }))
    .filter(c => c.brandHits >= minBrandHits && c.nameHits >= minNameHits)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 3);
}

(async () => {
  // Pré-screen: encontrar matches sem scrapar ainda
  console.log('═══════ Matches encontrados ═══════');
  const plans = [];
  for (const p of candidates) {
    const matches = findBestMatch(p);
    plans.push({ product: p, matches });
    console.log(`\n${p.ean} | ${p.brand} | ${p.name.slice(0, 50)}`);
    if (matches.length === 0) {
      console.log('  ⚠ sem candidato');
      continue;
    }
    matches.forEach((m, i) => console.log(`  ${i+1}. [${m.score}] ${m.slug}`));
  }

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] Não scraping.');
    return;
  }

  // Scrape top match for each
  const toScrape = plans.filter(p => p.matches.length > 0);
  if (toScrape.length === 0) {
    console.log('\n✓ Nada para scraper.');
    return;
  }
  console.log(`\n▶ A scraping ${toScrape.length} top matches...\n`);

  const browser = await chromium.launch({
    headless: !HEADED,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'pt-PT',
    viewport: { width: 1366, height: 768 },
  });
  await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico}', r => r.abort());

  let ok = 0;
  for (const plan of toScrape) {
    const top = plan.matches[0];
    const page = await context.newPage();
    try {
      await page.goto(top.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1500);
      const imageUrl = await page.evaluate(() => {
        const og = document.querySelector('meta[property="og:image"]');
        return og?.getAttribute('content') || null;
      });
      if (imageUrl) {
        overrides[plan.product.ean] = imageUrl;
        ok++;
        console.log(`  ✓ ${plan.product.ean} ${imageUrl.slice(0, 80)}`);
      } else {
        console.log(`  ✗ ${plan.product.ean} sem og:image em ${top.slug}`);
      }
    } catch (e) {
      console.log(`  ✗ ${plan.product.ean} ${e.message.slice(0, 60)}`);
    } finally {
      await page.close();
    }
    // delay pequeno
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
  }
  await browser.close();

  // Save overrides
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2));
  console.log(`\n✓ Escrito ${OVERRIDES_FILE.replace(ROOT, '.')} (${Object.keys(overrides).length} overrides)`);
  console.log(`\nPróximo: node scripts/build-catalog.js  ← re-aplica overrides ao seed`);
})();
