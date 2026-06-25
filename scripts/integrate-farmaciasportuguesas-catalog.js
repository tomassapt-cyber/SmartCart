#!/usr/bin/env node
/**
 * CosMath — Integrate farmaciasportuguesas.pt catalog into seed
 * ============================================================
 *
 * Farmácias Portuguesas (maior rede PT, Magento). O catálogo traz CNP (sku de
 * 7 díg) e preço (da farmácia de referência), mas SEM EAN. Estratégia de match
 * (conservadora, enrich-only — não cria produtos):
 *
 *   1. POR CNP (forte): liga o CNP do produto ao EAN canónico do seed via o
 *      índice cnp→ean construído a partir dos catálogos que têm CNP+URL
 *      (mesma fonte do apply-cnp-merge). Só usa quando o CNP mapeia para UM
 *      único EAN (evita CNP de "linha" que junta produtos distintos).
 *   2. FALLBACK por FINGERPRINT: marca (prefixo do título vs marcas do seed) +
 *      nome, com guard de volume (o fingerprint ignora volume).
 *
 * Adiciona a oferta Farmácias Portuguesas ao produto existente. Idempotente.
 * Não corre dedup (não cria/merge produtos).
 *
 * Uso:
 *   node scripts/integrate-farmaciasportuguesas-catalog.js
 *   node scripts/integrate-farmaciasportuguesas-catalog.js --dry-run
 *   node scripts/integrate-farmaciasportuguesas-catalog.js --no-inject
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, stripAccents, extractVolumeMl } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const FULL = path.join(ROOT, 'data', 'catalog', 'farmaciasportuguesas-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const STORE_SLUG = 'farmaciasportuguesas';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY_RUN = !!args['dry-run'];
const NO_INJECT = !!args['no-inject'];

function loadJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
const norm = s => stripAccents(String(s || '').toLowerCase()).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const isCnp = s => /^\d{7}$/.test(String(s || '').trim());

(function main() {
  if (!fs.existsSync(FULL)) { console.error('✗ Não existe', FULL, '\n  Corre: node scripts/scrape-farmaciasportuguesas-catalog.js'); process.exit(1); }
  const cat = loadJSON(FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!cat?.products || !seed?.products) { console.error('✗ Ficheiros inválidos.'); process.exit(1); }

  let items = cat.products.filter(p => p.status === 'ok' && p.price > 0 && isCnp(p.cnp));
  console.log(`📦 farmaciasportuguesas: ${cat.products.length} entradas · ${items.length} com preço+CNP`);
  console.log(`📦 Seed actual:          ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  // ── Índice cnp → ean (igual ao apply-cnp-merge): catálogos com CNP/sku 7-díg
  //    juntos ao seed por URL da oferta. Só CNPs que mapeiam para 1 EAN único. ──
  const cnpByUrl = {};
  for (const file of fs.readdirSync(CATALOG_DIR)) {
    if (!file.endsWith('-full.json') || file.startsWith('farmaciasportuguesas')) continue;
    const c = loadJSON(path.join(CATALOG_DIR, file));
    for (const p of (c?.products || [])) {
      if (!p || !p.url) continue;
      const cnp = isCnp(p.cnp) ? String(p.cnp).trim() : (isCnp(p.sku) ? String(p.sku).trim() : null);
      if (cnp) cnpByUrl[p.url] = cnp;
    }
  }
  const eansByCnp = {};
  for (const g of seed.store_products)
    for (const it of g.items) {
      const cnp = cnpByUrl[it.url];
      if (cnp && it.ean) (eansByCnp[cnp] = eansByCnp[cnp] || new Set()).add(it.ean);
    }
  const productByEan = {};
  for (const p of seed.products) productByEan[p.ean] = p;
  const cnpToProduct = {};   // cnp → produto (só CNPs com 1 EAN único)
  for (const [cnp, eans] of Object.entries(eansByCnp)) {
    if (eans.size === 1) { const ean = [...eans][0]; if (productByEan[ean]) cnpToProduct[cnp] = productByEan[ean]; }
  }
  console.log(`🔢 Índice CNP→produto: ${Object.keys(cnpToProduct).length} CNPs únicos mapeados (de catálogos com CNP).`);

  // ── Fingerprint + marcas (fallback) ──
  const fpIndex = {};
  for (const p of seed.products) { const fp = productFingerprint(p); if (fp && !fpIndex[fp]) fpIndex[fp] = p; }
  const brandSet = new Map();
  for (const p of seed.products) { if (!p.brand) continue; const nb = norm(p.brand); if (nb.length >= 3 && !brandSet.has(nb)) brandSet.set(nb, p.brand); }
  const brandList = [...brandSet.keys()].sort((a, b) => b.length - a.length);
  const resolveBrand = (it) => { const tn = norm(it.name); for (const nb of brandList) if (tn === nb || tn.startsWith(nb + ' ')) return brandSet.get(nb); return null; };

  const volsByEan = {};
  for (const g of seed.store_products) for (const it of g.items) if (Array.isArray(it.variants)) for (const v of it.variants) if (v.volume_ml > 0) (volsByEan[it.ean] = volsByEan[it.ean] || new Set()).add(v.volume_ml);
  function volumeOk(target, fv) {
    if (!fv) return true;
    const tvs = new Set(volsByEan[target.ean] || []); const cv = extractVolumeMl(target.name); if (cv) tvs.add(cv);
    if (tvs.size === 0) return true;
    for (const tv of tvs) if (Math.abs(tv - fv) / Math.max(tv, fv) <= 0.06) return true;
    return false;
  }

  // Grupo de store_products + registo da loja.
  let sp = seed.store_products.find(g => g.store_slug === STORE_SLUG);
  if (!sp) { sp = { store_slug: STORE_SLUG, items: [] }; seed.store_products.push(sp); }
  const itemByEan = {}; for (const it of sp.items) itemByEan[it.ean] = it;
  if (!seed.stores.some(s => s.slug === STORE_SLUG)) {
    seed.stores.push({
      slug: STORE_SLUG, name: 'Farmácias Portuguesas',
      base_url: 'https://www.farmaciasportuguesas.pt', logo_url: null,
      free_shipping_threshold: 30,
      shipping_zones: { mainland: 3.99, madeira: 1.5, acores: 1.5 },
    });
    console.log('🏬 Loja "Farmácias Portuguesas" registada em seed.stores[].');
  }

  let byCnp = 0, byFp = 0, noMatch = 0, volSkip = 0, added = 0, updated = 0, imgFilled = 0;
  const addedC = { value: 0 }, updatedC = { value: 0 };

  for (const ep of items) {
    let target = cnpToProduct[ep.cnp] || null;   // 1) CNP forte
    let via = 'cnp';
    if (!target) {                                // 2) fingerprint fallback
      const brand = resolveBrand(ep);
      if (brand) {
        const fp = productFingerprint({ name: ep.name, brand });
        const t = fp ? fpIndex[fp] : null;
        if (t && volumeOk(t, ep.volume_ml)) { target = t; via = 'fp'; }
        else if (t) { volSkip++; continue; }
      }
    }
    if (!target) { noMatch++; continue; }
    if (via === 'cnp') byCnp++; else byFp++;

    if (!target.image_url && ep.image_url) { target.image_url = ep.image_url; imgFilled++; }
    const r = upsertStoreItem({ storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC }, target.ean, ep, cat.scraped_at);
    if (r.action === 'added') added++; else if (r.action === 'merged') updated++;
  }

  console.log('══════ Resumo (farmaciasportuguesas) ══════');
  console.log(`  Match por CNP (forte):     ${byCnp}`);
  console.log(`  Match por fingerprint:     ${byFp}`);
  console.log(`  Volume não coincide (skip): ${volSkip}`);
  console.log(`  Sem produto correspondente: ${noMatch}`);
  console.log(`  Ofertas FP:                +${added} novas, ${updated} actualizadas (total ${sp.items.length})`);
  console.log(`  Imagens preenchidas:       ${imgFilled}`);
  const withDisc = sp.items.filter(i => i.previous_price && i.previous_price > i.price).length;
  console.log(`    com desconto activo:     ${withDisc}`);

  if (DRY_RUN) { console.log('\n🧪 --dry-run: seed NÃO gravado.'); return; }
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ ${SEED_BUNDLE} actualizado (${(fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1)} MB)`);
  if (NO_INJECT) { console.log('↩  --no-inject.'); return; }
  console.log('\n▶ Re-injectando…');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) console.log('\n✅ Integração farmaciasportuguesas completa.');
})();
