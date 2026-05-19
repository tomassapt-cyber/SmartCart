#!/usr/bin/env node
/**
 * SmartCart — Druni catalog discovery
 * ============================================================
 *
 * Lê o sitemap oficial da Druni (https://www.druni.pt/media/sitemap/sitemap_pt.xml)
 * e extrai todos os URLs de produto, filtrando para as categorias relevantes:
 *
 *   - perfumery (perfumes, EDP, EDT)
 *   - skincare
 *   - haircare
 *
 * Druni usa sitemap flat com categorias E produtos misturados. Filtramos
 * heuristicamente:
 *   - Produtos: slug longo, multi-hífens, no /perfumes|skincare|cabelo|...
 *   - Categorias: paths curtos sem múltiplos hífens
 *
 * Output: data/catalog/druni-urls.json
 *
 * Uso:
 *   node scripts/discover-druni-catalog.js
 *   node scripts/discover-druni-catalog.js --categories=perfumery,skincare
 *   node scripts/discover-druni-catalog.js --debug    # mostra ambiguous URLs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(OUT_DIR, 'druni-urls.json');

const SITEMAP_URL = 'https://www.druni.pt/media/sitemap/sitemap_pt.xml';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const FILTER = args.categories ? String(args.categories).split(',').map(s => s.trim()) : null;
const DEBUG = !!args.debug;

// ─── Heurísticas de categorização (slug-based) ─────────────────────────
// Druni URL pattern típico:
//   /eau-de-parfum-yves-saint-laurent-black-opium      → fragrance (mulher)
//   /chanel-allure-eau-de-toilette-homem              → fragrance (homem)
//   /serum-vichy-mineral-89                            → skincare
//   /champo-kerastase-bain-satin                       → haircare
//   /solares-ladival-protetor-spf-50                   → solar (skincare)
function categorize(url) {
  const u = url.toLowerCase();
  const path = u.replace(/^https?:\/\/[^/]+/, '');
  const slug = path.replace(/^\//, '').split('?')[0];

  if (!slug || slug.length < 10) return 'category-page'; // /perfumes, /homem etc.

  // PERFUMARIA
  if (/\b(eau-de-parfum|eau-de-toilette|eau-de-cologne|eau-fraiche|edp|edt|colonia|cologne|perfume|fragrance)\b/.test(slug)) return 'fragrance';
  if (slug.startsWith('perfumes/') || slug === 'perfumes' || slug.startsWith('perfume-')) return 'fragrance';

  // SKINCARE
  if (/\b(serum|sérum|creme-rosto|creme-facial|emulsao|emulsão|tonico|tónico|hidratante|esfoliante|mascara-rosto|máscara-rosto|anti-idade|anti-rugas|antimanchas|antimanchas|fluido-facial|mineral-89|effaclar|hyalu|cicaplast|anthelios|fusion-water|sensibio|cetaphil|niacinamida|retinol|acido-hialuronico|ácido-hialurónico|vitamina-c|ampolas)\b/.test(slug)) return 'skincare';
  if (/\b(solar|solares|protetor-solar|protetor-solar|spf|fps|after-sun)\b/.test(slug)) return 'skincare';

  // HAIRCARE
  if (/\b(champo|champô|shampoo|condicionador|conditioner|mascara-capilar|máscara-capilar|amaciador|oleo-cabelo|óleo-cabelo|tratamento-capilar|leave-in|cabelo|kerastase|redken|loreal-professionnel)\b/.test(slug)) return 'haircare';

  // BODY (excluímos por enquanto, mas marcamos)
  if (/\b(gel-banho|sabonete|leite-corporal|hidratante-corpo|oleo-corpo|óleo-corpo|deodorante|desodorizante|antitranspirante|esfoliante-corpo)\b/.test(slug)) return 'body';

  // MAKEUP (excluímos)
  if (/\b(batom|gloss|lipstick|base-maquilhagem|foundation|po-compacto|pó-compacto|sombra|eyeshadow|delineador|rimel|mascara-pestanas|bronzer|blush|primer|corrector|paleta)\b/.test(slug)) return 'makeup';

  // INFANTIL / BEBÉ
  if (/\b(bebe|bebé|infantil|kids|pediatric|criancas|crianças)\b/.test(slug)) return 'baby';

  // OUTROS
  return 'other';
}

function isProductUrl(url) {
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  const slug = path.replace(/^\//, '').split('?')[0];
  if (!slug) return false;
  // Categorias têm slugs curtos, sem hífens ou com 1
  // Produtos típicos têm ≥2 hífens
  const hyphenCount = (slug.match(/-/g) || []).length;
  if (hyphenCount < 2) return false;
  // E têm tipicamente >25 chars
  if (slug.length < 25) return false;
  // Excluir URLs com extensão de imagem ou outras
  if (/\.(jpg|jpeg|png|webp|pdf|gif)$/i.test(slug)) return false;
  // Excluir URLs de paginação ou filtros
  if (slug.includes('?') || slug.includes('=')) return false;
  return true;
}

async function fetchSitemap() {
  const resp = await fetch(SITEMAP_URL);
  if (!resp.ok) throw new Error(`Sitemap fetch failed: HTTP ${resp.status}`);
  return await resp.text();
}

function parseSitemap(xml) {
  const entries = [];
  const urlBlocks = xml.match(/<url\b[\s\S]*?<\/url>/gi) || [];
  for (const block of urlBlocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim() || null;
    const priority = block.match(/<priority>([^<]+)<\/priority>/i)?.[1]?.trim() || null;
    entries.push({ url: loc, lastmod, priority: priority ? parseFloat(priority) : null });
  }
  return entries;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`📥 Fetching ${SITEMAP_URL}...`);
  const xml = await fetchSitemap();
  console.log(`✓ Sitemap baixado (${(xml.length / 1024).toFixed(0)} KB)`);

  let entries = parseSitemap(xml);
  console.log(`✓ ${entries.length} URLs totais no sitemap\n`);

  // Filter to products + categorize
  const products = entries
    .filter(e => isProductUrl(e.url))
    .map(e => {
      const cat = categorize(e.url);
      const slug = e.url.replace(/^https?:\/\/[^/]+\//, '').split('?')[0];
      return { ...e, slug, category: cat };
    });

  const byCategory = {};
  for (const p of products) byCategory[p.category] = (byCategory[p.category] || 0) + 1;

  console.log('═══════ Catálogo Druni — todas categorias detectadas ═══════');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
    console.log(` ${cat.padEnd(15)} ${n}`);
  });
  console.log(` ${'TOTAL'.padEnd(15)} ${products.length}\n`);

  // Filter to user-requested categories (default: skincare, haircare, fragrance)
  const targetCategories = FILTER || ['skincare', 'haircare', 'fragrance'];
  const filtered = products.filter(p => targetCategories.includes(p.category));
  console.log(`🎯 Filtro [${targetCategories.join(',')}]: ${filtered.length} produtos retidos\n`);

  // Order: por categoria + recência (lastmod desc)
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
    console.log('\n═══════ DEBUG: primeiros 5 "other" para inspecionar ═══════');
    products.filter(p => p.category === 'other').slice(0, 5).forEach(p => {
      console.log('   ', p.url);
    });
  }

  console.log(`💾 Output: ${OUT_FILE.replace(ROOT, '.')}`);
  console.log(`\nPróximo: node scripts/scrape-druni-catalog.js [--category=skincare] [--limit=50]`);
})().catch(err => { console.error('Fatal:', err); process.exit(1); });
