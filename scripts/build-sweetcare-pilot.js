#!/usr/bin/env node
/**
 * Constrói data/inventory/sweetcare.json a partir das URLs descobertas
 * via WebFetch nas brand pages de La Roche-Posay, CeraVe, Vichy, Bioderma.
 *
 * Limitação: PDPs não foram fetched individualmente (quota WebFetch).
 * → Fase 1 (Discovery) → preenchemos url + sku_loja_id + nome_raw + marca_raw
 *   extraídos do URL slug.
 * → Fase 2 (EAN + preço) fica pendente para corrida em VM com proxies
 *   residenciais que execute scripts/discover-inventory.js sem rate-limit.
 */
const fs = require('fs');
const path = require('path');

const OUT_PATH = path.resolve(__dirname, '..', 'data', 'inventory', 'sweetcare.json');
if (!fs.existsSync(path.dirname(OUT_PATH))) fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

const RAW_URLS = {
  'la-roche-posay': [
    'https://www.sweetcare.pt/pt/la-roche-posay-cicaplast-b5-serum-ultra-reparador-p-019328rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-pele-lesada-cicatrizacao-cicaplast-p-001957rp?st=02',
    'https://www.sweetcare.pt/pt/la-roche-posay-effaclar-locao-tonica-adstringente-microexfoliante-peles-oleosas-p-001932rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-hyalu-b5-creme-antienvelhecimento-rugas-p-007219rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-hyalu-b5-serum-antienvelhecimento-anti-rugas-p-007214rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-anthelios-shaka-fluido-sem-perfume-spf50-p-009688rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-effaclar-m-gel-espuma-purificante-p-019342rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-effaclar-hidratacao-pele-oleosa-matificante-p-001939rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-lipikar-hidratacao-corpo-peles-secas-p-001963rp?st=02',
    'https://www.sweetcare.pt/pt/la-roche-posay-pure-vitamin-c12-serum-antioxidante-p-009981rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-cicaplast-maos-p-001959rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-serum-corretor-effaclar-anti-idade-pele-oleosa-acne-p-005861rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-retinol-b3-serum-anti-idade-p-013651rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-anthelios-uvmune-400-fluido-antimanchas-p-022877rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-cicaplast-b5-spf50-reparador-apaziguante-protetor-antimarcas-p-005845rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-effaclar-m-p-018812rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-hyalu-b5-contorno-olhos-anti-rugas-p-008495rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-pele-lesada-cicatrizacao-cicaplast-p-001957rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-toleriane-sensitive-rico-prebiotico-pele-seca-p-008493rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-respectissime-desmaquilhante-olhos-maquilhagem-waterproof-p-001890rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-mela-b3-gel-micro-peeling-clarificante-antimanchas-p-020059rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-nutritic-intense-rico-cuidado-nutritivo-peles-muito-secas-p-001879rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-mela-b3-serum-concentrado-antimanchas-p-020057rp?st=01',
    'https://www.sweetcare.pt/pt/la-roche-posay-toleriane-dermallergo-contorno-olhos-p-015152rp?st=01',
  ],
  'cerave': [
    'https://www.sweetcare.pt/pt/cerave-gel-espuma-limpeza-rosto-corpo-pele-normal-oleosa-p-007772ve?st=02',
    'https://www.sweetcare.pt/pt/cerave-creme-hidratante-rosto-corpo-pele-seca-muito-seca-p-007777ve?st=02',
    'https://www.sweetcare.pt/pt/cerave-moisturizing-lotion-face-body-body-dry-skin-p-007778ve?st=02',
    'https://www.sweetcare.pt/pt/cerave-skin-renewing-creme-facial-peptidos-p-027135ve?st=01',
    'https://www.sweetcare.pt/pt/cerave-creme-hidratante-rosto-corpo-pele-seca-muito-seca-p-007777ve?st=03',
    'https://www.sweetcare.pt/pt/cerave-acne-gel-limpeza-controlo-imperfeicoes-p-016806ve?st=03',
    'https://www.sweetcare.pt/pt/cerave-moisturizing-lotion-face-body-body-dry-skin-p-007778ve?st=05',
    'https://www.sweetcare.pt/pt/cerave-creme-hidratante-intensivo-p-027218ve?st=01',
    'https://www.sweetcare.pt/pt/cerave-creme-hidratante-rosto-corpo-pele-seca-muito-seca-p-007777ve?st=07',
    'https://www.sweetcare.pt/pt/cerave-creme-hidratante-limpeza-rosto-corpo-pele-normal-seca-p-007773ve?st=02',
    'https://www.sweetcare.pt/pt/cerave-sa-smoothig-cream-hidratante-acido-salicilico-p-011220ve?st=03',
    'https://www.sweetcare.pt/pt/cerave-locao-facial-hidratante-pele-normal-seca-p-007780ve?st=01',
    'https://www.sweetcare.pt/pt/cerave-locao-hidratante-intensiva-pele-muito-seca-prurido-p-022604ve?st=01',
    'https://www.sweetcare.pt/pt/cerave-acne-serum-retinol-antimarcas-p-016808ve?st=01',
    'https://www.sweetcare.pt/pt/cerave-gel-espuma-limpeza-rosto-corpo-pele-normal-oleosa-p-007772ve?st=01',
    'https://www.sweetcare.pt/pt/cerave-sa-smoothig-limpeza-esfoliante-acido-salicilico-p-011219ve?st=02',
    'https://www.sweetcare.pt/pt/cerave-creme-hidratante-rosto-corpo-pele-seca-muito-seca-p-007777ve?st=09',
    'https://www.sweetcare.pt/pt/cerave-sa-smoothig-limpeza-esfoliante-acido-salicilico-p-011219ve?st=01',
    'https://www.sweetcare.pt/pt/cerave-oleo-espuma-limpeza-hidratante-p-015073ve?st=01',
    'https://www.sweetcare.pt/pt/cerave-creme-contorno-olhos-reparador-p-007781ve?st=01',
    'https://www.sweetcare.pt/pt/cerave-creme-espuma-hidratante-limpeza-pele-normal-p-013663ve?st=04',
    'https://www.sweetcare.pt/pt/cerave-sa-smoothig-cream-hidratante-acido-salicilico-p-011220ve?st=02',
    'https://www.sweetcare.pt/pt/cerave-creme-hidratante-rosto-corpo-pele-seca-muito-seca-p-007777ve?st=01',
    'https://www.sweetcare.pt/pt/cerave-creme-hidratante-limpeza-rosto-corpo-pele-normal-seca-p-007773ve?st=05',
  ],
  'vichy': [
    'https://www.sweetcare.pt/pt/vichy-desodorizante-antitranspirante-48h-pele-sensivel-ou-depilada-p-002115vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-liftactiv-flexilift-teint-base-maquilhagem-anti-idade-p-002088vy?st=03',
    'https://www.sweetcare.pt/pt/vichy-mineral-89-creme-ligeiro-p-017766vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-clinical-control-96h-antitranspirante-p-015366vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-anti-transpirante-48h-anti-manchas-brancas-amarelas-p-002116vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-homme-roll-anti-transpirante-72h-p-002476vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-stress-resist-antitranspirante-intensivo-72h-transpiracao-excessiva-p-002113vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-mineral-89-concentrado-hidratacao-p-006652vy?st=03',
    'https://www.sweetcare.pt/pt/vichy-liftactiv-collagen-specialist-16-creme-dia-p-008345vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-normaderm-phytosolution-gel-limpeza-purificante-p-009986vy?st=02',
    'https://www.sweetcare.pt/pt/vichy-capital-soleil-uv-clear-spf50-fluido-aquoso-anti-imperfeicoes-p-017660vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-dermablend-fluido-maquilhagem-corretor-spf28-elevada-cobertura-p-002127vy?st=02',
    'https://www.sweetcare.pt/pt/vichy-liftactiv-collagen-specialist-16-serum-p-022903vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-liftactiv-pigment-specialist-b3-cuidado-olhos-p-022904vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-antitranspirante-48h-transpiracao-intensa-p-002100vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-mineral-89-fracoes-probioticos-serum-p-014550vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-liftactiv-collagen-specialist-16-contorno-olhos-antienvelhecimento-p-020060vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-liftactiv-supreme-ha-epidermic-filler-serum-p-013509vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-normaderm-phytosolution-hidratante-pele-oleosa-acneica-p-009984vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-capital-soleil-uv-age-fluido-aquoso-p-014277vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-neovadiol-rose-platinium-noite-pele-muito-madura-p-011238vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-neovadiol-rose-platinium-pele-muito-madura-p-007118vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-liftactiv-pigment-specialist-b3-cream-p-017336vy?st=01',
    'https://www.sweetcare.pt/pt/vichy-liftactiv-flexilift-teint-base-maquilhagem-anti-idade-p-002088vy?st=04',
  ],
  'bioderma': [
    'https://www.sweetcare.pt/pt/bioderma-atoderm-creme-corpo-pele-seca-sensivel-p-000296bd?st=03',
    'https://www.sweetcare.pt/pt/bioderma-node-ds-shampoo-dermatite-seborreica-p-000225bd?st=10',
    'https://www.sweetcare.pt/pt/bioderma-sensibio-defensive-serum-p-017330bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-sensibio-ar-creme-anti-vermelhidao-p-000239bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-photoderm-aquafluide-spf50-protetor-solar-rosto-p-015297bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-hydrabio-light-creme-hidratante-pele-desidratada-normal-mista-p-005442bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-photoderm-ar-spf50-protetor-solar-anti-vermelhidao-cor-p-015312bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-sensibio-pele-sensivel-intolerante-vermelhidao-rosto-ar-bb-cream-p-000241bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-photoderm-max-spf50-compacto-solar-cor-p-000268bd?st=06',
    'https://www.sweetcare.pt/pt/bioderma-pigmentbio-night-renewer-cuidado-noite-antimanchas-p-012503bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-sensibio-ds-creme-calmante-purificante-pele-dermatite-seborreica-p-000245bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-atoderm-oleo-duche-nutritivo-anti-irritacoes-p-005989bd?st=02',
    'https://www.sweetcare.pt/pt/bioderma-photoderm-xdefense-ultra-fluid-protetor-solar-p-023603bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-sensibio-pele-sensivel-intolerante-limpeza-h2o-micelar-p-000221bd?st=02',
    'https://www.sweetcare.pt/pt/bioderma-sebium-pele-oleosa-acneica-limpeza-h2o-solucao-micelar-p-000226bd?st=09',
    'https://www.sweetcare.pt/pt/bioderma-photodermercado-cobertura-de-toque-spf50-ecra-de-tinta-mineral-sol-p-015301bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-sensibio-pele-sensivel-intolerante-limpeza-h2o-micelar-p-000221bd?st=03',
    'https://www.sweetcare.pt/pt/bioderma-photoderm-mineral-fluido-spf50-protetor-solar-p-015307bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-atoderm-intensive-eye-cuidado-eczema-palpebra-p-013072bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-sensibio-oleo-limpeza-micelar-p-018364bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-atoderm-oleo-duche-nutritivo-anti-irritacoes-p-005989bd?st=07',
    'https://www.sweetcare.pt/pt/bioderma-photoderm-spf50-leite-ultra-p-015302bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-pigmentbio-areas-sensiveis-p-010239bd?st=01',
    'https://www.sweetcare.pt/pt/bioderma-atoderm-oleo-duche-nutritivo-anti-irritacoes-p-005989bd?st=01',
  ],
};

const BRAND_DISPLAY = {
  'la-roche-posay': 'La Roche-Posay',
  'cerave': 'CeraVe',
  'vichy': 'Vichy',
  'bioderma': 'Bioderma',
};

function parseUrl(url, brandSlug) {
  // /pt/{slug}-p-{code}{prefix}?st={n}
  const m = url.match(/\/pt\/(.+)-p-([a-z0-9]+)\?st=(\d+)$/i);
  if (!m) return null;
  const [, slugRaw, code, variantSt] = m;
  // remover prefixo de marca do slug para ficar com o nome do produto
  const brandPrefix = brandSlug + '-';
  const nameSlug = slugRaw.startsWith(brandPrefix) ? slugRaw.slice(brandPrefix.length) : slugRaw;
  const nameRaw = nameSlug
    .replace(/-/g, ' ')
    .replace(/\b([a-z])/g, c => c.toUpperCase());
  // extrair volume do nome se presente
  const volMatch = nameSlug.match(/(\d+(?:[.,]\d+)?)\s*(ml|g|gr|amp)/i);
  return {
    sku_loja_id: `${code.toUpperCase()}_${variantSt}`,
    canonical_id: code.toUpperCase(),                          // família (mesmo PDP, variantes via st)
    variant_st: variantSt,
    url,
    nome_raw: `${BRAND_DISPLAY[brandSlug]} ${nameRaw}`,
    marca_raw: BRAND_DISPLAY[brandSlug],
    brand_slug_loja: brandSlug,
    volume_ml: volMatch ? parseFloat(volMatch[1].replace(',', '.')) : null,
    volume_unit: volMatch ? volMatch[2].toLowerCase() : null,
    ean: null,                          // Fase 2 — pendente
    categoria_loja: null,               // Fase 2 — pendente
    imagem_url: null,                   // Fase 2 — pendente
    preco_observado: null,              // Fase 2 — pendente
    moeda: 'EUR',
    disponivel: null,
    descoberto_em: '2026-05-13T11:30:00.000Z',
    phase: 1,
  };
}

const skus = [];
const brandStats = {};
for (const [brandSlug, urls] of Object.entries(RAW_URLS)) {
  let count = 0;
  for (const u of urls) {
    const rec = parseUrl(u, brandSlug);
    if (rec) { skus.push(rec); count++; }
  }
  brandStats[brandSlug] = count;
}

// dedup por sku_loja_id (caso haja URLs duplicados)
const seen = new Set();
const dedupSkus = [];
for (const s of skus) {
  if (seen.has(s.sku_loja_id)) continue;
  seen.add(s.sku_loja_id);
  dedupSkus.push(s);
}

// agrupar por canonical_id (famílias PDP)
const canonicalGroups = {};
for (const s of dedupSkus) {
  if (!canonicalGroups[s.canonical_id]) canonicalGroups[s.canonical_id] = [];
  canonicalGroups[s.canonical_id].push(s);
}

const output = {
  version: '1.0',
  loja_id: 'sweetcare',
  loja_nome: 'SweetCare',
  base_url: 'https://www.sweetcare.pt',
  discovered_at: '2026-05-13T11:30:00.000Z',
  strategy_used: 'sitemap+brand-pages (manual via WebFetch — IP do ambiente bloqueado)',
  sample: true,
  pilot_note: 'Piloto com 4 marcas overlap do catálogo SmartCart. Apenas Fase 1 (descoberta de URLs + parse do slug). EANs, preços e imagens ficam para corrida em VM com IP residencial.',
  stats: {
    brands_scanned: Object.keys(RAW_URLS).length,
    pdps_discovered: dedupSkus.length,
    skus_extracted: dedupSkus.length,
    canonical_families: Object.keys(canonicalGroups).length,
    skus_with_volume: dedupSkus.filter(s => s.volume_ml).length,
    skus_with_ean: 0,
    skus_with_price: 0,
    coverage_ean: 0,
    coverage_price: 0,
    note: 'Fase 1 only — EAN/preço/imagem requerem PDP fetch (Fase 2).',
  },
  brand_breakdown: brandStats,
  canonical_families_breakdown: Object.entries(canonicalGroups)
    .map(([cid, group]) => ({ canonical_id: cid, variants: group.length, sample_name: group[0].nome_raw }))
    .sort((a, b) => b.variants - a.variants)
    .slice(0, 10),
  skus: dedupSkus,
  failures: [],
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
console.log(`✔ ${OUT_PATH}`);
console.log(`  ${dedupSkus.length} SKUs · ${Object.keys(canonicalGroups).length} famílias canónicas`);
console.log(`  por marca:`, brandStats);
console.log(`  top famílias com mais variantes:`,
  Object.entries(canonicalGroups).filter(([,g])=>g.length>1).map(([c,g])=>`${c}=${g.length}`).slice(0,5).join(' '));
