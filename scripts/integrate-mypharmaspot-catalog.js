#!/usr/bin/env node
/**
 * CosMath — Integrate My Pharma Spot catalog into seed · loja 75
 * ============================================================
 * Farmácia online portuguesa em Shopify (2026-09-28). ~1.400 produtos, quase
 * todos com EAN (vem do /products/<handle>.js) e CNP no sku.
 *
 * PORQUE ENTROU: medido ANTES de integrar (a lição da Care to Beauty, que trouxe
 * catálogo mas quase nunca é a mais barata): nos produtos em comum está a 0,84×
 * a mediana do mercado e seria a MAIS BARATA em 55% deles. É um canal de preço.
 *
 * PORTES: desde 3,80 € no continente e 12,80 € nas ilhas, a subir com o peso;
 * sem portes grátis (simulação de carrinho na própria loja, 2026-09-28 — ver
 * LIMIAR_PORTES_GRATIS).
 *
 * POLÍTICA (igual à da Care to Beauty, conservadora):
 *   • Match por EAN real      → enriquece preço/oferta no produto existente.
 *   • Match por fingerprint    → idem; upgrade de EAN sintético → real.
 *   • SEM match + nome dermo   → CRIA produto novo (classifyDermo filtra).
 *   • Só CNP, sem EAN          → EAN sintético; o apply-cnp-merge junta-o.
 *
 * NUNCA altera nomes de produtos existentes. Idempotente.
 *
 * Uso:
 *   node scripts/integrate-mypharmaspot-catalog.js [--dry-run] [--max=N]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, displayBrand } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');
const { classifyDermo } = require('./lib/dermo-classify');

const ROOT = path.resolve(__dirname, '..');
const FULL = path.join(ROOT, 'data', 'catalog', 'mypharmaspot-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const STORE_SLUG = 'mypharmaspot';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY_RUN = !!args['dry-run'];
const MAX = args.max ? parseInt(args.max, 10) : Infinity;

function loadJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
const isRealEan = e => /^\d{12,14}$/.test(e || '');
// NÃO HÁ PORTES GRÁTIS. Medido por simulação de carrinho a 2026-09-28: de
// 33,80 € a 51,73 € paga sempre, e o valor sobe com o PESO (3,80 → 3,90 →
// 4,60 €), não com o total. 9999 é a sentinela do site para "nunca grátis"
// (ver freeShippingUpsellHTML no demo.html); null viraria 0 = sempre grátis.
const LIMIAR_PORTES_GRATIS = 9999;

(function main() {
  if (!fs.existsSync(FULL)) { console.error('✗ Não existe', FULL, '\n  Corre: node scripts/scrape-mypharmaspot-catalog.js'); process.exit(1); }
  const data = loadJSON(FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!data?.products || !seed?.products) { console.error('✗ Ficheiros inválidos.'); process.exit(1); }

  let sm = data.products.filter(p => p.status === 'ok' && p.price > 0 && (isRealEan(p.ean) || /^\d{7}$/.test(p.cnp || ''))).slice(0, MAX);
  console.log(`📦 mypharmaspot: ${data.products.length} entradas · ${sm.length} com EAN real + preço`);
  console.log(`📦 Seed actual:  ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  const eanIndex = {}; const fpIndex = {};
  for (const p of seed.products) { eanIndex[p.ean] = p; const fp = productFingerprint(p); if (fp && !fpIndex[fp]) fpIndex[fp] = p; }

  let sp = seed.store_products.find(g => g.store_slug === STORE_SLUG);
  if (!sp) { sp = { store_slug: STORE_SLUG, items: [] }; seed.store_products.push(sp); }
  if (!seed.stores.some(s => s.slug === STORE_SLUG)) {
    seed.stores.push({
      slug: STORE_SLUG, name: 'My Pharma Spot',
      base_url: 'https://www.mypharmaspot.com', logo_url: null,
      free_shipping_threshold: LIMIAR_PORTES_GRATIS,
      shipping_zones: { mainland: 3.80, madeira: 12.80, acores: 12.80 },
    });
    console.log('🏬 Loja "My Pharma Spot" registada em seed.stores[].');
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
      const newEan = isRealEan(ep.ean) ? ep.ean : ('mypharmaspot-' + (ep.url || '').split('/products/').pop().split('?')[0].slice(0, 50).replace(/[^a-z0-9-]/gi, ''));
      target = { ean: newEan, name: ep.name, brand: displayBrand(ep.brand) || ep.brand || null, category: dermo, image_url: ep.image_url || null, _source: 'mypharmaspot-catalog' };
      seed.products.push(target); eanIndex[target.ean] = target;
      const fp = productFingerprint(ep); if (fp && !fpIndex[fp]) fpIndex[fp] = target;
      createdNew++;
    }
    if (!target.image_url && ep.image_url) target.image_url = ep.image_url;
    const r = upsertStoreItem({ storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC }, target.ean, ep, data.scraped_at);
    if (r.action === 'added') added++; else if (r.action === 'merged') updated++;
  }

  console.log('══════ Resumo (mypharmaspot) ══════');
  console.log(`  Match por EAN real:        ${matchedByEan}`);
  console.log(`  Match por fingerprint:     ${matchedByFp} (upgrades synth→real: ${upgraded})`);
  console.log(`  Produtos novos (dermo):    ${createdNew}`);
  console.log(`  Sem match (não-dermo):     ${unmatched}`);
  console.log(`  Ofertas mypharmaspot:        +${added} novas, ${updated} actualizadas (total ${sp.items.length})`);

  if (DRY_RUN) { console.log('\n🧪 --dry-run: seed NÃO gravado.'); return; }
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ ${SEED_BUNDLE} actualizado (${(fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1)} MB)`);

  const run = (label, scriptArgs) => { console.log(`\n▶ ${label}…`); const r = spawnSync('node', scriptArgs, { cwd: ROOT, stdio: 'inherit' }); if (r.status !== 0) console.warn(`⚠ ${label} falhou — continuar.`); };
  run('dedup-audit', [path.join(ROOT, 'scripts', 'dedup-audit.js'), '--apply']);
  run('dedup-store-url', [path.join(ROOT, 'scripts', 'dedup-store-url.js'), '--apply', '--no-inject']);
  run('normalize-brand-display', [path.join(ROOT, 'scripts', 'normalize-brand-display.js'), '--apply', '--no-inject']);
  run('apply-cnp-merge', [path.join(ROOT, 'scripts', 'apply-cnp-merge.js'), '--apply']);
  run('Re-injectar no demo/index/catalogo', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')]);
  console.log('\n✅ Integração mypharmaspot completa.');
})();
