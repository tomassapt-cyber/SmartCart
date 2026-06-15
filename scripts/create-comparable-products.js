#!/usr/bin/env node
/**
 * GirlMath — v2: criar produtos COMPARÁVEIS em falta
 * ============================================================
 *
 * Os integradores v1 só ENRIQUECEM produtos existentes; descartam produtos
 * que ainda não temos. Este passo recupera os que VALEM: EANs que aparecem
 * em >=2 das nossas lojas (logo há comparação real) mas não estão no seed.
 *
 * Para cada EAN novo com oferta em >=MIN_STORES lojas:
 *   • cria o produto (nome mais completo, marca derivada, categoria do scrape
 *     ou detectada por keywords, imagem de uma oferta);
 *   • adiciona as ofertas dessas lojas (upsert idempotente por EAN).
 *
 * Lê todos os data/catalog/*-full.json (fonte de verdade dos scrapes).
 * Idempotente: se o produto já existe, só garante as ofertas. NÃO toca em
 * produtos/ofertas existentes além de (re)upsert por EAN.
 *
 * Uso:
 *   node scripts/create-comparable-products.js [--dry-run] [--min=2]
 *   (depois corre inject-seed-into-demo.js — ou usa --inject)
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { displayBrand, extractVolumeMl } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY = !!args['dry-run'];
const MIN_STORES = args.min ? parseInt(args.min, 10) : 2;
const DO_INJECT = !!args.inject;

const isRealEan = e => /^\d{12,14}$/.test(e || '');
const load = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

// Detecção de categoria por keywords no nome (fallback quando o scrape não traz)
function detectCategory(name, scraped) {
  if (scraped) {
    const s = scraped.toLowerCase();
    if (/capilar|cabelo|champ|shampoo|condicionador|anti.queda|anticaspa/.test(s)) return 'hair';
    if (/corpo|body|banho|m[ãa]os|p[ée]s|higiene.[íi]ntima|desodoriz/.test(s)) return 'body';
    if (/rosto|facial|olhos|s[ée]rum|hidrata|solar|limpeza|anti.idade|anti.rugas/.test(s)) return 'skincare';
  }
  const n = (name || '').toLowerCase();
  if (/champ[ôo]|shampoo|condicionador|m[áa]scara capilar|anti.?queda|anticaspa|laca|styling/.test(n)) return 'hair';
  if (/gel de banho|gel.duche|sabonete|loç[ãa]o corporal|creme de m[ãa]os|creme de p[ée]s|desodoriz|deo |corpo|body/.test(n)) return 'body';
  // skincare = a maioria da dermo-cosmética (creme, sérum, loção, água micelar, solar, etc.)
  return 'skincare';
}

function bestName(infos) {
  // nome mais "limpo": preferir o mais comprido que não tenha lixo, capado a 90 chars
  return infos.map(i => (i.name || '').trim()).filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] || null;
}

(function main() {
  const seed = load(SEED);
  if (!seed?.products) { console.error('✗ seed inválido'); process.exit(1); }
  const seedEans = new Set(seed.products.map(p => p.ean));

  // store_products por slug (garante grupos)
  const spBySlug = {};
  for (const g of seed.store_products) spBySlug[g.store_slug] = g;

  // 1. Ler todos os catálogos → ean → { stores: { slug: offer } }
  // Nome do ficheiro NEM SEMPRE = slug da loja. Mapear os que diferem.
  const SLUG_MAP = { lojafarmacia: 'loja-farmacia', pharmagdd: 'pharma-gdd' };
  const files = fs.readdirSync(CATALOG_DIR).filter(f => /-full\.json$/.test(f));
  const eanMap = {};   // ean -> { stores: Map(slug->offer), infos: [] }
  let catStores = 0;
  for (const f of files) {
    const rawSlug = f.replace('-full.json', '');
    const slug = SLUG_MAP[rawSlug] || rawSlug;
    const d = load(path.join(CATALOG_DIR, f));
    if (!d?.products) continue;
    const ok = d.products.filter(p => p.status === 'ok' && isRealEan(p.ean) && p.price > 0 && p.name);
    if (ok.length) catStores++;
    for (const p of ok) {
      const m = eanMap[p.ean] || (eanMap[p.ean] = { stores: new Map(), infos: [], scraped_at: d.scraped_at });
      if (!m.stores.has(slug)) m.stores.set(slug, p);   // 1 oferta por loja (a primeira/headline)
      m.infos.push(p);
    }
  }

  // 2. Candidatos: EAN novo (não no seed) com oferta em >= MIN_STORES lojas
  const candidates = Object.entries(eanMap).filter(([ean, m]) => !seedEans.has(ean) && m.stores.size >= MIN_STORES);
  console.log(`📦 Catálogos lidos: ${catStores} lojas`);
  console.log(`🆕 EANs novos com oferta em >=${MIN_STORES} lojas: ${candidates.length}`);

  const catCount = {};
  let added = 0, offersAdded = 0;
  const addedC = { value: 0 }, updatedC = { value: 0 };

  for (const [ean, m] of candidates) {
    const infos = m.infos;
    const name = bestName(infos);
    if (!name) continue;
    const withBrand = infos.find(i => i.brand) || infos[0];
    let brand = displayBrand(withBrand.brand);   // displayBrand recebe a STRING da marca
    if (!brand) {                                 // sem marca no scrape → 1º token do nome
      const first = (name.split(/\s+/)[0] || '').trim();
      brand = first.length >= 2 ? first : null;
    }
    const scrapedCat = (infos.find(i => i.category) || {}).category || null;
    const category = detectCategory(name, scrapedCat);
    const image_url = (infos.find(i => i.image_url) || {}).image_url || null;
    catCount[category] = (catCount[category] || 0) + 1;

    if (!DRY) {
      seed.products.push({ ean, name, brand, category, image_url });
      seedEans.add(ean);
      // ofertas das lojas
      for (const [slug, off] of m.stores) {
        let g = spBySlug[slug];
        if (!g) { g = { store_slug: slug, items: [] }; seed.store_products.push(g); spBySlug[slug] = g; }
        const itemByEan = {}; for (const it of g.items) itemByEan[it.ean] = it;
        const r = upsertStoreItem(
          { storeSp: g, itemByEan, addedCounter: addedC, updatedCounter: updatedC },
          ean,
          { name: off.name, price: off.price, url: off.url, in_stock: off.in_stock, variants: off.variants || [], previous_price: off.previous_price || null, scraped_at: off.scraped_at },
          off.scraped_at
        );
        if (r.action === 'added') offersAdded++;
      }
    } else {
      for (const [slug] of m.stores) {} // no-op em dry
    }
    added++;
  }

  console.log(`\n══════ Resultado ══════`);
  console.log(`  Produtos comparáveis criados: ${added}`);
  console.log(`  Ofertas adicionadas:          ${offersAdded}`);
  console.log(`  Por categoria:`, JSON.stringify(catCount));
  if (DRY) { console.log('\n🧪 --dry-run: nada gravado.'); return; }

  fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ seed-bundle.json gravado (${(fs.statSync(SEED).size / 1024 / 1024).toFixed(1)} MB) · ${seed.products.length} produtos`);
  if (DO_INJECT) {
    console.log('▶ inject-seed-into-demo...');
    spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  } else {
    console.log('  → corre: node scripts/inject-seed-into-demo.js');
  }
})();
