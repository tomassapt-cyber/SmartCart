#!/usr/bin/env node
/**
 * SmartCart — Wells full catalog discovery
 * ============================================================
 *
 * Lê o sitemap oficial da Wells e extrai todos os URLs de produto.
 * Classifica por categoria heurística (skincare / fragrance / haircare /
 * lentes / suplementos / etc.) usando o slug.
 *
 * Output:
 *   data/catalog/wells-urls.json
 *   {
 *     discovered_at: "2026-05-19T...",
 *     total: 4823,
 *     by_category: { skincare: 1234, fragrance: 567, ... },
 *     urls: [
 *       { url, slug, productId, category, lastmod, priority },
 *       ...
 *     ]
 *   }
 *
 * Uso:
 *   node scripts/discover-wells-catalog.js
 *   node scripts/discover-wells-catalog.js --filter=skincare,fragrance,body
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(OUT_DIR, 'wells-urls.json');

const SITEMAP_URL = 'https://wells.pt/sitemap_0-product.xml';

// CLI
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);
const FILTER = args.filter ? String(args.filter).split(',').map(s => s.trim()) : null;

// Heurística de categoria a partir do slug
// (Wells usa slugs descritivos tipo "creme-rosto-niveia-300ml-xxxx")
function categorize(slug) {
  const s = slug.toLowerCase();
  if (/\b(lentes-de-contacto|lente|aire-optix|dailies|biofinity|acuvue)\b/.test(s)) return 'lentes';
  if (/\b(eau-de-parfum|eau-de-toilette|perfume|cologne|eau-fraiche|fragrance|fragrancia|edp|edt)\b/.test(s)) return 'fragrance';
  if (/\b(creme|serum|sérum|emulsao|emulsão|tonico|tónico|mascara|máscara|esfoliante|hidratante|protector-solar|protetor-solar|spf|anti-idade|anti-rugas|antimanchas|mineral-89|effaclar|hyalu|cicaplast|anthelios|fusion-water)\b/.test(s)) return 'skincare';
  if (/\b(champo|champô|shampoo|condicionador|conditioner|mascara-capilar|máscara-capilar|oleo-cabelo|óleo-cabelo|tonico-capilar|spray-capilar|amaciador)\b/.test(s)) return 'haircare';
  if (/\b(corpo|body|locao|loção|leite-corporal|gel-banho|sabonete|esfoliante-corporal|deodorant|desodorizante|antitranspirante|olio-corpo)\b/.test(s)) return 'body';
  if (/\b(maquilhagem|batom|gloss|lipstick|base-maquilhagem|foundation|po-compacto|pó-compacto|sombra|eyeshadow|delineador|eyeliner|rimel|mascara-pestanas|máscara-pestanas|bronzer|blush|primer)\b/.test(s)) return 'makeup';
  if (/\b(suplemento|vitamina|magnesio|magnésio|colagenio|colagénio|omega|whey|probiotico|probiótico|melatonina|biotina)\b/.test(s)) return 'supplements';
  if (/\b(escova-dentes|escova-dental|pasta-dentes|dentifrico|dentífrico|fio-dental|colutorio|colutório|enxaguante-bucal)\b/.test(s)) return 'oral';
  if (/\b(fralda|fraldas|toalhitas-bebe|biberao|biberão|tetina|chupeta|bebé|bebe|infantil|kids)\b/.test(s)) return 'baby';
  if (/\b(termometro|termómetro|tensiometro|tensiómetro|pulseira|joelheira|cinta-lombar|ortese|órtese|adesivo|penso|gaze|seringa)\b/.test(s)) return 'medical';
  if (/\b(higienico|higiénico|tampao|tampão|penso-higienico|copa-menstrual|protetor-diario|protetor-diário)\b/.test(s)) return 'feminine';
  return 'other';
}

async function fetchSitemap() {
  const resp = await fetch(SITEMAP_URL);
  if (!resp.ok) throw new Error(`Sitemap fetch failed: HTTP ${resp.status}`);
  return await resp.text();
}

// Parser XML simples (apenas extrai <url><loc>, <lastmod>, <priority>)
function parseSitemap(xml) {
  const entries = [];
  const urlBlocks = xml.match(/<url\b[\s\S]*?<\/url>/gi) || [];
  for (const block of urlBlocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1]?.trim() || null;
    const priority = block.match(/<priority>([^<]+)<\/priority>/i)?.[1]?.trim() || null;
    // Parse slug + productId do URL Wells: ".../<slug>-<id>.html"
    const m = loc.match(/\/([^/]+)-(\d+)\.html$/);
    if (!m) continue; // só URLs de produto canónico
    entries.push({
      url: loc,
      slug: m[1],
      productId: m[2],
      category: categorize(m[1]),
      lastmod,
      priority: priority ? parseFloat(priority) : null,
    });
  }
  return entries;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`📥 Fetching ${SITEMAP_URL}...`);
  const xml = await fetchSitemap();
  console.log(`✓ Sitemap baixado (${(xml.length / 1024).toFixed(0)} KB)`);

  let entries = parseSitemap(xml);
  console.log(`✓ ${entries.length} URLs de produto extraídas\n`);

  // Filtro opcional por categoria
  if (FILTER && FILTER.length > 0) {
    const before = entries.length;
    entries = entries.filter(e => FILTER.includes(e.category));
    console.log(`📋 Filtro aplicado [${FILTER.join(',')}]: ${entries.length}/${before} mantidas\n`);
  }

  // Contagens por categoria
  const byCategory = {};
  for (const e of entries) byCategory[e.category] = (byCategory[e.category] || 0) + 1;

  // Ordenar: primeiro por categoria, depois por lastmod desc
  entries.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return (b.lastmod || '').localeCompare(a.lastmod || '');
  });

  const output = {
    discovered_at: new Date().toISOString(),
    source: SITEMAP_URL,
    total: entries.length,
    by_category: byCategory,
    urls: entries,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

  console.log('═══════ Resumo por categoria ═══════');
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  for (const [cat, n] of sorted) {
    console.log(` ${cat.padEnd(15)} ${n.toString().padStart(5)}`);
  }
  console.log(` ${''.padEnd(15)} ─────`);
  console.log(` ${'TOTAL'.padEnd(15)} ${entries.length.toString().padStart(5)}`);
  console.log(`\n💾 Output: ${OUT_FILE.replace(ROOT, '.')}`);
  console.log(`\nPróximo: node scripts/scrape-wells-catalog.js [--category=skincare] [--limit=100]`);
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
