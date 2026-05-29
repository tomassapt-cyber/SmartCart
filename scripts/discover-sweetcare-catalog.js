#!/usr/bin/env node
/**
 * SmartCart — Sweetcare catalog discovery
 * ============================================================
 *
 * Lê o sitemap PT da Sweetcare (https://www.sweetcare.pt/PT-sitemap.xml)
 * e extrai URLs de produto.
 *
 * Padrão de URL produto: ...-p-XXXXXX (slug + suffix com ID)
 * Páginas de marca: /b/...
 * Categorias: /c/...
 *
 * Output: data/catalog/sweetcare-urls.json
 *
 * Cache-first: se sweetcare-urls.json tem < 48h, reutiliza sem re-fetch.
 * Razão: WAF da Sweetcare bloqueia IPs do GitHub Actions (Azure eastus).
 *
 * Uso:
 *   node scripts/discover-sweetcare-catalog.js
 *   node scripts/discover-sweetcare-catalog.js --debug
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(OUT_DIR, 'sweetcare-urls.json');

const SITEMAP_URL = 'https://www.sweetcare.pt/PT-sitemap.xml';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const DEBUG = !!args.debug;

// ─── Heurísticas de categorização (slug-based) ─────────────────
function categorize(url) {
  const slug = url.replace(/^https?:\/\/[^/]+\//, '').toLowerCase();

  // FRAGRANCE
  if (/\b(eau-de-parfum|eau-de-toilette|eau-de-cologne|edp|edt|colonia|cologne|perfume|fragrance)\b/.test(slug)) return 'fragrance';

  // SKINCARE — keywords abrangentes + marcas-tipo skincare
  if (/\b(serum|sérum|creme-rosto|creme-facial|emulsao|emulsão|tonico|tónico|hidratante|esfoliante|mascara-rosto|máscara-rosto|anti-idade|anti-rugas|antimanchas|fluido-facial|hyalu|cicaplast|effaclar|sensibio|niacinamida|retinol|acido-hialuronico|vitamina-c|ampolas|peles-secas|peles-oleosas|peles-mistas|peles-sensiveis|peles-descamativas|peles-acneicas|peles-maduras|olhos)\b/.test(slug)) return 'skincare';
  if (/\b(solar|solares|protetor-solar|protetor|spf|fps|after-sun)\b/.test(slug)) return 'skincare';
  if (/\b(limpeza|tonico|tónico|micel|desmaquilhante|cleanser|toner)\b/.test(slug)) return 'skincare';
  if (/\b(rosto|facial|face)\b/.test(slug) && /\b(creme|gel|locao|loção|serum|sérum|tratamento|cuidado)\b/.test(slug)) return 'skincare';
  if (/\b(cosmelan|despigmentante|melanico|manchas|melasma|pigmentacao|pigmentação)\b/.test(slug)) return 'skincare';
  if (/\b(refirmante|firmador|preenchedor|colageno|colágeno|peptidos|péptidos)\b/.test(slug)) return 'skincare';
  // Marcas tipicamente skincare-only (extra reforço quando keywords falham)
  if (/^(sesderma|mesoestetic|skinceuticals|medik8|alpha-h|paula|drunkelephant|niod|cosrx|laneige|haruharu|isntree|round-lab|some-by-mi|innisfree|klairs|purito|beauty-of-joseon|biologique-recherche|noreva|svr|isispharma|sothys|filorga|institut-esthederm|christian-breton|payot)/.test(slug)) return 'skincare';

  // HAIRCARE
  if (/\b(champo|champô|shampoo|condicionador|conditioner|mascara-capilar|máscara-capilar|amaciador|oleo-cabelo|óleo-cabelo|tratamento-capilar|leave-in|cabelo|kerastase|redken|loreal-professionnel|haircare)\b/.test(slug)) return 'haircare';

  // BODY
  if (/\b(gel-banho|sabonete|leite-corporal|hidratante-corpo|oleo-corpo|óleo-corpo|deodorante|desodorizante|antitranspirante|esfoliante-corpo|corpo-body)\b/.test(slug)) return 'body';

  // MAKEUP
  if (/\b(batom|gloss|lipstick|base-maquilhagem|foundation|po-compacto|pó-compacto|sombra|eyeshadow|delineador|rimel|mascara-pestanas|bronzer|blush|primer|corrector|paleta|maquilhagem)\b/.test(slug)) return 'makeup';

  // BABY
  if (/\b(bebe|bebé|infantil|kids|pediatric|criancas|crianças|baby)\b/.test(slug)) return 'baby';

  return 'other';
}

function isProductUrl(url) {
  // Sweetcare product URL pattern: slug terminado em -p-XXXX
  return /-p-[a-z0-9]+$/i.test(url);
}

// Cache-first: evita re-fetch do sitemap se já temos URLs recentes.
// O WAF da Sweetcare bloqueia IPs Azure (GitHub Actions) a nível TCP.
// sweetcare-urls.json é committed com git add -f, por isso está disponível
// logo após checkout mesmo sem nunca ter corrido nesta máquina.
const CACHE_MAX_AGE_H = 96; // 4 dias — WAF bloqueia GitHub Actions, cache é a única fonte fiável

function isCacheFresh() {
  if (!fs.existsSync(OUT_FILE)) return false;
  try {
    const { discovered_at } = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    if (!discovered_at) return false;
    const ageH = (Date.now() - new Date(discovered_at).getTime()) / 3_600_000;
    return ageH < CACHE_MAX_AGE_H;
  } catch { return false; }
}

function parseSitemap(xml) {
  const entries = [];
  const urlBlocks = xml.match(/<url\b[\s\S]*?<\/url>/gi) || [];
  for (const block of urlBlocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim() || null;
    entries.push({ url: loc, lastmod });
  }
  return entries;
}

async function fetchSitemapWithPlaywright() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    locale: 'pt-PT',
    timezoneId: 'Europe/Lisbon',
    geolocation: { latitude: 38.7169, longitude: -9.1395 },
    permissions: ['geolocation'],
    extraHTTPHeaders: { 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.1' },
  });
  await ctx.addCookies([
    { name: 'country',  value: 'PT',    domain: '.sweetcare.pt', path: '/' },
    { name: 'currency', value: 'EUR',   domain: '.sweetcare.pt', path: '/' },
    { name: 'locale',   value: 'pt_PT', domain: '.sweetcare.pt', path: '/' },
  ]);
  const page = await ctx.newPage();
  try {
    await page.goto(SITEMAP_URL, { waitUntil: 'load', timeout: 60_000 });
    return await page.content();
  } finally {
    await browser.close();
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ── Cache hit: reutiliza sweetcare-urls.json sem tocar no sitemap ──
  if (isCacheFresh()) {
    const cached = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    const ageH = ((Date.now() - new Date(cached.discovered_at).getTime()) / 3_600_000).toFixed(1);
    console.log(`✓ Cache válido (${ageH}h, max ${CACHE_MAX_AGE_H}h) — discovered_at: ${cached.discovered_at}`);
    console.log(`  ${cached.total} URLs filtradas. A reutilizar sem re-fetch do sitemap.\n`);
    console.log('═══════ Sweetcare — categorias (cache) ═══════');
    Object.entries(cached.by_category).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
      console.log(` ${cat.padEnd(15)} ${n}`);
    });
    console.log(` ${'TOTAL'.padEnd(15)} ${cached.total}\n`);
    console.log(`💾 Output: ${OUT_FILE.replace(ROOT, '.')} (não modificado)`);
    console.log(`\nPróximo: node scripts/scrape-sweetcare-catalog.js`);
    return;
  }

  // ── Cache miss / stale: tenta fetch via Playwright ────────────────
  console.log(`📥 Fetching ${SITEMAP_URL} via Playwright...`);
  let xml;
  try {
    xml = await fetchSitemapWithPlaywright();
    console.log(`✓ Sitemap baixado (${(xml.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.error(`Sitemap fetch falhou: ${err.message}`);
    // Fallback: usa cache stale se existir (melhor que falhar o job inteiro)
    if (fs.existsSync(OUT_FILE)) {
      const cached = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      console.warn(`⚠ A usar cache stale (${cached.discovered_at}) como fallback.`);
      console.log(`  ${cached.total} URLs.\n`);
      console.log(`Próximo: node scripts/scrape-sweetcare-catalog.js`);
      return;
    }
    throw err;
  }

  const allEntries = parseSitemap(xml);
  console.log(`✓ ${allEntries.length} URLs totais\n`);

  // Sanity check: sitemap real tem milhares de URLs.
  // Se devolveu <100 provavelmente o WAF bloqueou e devolveu uma página HTML.
  if (allEntries.length < 100) {
    console.error(`✗ Sitemap inválido ou WAF bloqueou (${allEntries.length} entradas < 100 mínimo).`);
    if (fs.existsSync(OUT_FILE)) {
      const cached = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      console.warn(`⚠ A usar cache stale (${cached.discovered_at}) como fallback.`);
      console.log(`  ${cached.total} URLs.\n`);
      console.log(`Próximo: node scripts/scrape-sweetcare-catalog.js`);
      return;
    }
    throw new Error(`Sitemap devolveu apenas ${allEntries.length} entradas — abortando.`);
  }

  // Filter to products + categorize
  const products = allEntries
    .filter(e => isProductUrl(e.url))
    .map(e => {
      const slug = e.url.replace(/^https?:\/\/[^/]+\//, '');
      return { ...e, slug, category: categorize(e.url) };
    });

  const byCategory = {};
  for (const p of products) byCategory[p.category] = (byCategory[p.category] || 0) + 1;

  console.log('═══════ Sweetcare — categorias detectadas ═══════');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
    console.log(` ${cat.padEnd(15)} ${n}`);
  });
  console.log(` ${'TOTAL'.padEnd(15)} ${products.length}\n`);

  // Filter to target categories (skincare, haircare, fragrance, body, makeup)
  const targetCategories = ['skincare', 'haircare', 'fragrance', 'body', 'makeup'];
  const filtered = products.filter(p => targetCategories.includes(p.category));
  console.log(`🎯 Filtro [${targetCategories.join(',')}]: ${filtered.length} produtos retidos\n`);

  // Order: por categoria + recência
  filtered.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return (b.lastmod || '').localeCompare(a.lastmod || '');
  });

  const output = {
    discovered_at: new Date().toISOString(),
    source: SITEMAP_URL,
    target_categories: targetCategories,
    total: filtered.length,
    by_category: targetCategories.reduce((acc, c) => ({ ...acc, [c]: byCategory[c] || 0 }), {}),
    urls: filtered,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  if (DEBUG) {
    console.log('\n═══════ DEBUG: primeiros 5 "other" ═══════');
    products.filter(p => p.category === 'other').slice(0, 5).forEach(p => console.log('   ', p.url));
  }

  console.log(`💾 Output: ${OUT_FILE.replace(ROOT, '.')}`);
  console.log(`\nPróximo: node scripts/scrape-sweetcare-catalog.js`);
})().catch(err => { console.error('Fatal:', err); process.exit(1); });
