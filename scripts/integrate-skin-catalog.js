#!/usr/bin/env node
/**
 * CosMath — Integrate skin.pt catalog into seed
 * ============================================================
 * Skin (skin.pt) é Magento atrás de Cloudflare Managed Challenge → catálogo
 * colhido via Browser pane (ver scripts/build-skin-catalog.js). SEM gtin;
 * sku = CNP 7 díg na maioria — o CNP fica no catálogo bruto e é apanhado
 * pelo apply-cnp-merge.js (varre data/catalog/*.json por `cnp` 7 díg).
 *
 * POLÍTICA (igual à farmaciasprogresso, conservadora):
 *   • Match por EAN real      → enriquece preço/oferta no produto existente.
 *   • Match por fingerprint    → idem; upgrade de EAN sintético → real.
 *   • SEM match + nome dermo   → CRIA produto novo (classifyDermo filtra
 *     não-cosmético).
 *   • SEM CHAVE (sku interno, ~37% do catálogo: Nivea/Revlon/Schwarzkopf
 *     retalho) → enrich-only por fingerprint com GUARD DE VOLUME 6%
 *     (padrão pharma2you); nunca cria, nunca faz upgrade de EAN.
 *
 * NUNCA altera nomes de produtos existentes. Idempotente.
 *
 * Uso:
 *   node scripts/integrate-skin-catalog.js [--dry-run] [--max=N]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, displayBrand, extractVolumeMl } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');
const { classifyDermo } = require('./lib/dermo-classify');

const ROOT = path.resolve(__dirname, '..');
const FULL = path.join(ROOT, 'data', 'catalog', 'skin-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const STORE_SLUG = 'skin';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY_RUN = !!args['dry-run'];
const MAX = args.max ? parseInt(args.max, 10) : Infinity;

function loadJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
const isRealEan = e => /^\d{12,14}$/.test(e || '');

(function main() {
  if (!fs.existsSync(FULL)) { console.error('✗ Não existe', FULL, '\n  Colher no Browser pane + node scripts/build-skin-catalog.js (loja só-browser, ver docs/LOJAS.md)'); process.exit(1); }
  const data = loadJSON(FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!data?.products || !seed?.products) { console.error('✗ Ficheiros inválidos.'); process.exit(1); }

  const hasKey = p => isRealEan(p.ean) || /^\d{7}$/.test(p.cnp || '');
  let sm = data.products.filter(p => p.status === 'ok' && p.price > 0).slice(0, MAX);
  console.log(`📦 skin: ${data.products.length} entradas · ${sm.filter(hasKey).length} com chave (EAN/CNP) · ${sm.filter(p => !hasKey(p)).length} sem chave (só fingerprint) · todas com preço`);
  console.log(`📦 Seed actual:  ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  const eanIndex = {}; const fpIndex = {};
  for (const p of seed.products) { eanIndex[p.ean] = p; const fp = productFingerprint(p); if (fp && !fpIndex[fp]) fpIndex[fp] = p; }

  // Guard de volume p/ o caminho SEM CHAVE (padrão pharma2you): o fingerprint
  // ignora volume → só anexamos quando o volume da skin coincide (±6%) com um
  // volume conhecido do produto (nome canónico ou variantes de qualquer loja).
  const volsByEan = {};
  for (const sp2 of seed.store_products)
    for (const it of sp2.items)
      if (Array.isArray(it.variants))
        for (const v of it.variants)
          if (v.volume_ml > 0) (volsByEan[it.ean] = volsByEan[it.ean] || new Set()).add(v.volume_ml);
  function volumeOk(target, fv) {
    if (!fv) return true;
    const tvs = new Set(volsByEan[target.ean] || []);
    const cv = extractVolumeMl(target.name); if (cv) tvs.add(cv);
    if (tvs.size === 0) return true;
    for (const tv of tvs) if (Math.abs(tv - fv) / Math.max(tv, fv) <= 0.06) return true;
    return false;
  }

  let sp = seed.store_products.find(g => g.store_slug === STORE_SLUG);
  if (!sp) { sp = { store_slug: STORE_SLUG, items: [] }; seed.store_products.push(sp); }
  if (!seed.stores.some(s => s.slug === STORE_SLUG)) {
    seed.stores.push({
      slug: STORE_SLUG, name: 'Skin',
      base_url: 'https://skin.pt', logo_url: null,
      free_shipping_threshold: 40,
      shipping_zones: { mainland: 3.40, madeira: 3.40, acores: 3.40 },
    });
    console.log('🏬 Loja "Skin" registada em seed.stores[].');
  }
  const itemByEan = {}; for (const it of sp.items) itemByEan[it.ean] = it;

  let matchedByEan = 0, matchedByFp = 0, upgraded = 0, createdNew = 0, unmatched = 0, added = 0, updated = 0;
  let fpNoKey = 0, volSkip = 0, noKeySkip = 0;
  const addedC = { value: 0 }, updatedC = { value: 0 };

  for (const ep of sm) {
    if (!hasKey(ep)) {
      // SEM CHAVE: enrich-only por fingerprint + guard de volume; nunca cria.
      const fp = productFingerprint(ep);
      const target = fp && fpIndex[fp];
      if (!target) { noKeySkip++; continue; }
      if (!volumeOk(target, ep.volume_ml || extractVolumeMl(ep.name))) { volSkip++; continue; }
      fpNoKey++;
      if (!target.image_url && ep.image_url) target.image_url = ep.image_url;
      const r0 = upsertStoreItem({ storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC }, target.ean, ep, data.scraped_at);
      if (r0.action === 'added') added++; else if (r0.action === 'merged') updated++;
      continue;
    }
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
      const newEan = isRealEan(ep.ean) ? ep.ean : ('skin-' + (ep.url || '').split('/').pop().replace(/\.html$/, '').slice(0, 50).replace(/[^a-z0-9-]/gi, ''));
      target = { ean: newEan, name: ep.name, brand: displayBrand(ep.brand) || ep.brand || null, category: dermo, image_url: ep.image_url || null, _source: 'skin-catalog' };
      seed.products.push(target); eanIndex[target.ean] = target;
      const fp = productFingerprint(ep); if (fp && !fpIndex[fp]) fpIndex[fp] = target;
      createdNew++;
    }
    if (!target.image_url && ep.image_url) target.image_url = ep.image_url;
    const r = upsertStoreItem({ storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC }, target.ean, ep, data.scraped_at);
    if (r.action === 'added') added++; else if (r.action === 'merged') updated++;
  }

  console.log('══════ Resumo (skin) ══════');
  console.log(`  Match por EAN real:        ${matchedByEan}`);
  console.log(`  Match por fingerprint:     ${matchedByFp} (upgrades synth→real: ${upgraded})`);
  console.log(`  Produtos novos (dermo):    ${createdNew}`);
  console.log(`  Sem match (não-dermo):     ${unmatched}`);
  console.log(`  Sem chave → fp+volume:     ${fpNoKey} (volume não coincide: ${volSkip}; sem match: ${noKeySkip})`);
  console.log(`  Ofertas skin:        +${added} novas, ${updated} actualizadas (total ${sp.items.length})`);

  if (DRY_RUN) { console.log('\n🧪 --dry-run: seed NÃO gravado.'); return; }
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ ${SEED_BUNDLE} actualizado (${(fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1)} MB)`);

  const run = (label, scriptArgs) => { console.log(`\n▶ ${label}…`); const r = spawnSync('node', scriptArgs, { cwd: ROOT, stdio: 'inherit' }); if (r.status !== 0) console.warn(`⚠ ${label} falhou — continuar.`); };
  run('dedup-audit', [path.join(ROOT, 'scripts', 'dedup-audit.js'), '--apply']);
  run('dedup-store-url', [path.join(ROOT, 'scripts', 'dedup-store-url.js'), '--apply', '--no-inject']);
  run('normalize-brand-display', [path.join(ROOT, 'scripts', 'normalize-brand-display.js'), '--apply', '--no-inject']);
  run('apply-cnp-merge', [path.join(ROOT, 'scripts', 'apply-cnp-merge.js'), '--apply']);
  run('Re-injectar no demo/index/catalogo', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')]);
  console.log('\n✅ Integração skin completa.');
})();
