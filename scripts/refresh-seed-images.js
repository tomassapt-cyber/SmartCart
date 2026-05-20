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
const ONLY_ALLOWLIST = !!args.allowlist;
const DIRECT_MODE = !!args.direct;

// Curated EAN → Druni slug map (slug-based, requires druni-urls.json).
const ALLOWLIST = {
  '3474630639785': 'elixir-ultime-kerastase-oleo-originale-capilar',
  '0884486373601': 'all-soft-shampoo-redken-shampoo-hidratante-cabelo-seco',
  '8470001763440': 'fusion-water-magic-isdin-protetor-solar-facial-ultraleve',
  '3337875585668': 'hyalu-b5-roche-posay-serum-anti-rugas',
  '3401395614172': 'sensibio-h2o-solucion-micelar-bioderma-agua-micelar',
};

// Curated EAN → direct URL map (Wells preferred — estética consistente, fundo branco).
// Usa --direct para activar. Sobrescreve overrides existentes.
const ALLOWLIST_DIRECT = {
  // Wells (estética consistente, fundo branco, alta qualidade)
  '3365440787858': 'https://wells.pt/black-opium-eau-de-parfum-287941.html',                                   // YSL Black Opium
  '3614271326072': 'https://wells.pt/serum-genifique-287971.html',                                              // Lancôme Génifique
  '0887167491625': 'https://wells.pt/advanced-night-repair-serum-multi-recovery-287627.html',                  // Estée Lauder ANR
  '3337875585132': 'https://wells.pt/serum-rosto-fortificante-mineral-89-6921452.html',                        // Vichy Minéral 89
  '3337875585026': 'https://wells.pt/effaclar-duom-soin-anti-imperfections-7852795.html',                      // LRP Effaclar Duo+
  '3264680004605': 'https://wells.pt/oleo-huile-prodigieuse-4346087.html',                                      // Nuxe Huile Prodigieuse
  '3522930003151': 'https://wells.pt/vinoperfect-serum-eclat-anti-taches-368183.html',                          // Caudalie Vinoperfect
  '3337875597196': 'https://wells.pt/moisturising-cream-dry-to-very-dry-skin-8122531.html',                    // CeraVe Hidratante
  '8470001763440': 'https://wells.pt/fusion-water-magic-daily-protection-spf-50-357176.html',                  // ISDIN Fusion Water
  '3474630639785': 'https://wells.pt/elixir-ultime-lhuile-refillable-446416.html',                              // Kérastase Elixir Ultime
  '0884486373601': 'https://wells.pt/all-soft-shampoo-7461242.html',                                            // Redken All Soft
  '3401395614172': 'https://wells.pt/sensibio-h2o-peux-sensibles-eau-micellaire-8518622.html',                 // Bioderma Sensibio
  '3337875585668': 'https://wells.pt/hyalu-b5-anti-wrinkle-care-6447073.html',                                  // LRP Hyalu B5
  '3360372059707': 'https://wells.pt/code-eau-de-toilette-328746.html',                                         // Armani Code
  '8011003845460': 'https://wells.pt/versace-bright-crystal-edt-288332.html',                                   // Versace Bright Crystal
  '3600523432059': 'https://wells.pt/elvive-oleo-extraordinario-serum-nutritivo-6960160.html',                 // L'Oréal Elvive
  '3337875797436': 'https://wells.pt/protetor-solar-anthelios-uvmune-400-spf50-7577494.html',                  // LRP Anthelios

  // Fallbacks (Wells não vende estas marcas)
  '3348901250146': 'https://www.sephora.pt/p/sauvage---eau-de-toilette-para-homem---notas-condimentadas-e-madeira-%C3%A2mbar-P2266017.html', // Dior Sauvage
  '8719134109924': 'https://www.rituals.com/pt-pt/the-ritual-of-sakura-body-cream-220ml-1118773.html',         // Rituals Sakura
  '3600524025632': 'https://www.sweetcare.pt/maybelline-fit-me-matte-poreless-foundation-p-016223bl',          // Maybelline Fit Me

  // Notino (não tem Wells nem oficial scrapable)
  '3145891264100': 'https://www.notino.pt/chanel/no-5-eau-de-parfum-para-mulher/',                              // Chanel No.5
  '3348901250146': 'https://www.druni.pt/sauvage-eau-toilette-dior-eau-toilette-homem',                         // Dior Sauvage (via Druni)
  '5060542790147': 'https://www.douglas.pt/p/charlotte-tilbury-charlottes-magic-cream-1196812',                  // Charlotte Tilbury Magic Cream
  '0607845029250': 'https://www.narscosmetics.eu/pt/Maquilhagem/Rosto/Corretor/Radiant-Creamy-Concealer/0607845029250.html', // NARS Concealer (já funcionou)
};

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
  // Modo --direct: usa ALLOWLIST_DIRECT (URLs específicas) em vez de slug-similarity Druni.
  // Inclui ALL produtos seed (não só os candidates sem image_url), porque
  // queremos sobrescrever os 5 overrides Druni que o user reportou como "péssimas".
  if (DIRECT_MODE) {
    console.log('═══════ Modo DIRECT — usar URLs curadas (Wells preferido) ═══════');
    const direct = [];
    for (const p of PRODUCTS) {
      const url = ALLOWLIST_DIRECT[p.ean];
      if (!url) continue;
      direct.push({ product: p, url });
      console.log(`  ${p.ean} ${p.brand.padEnd(20)} → ${url}`);
    }
    if (DRY_RUN) { console.log('\n[DRY-RUN] Não scraping.'); return; }
    console.log(`\n▶ A scraping ${direct.length} URLs...\n`);

    const browser = await chromium.launch({ headless: !HEADED, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'pt-PT', viewport: { width: 1366, height: 768 },
    });
    await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico}', r => r.abort());
    let ok = 0;
    for (const d of direct) {
      const page = await context.newPage();
      try {
        await page.goto(d.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(1800);
        const imageUrl = await page.evaluate(() => {
          // Tenta og:image primeiro, depois fallback para schema.org Product image
          const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
          if (og) return og;
          try {
            const ldJson = [...document.querySelectorAll('script[type="application/ld+json"]')]
              .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
              .filter(Boolean);
            for (const ld of ldJson) {
              const arr = Array.isArray(ld) ? ld : [ld];
              for (const obj of arr) {
                if (obj['@type'] === 'Product' || obj['@type']?.includes?.('Product')) {
                  const img = obj.image;
                  if (typeof img === 'string') return img;
                  if (Array.isArray(img)) return img[0];
                  if (img?.url) return img.url;
                }
              }
            }
          } catch {}
          return null;
        });
        if (imageUrl) {
          overrides[d.product.ean] = imageUrl;
          ok++;
          console.log(`  ✓ ${d.product.ean} ${imageUrl.slice(0, 90)}`);
        } else {
          console.log(`  ✗ ${d.product.ean} sem imagem em ${d.url.slice(0, 60)}`);
        }
      } catch (e) {
        console.log(`  ✗ ${d.product.ean} ${e.message.slice(0, 60)}`);
      } finally {
        await page.close();
      }
      await new Promise(r => setTimeout(r, 800 + Math.random() * 800));
    }
    await browser.close();
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2));
    console.log(`\n✓ ${ok}/${direct.length} actualizados. Escrito ${OVERRIDES_FILE.replace(ROOT, '.')}`);
    return;
  }

  // Pré-screen: encontrar matches sem scrapar ainda
  console.log('═══════ Matches encontrados ═══════');
  const plans = [];
  for (const p of candidates) {
    let matches;
    if (ALLOWLIST[p.ean]) {
      const allowSlug = ALLOWLIST[p.ean];
      const found = druniUrls.find(u => u.slug === allowSlug);
      matches = found ? [{ ...found, score: 999, _allowlisted: true }] : [];
    } else {
      if (ONLY_ALLOWLIST) { plans.push({ product: p, matches: [] }); continue; }
      matches = findBestMatch(p);
    }
    plans.push({ product: p, matches });
    console.log(`\n${p.ean} | ${p.brand} | ${p.name.slice(0, 50)}`);
    if (matches.length === 0) {
      console.log('  ⚠ sem candidato');
      continue;
    }
    matches.forEach((m, i) => console.log(`  ${i+1}. [${m.score}]${m._allowlisted ? ' ✋' : ''} ${m.slug}`));
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
