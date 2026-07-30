#!/usr/bin/env node
/**
 * CosMath — Integrate Care to Beauty catalog into seed
 * ============================================================
 * Loja 73 (2026-07-30). A maior loja de cosmética portuguesa que faltava:
 * 28.449 produtos no mapa do site PT, 16.119 depois do filtro de beleza.
 *
 * CHAVE DUPLA, o melhor caso possível: o JSON-LD publica gtin (EAN-13 real)
 * E o sku é o CNP de 7 dígitos. Cruzamento forte por EAN, e o apply-cnp-merge
 * junta-a também às farmácias portuguesas que só publicam CNP.
 *
 * PORQUE VALE A PENA (relatório de 40 candidatas, 2026-07-30): não traz marcas
 * dermo novas — traz ESCALA. É o maior bloco de ofertas que uma só integração
 * pode acrescentar, e cobre K-beauty e luxo que as 72 actuais cobrem pouco.
 *
 * ⚠️ LOJA MULTI-PAÍS. O preço depende do prefixo de país no endereço. O scraper
 * só aceita URLs que comecem por https://www.caretobeauty.com/pt/ — sem isso
 * apanharia preços de outra loja e outra moeda. Confirmado no JSON-LD:
 * shippingDetails com addressCountry PT.
 *
 * ⚠️ SEM PREÇOS BARRADOS. Em 8 produtos espalhados pelo catálogo, o preço
 * normal e o promocional vêm SEMPRE iguais — esta loja não pratica desconto
 * anunciado como as farmácias PT fazem. Se a contagem de descontos aparecer a
 * zero, é o comportamento da loja e não uma avaria do scraper.
 *
 * PORTES: 51 euros para envio grátis (CTT, 1-2 dias úteis), valor vindo do
 * relatório de candidatas. NÃO se acrescentou entrada em
 * data/store-shipping.json — nesse ficheiro, uma entrada ausente significa
 * "não verificado", e este valor não foi confirmado por mim na loja.
 *
 * POLÍTICA (igual à do dermis, conservadora):
 *   • Match por EAN real      → enriquece preço/oferta no produto existente.
 *   • Match por fingerprint    → idem; upgrade de EAN sintético → real.
 *   • SEM match + nome dermo   → CRIA produto novo (classifyDermo filtra).
 *
 * NUNCA altera nomes de produtos existentes. Idempotente.
 *
 * Uso:
 *   node scripts/integrate-caretobeauty-catalog.js [--dry-run] [--max=N]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, displayBrand } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');
const { classifyDermo } = require('./lib/dermo-classify');

const ROOT = path.resolve(__dirname, '..');
const FULL = path.join(ROOT, 'data', 'catalog', 'caretobeauty-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const STORE_SLUG = 'caretobeauty';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY_RUN = !!args['dry-run'];
const MAX = args.max ? parseInt(args.max, 10) : Infinity;

function loadJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
const isRealEan = e => /^\d{12,14}$/.test(e || '');

(function main() {
  if (!fs.existsSync(FULL)) { console.error('✗ Não existe', FULL, '\n  Corre: node scripts/scrape-caretobeauty-catalog.js'); process.exit(1); }
  const data = loadJSON(FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!data?.products || !seed?.products) { console.error('✗ Ficheiros inválidos.'); process.exit(1); }

  let sm = data.products.filter(p => p.status === 'ok' && p.price > 0 && (isRealEan(p.ean) || /^\d{7}$/.test(p.cnp || ''))).slice(0, MAX);
  console.log(`📦 caretobeauty: ${data.products.length} entradas · ${sm.length} com EAN real + preço`);
  console.log(`📦 Seed actual:  ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  const eanIndex = {}; const fpIndex = {};
  for (const p of seed.products) { eanIndex[p.ean] = p; const fp = productFingerprint(p); if (fp && !fpIndex[fp]) fpIndex[fp] = p; }

  let sp = seed.store_products.find(g => g.store_slug === STORE_SLUG);
  if (!sp) { sp = { store_slug: STORE_SLUG, items: [] }; seed.store_products.push(sp); }
  if (!seed.stores.some(s => s.slug === STORE_SLUG)) {
    seed.stores.push({
      slug: STORE_SLUG, name: 'Care to Beauty',
      base_url: 'https://www.caretobeauty.com/pt', logo_url: null,
      free_shipping_threshold: 51,
      shipping_zones: { mainland: 3.95, madeira: 3.95, acores: 3.95 },
    });
    console.log('🏬 Loja "Care to Beauty" registada em seed.stores[].');
  }
  const itemByEan = {}; for (const it of sp.items) itemByEan[it.ean] = it;

  let matchedByEan = 0, matchedByFp = 0, upgraded = 0, createdNew = 0, unmatched = 0, added = 0, updated = 0;
  const addedC = { value: 0 }, updatedC = { value: 0 };

  for (const ep of sm) {
    let target = null;
    if (eanIndex[ep.ean]) { target = eanIndex[ep.ean]; matchedByEan++; }
    if (!target) {
      const fp = productFingerprint(ep);
      if (fp && fpIndex[fp]) {
        target = fpIndex[fp]; matchedByFp++;
        if (isRealEan(ep.ean) && !isRealEan(target.ean)) {
          const oldEan = target.ean; target.ean = ep.ean; eanIndex[ep.ean] = target; delete eanIndex[oldEan];
          for (const g of seed.store_products) for (const it of g.items) if (it.ean === oldEan) it.ean = ep.ean;
          upgraded++;
        }
      }
    }
    if (!target) {
      const dermo = classifyDermo(ep.name);
      if (!dermo) { unmatched++; continue; }
      // CNP-only → EAN sintético; o apply-cnp-merge (pós-processo) resgata-o
      // para o EAN real quando outra loja partilha o mesmo CNP.
      const newEan = isRealEan(ep.ean) ? ep.ean : ('caretobeauty-' + (ep.url || '').split('/').pop().replace(/\.html$/, '').slice(0, 50).replace(/[^a-z0-9-]/gi, ''));
      target = { ean: newEan, name: ep.name, brand: displayBrand(ep.brand) || ep.brand || null, category: dermo, image_url: ep.image_url || null, _source: 'caretobeauty-catalog' };
      seed.products.push(target); eanIndex[target.ean] = target;
      const fp = productFingerprint(ep); if (fp && !fpIndex[fp]) fpIndex[fp] = target;
      createdNew++;
    }
    if (!target.image_url && ep.image_url) target.image_url = ep.image_url;
    const r = upsertStoreItem({ storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC }, target.ean, ep, data.scraped_at);
    if (r.action === 'added') added++; else if (r.action === 'merged') updated++;
  }

  console.log('══════ Resumo (caretobeauty) ══════');
  console.log(`  Match por EAN real:        ${matchedByEan}`);
  console.log(`  Match por fingerprint:     ${matchedByFp} (upgrades synth→real: ${upgraded})`);
  console.log(`  Produtos novos (dermo):    ${createdNew}`);
  console.log(`  Sem match (não-dermo):     ${unmatched}`);
  console.log(`  Ofertas caretobeauty:        +${added} novas, ${updated} actualizadas (total ${sp.items.length})`);

  if (DRY_RUN) { console.log('\n🧪 --dry-run: seed NÃO gravado.'); return; }
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ ${SEED_BUNDLE} actualizado (${(fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1)} MB)`);

  const run = (label, scriptArgs) => { console.log(`\n▶ ${label}…`); const r = spawnSync('node', scriptArgs, { cwd: ROOT, stdio: 'inherit' }); if (r.status !== 0) console.warn(`⚠ ${label} falhou — continuar.`); };
  run('dedup-audit', [path.join(ROOT, 'scripts', 'dedup-audit.js'), '--apply']);
  run('dedup-store-url', [path.join(ROOT, 'scripts', 'dedup-store-url.js'), '--apply', '--no-inject']);
  run('normalize-brand-display', [path.join(ROOT, 'scripts', 'normalize-brand-display.js'), '--apply', '--no-inject']);
  run('apply-cnp-merge', [path.join(ROOT, 'scripts', 'apply-cnp-merge.js'), '--apply']);
  run('Re-injectar no demo/index/catalogo', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')]);
  console.log('\n✅ Integração caretobeauty completa.');
})();
