#!/usr/bin/env node
/**
 * CosMath — Integrate Continente Online catalog into seed (FONTE DE PREÇO — nunca cria)
 * ===================================================================
 *
 * Lê data/catalog/continente-full.json (PDPs JSON-LD sem gtin; MODO COMPARAÇÃO) e funde no seed.
 *
 * Continente Online NÃO expõe EAN. Por isso, ao contrário das outras integrações
 * (match por gtin13 real), esta loja entra SÓ como fonte de preço sobre
 * produtos que JÁ EXISTEM, casados por FINGERPRINT (marca+nome+volume):
 *
 *   POLÍTICA (conservadora):
 *     • Resolve a marca:  feed "Marcas > X > <Marca>"  OU  prefixo do título
 *       contra as marcas conhecidas do seed (mais comprida primeiro).
 *     • fingerprint(marca+nome) bate num produto existente → adiciona oferta
 *       pharma2you (preço/link/imagem) a esse produto.
 *     • SEM match → IGNORA (não cria produto — sem EAN não há garantia de
 *       identidade; criar poluiria o catálogo).
 *
 * NUNCA altera nomes/EANs de produtos. Não corre dedup (não cria/merge
 * produtos, só acrescenta ofertas). Idempotente.
 *
 * Uso:
 *   node scripts/integrate-continente-catalog.js
 *   node scripts/integrate-continente-catalog.js --dry-run
 *   node scripts/integrate-continente-catalog.js --no-inject
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, normalizeBrand, displayBrand, stripAccents, extractVolumeMl } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const FEED_FULL = path.join(ROOT, 'data', 'catalog', 'continente-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const STORE_SLUG = 'continente';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY_RUN = !!args['dry-run'];
const NO_INJECT = !!args['no-inject'];

function loadJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
const norm = s => stripAccents(String(s || '').toLowerCase()).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

(function main() {
  if (!fs.existsSync(FEED_FULL)) {
    console.error('✗ Não existe', FEED_FULL, '\n  Corre primeiro: node scripts/scrape-continente-catalog.js');
    process.exit(1);
  }
  const feed = loadJSON(FEED_FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!feed?.products || !seed?.products) { console.error('✗ Ficheiros inválidos.'); process.exit(1); }

  let items = feed.products.filter(p => p.status === 'ok' && p.price > 0);
  console.log(`📦 continente: ${feed.products.length} entradas · ${items.length} com preço`);
  console.log(`📦 Seed actual:     ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  // Índice de fingerprint do seed (produto-base por fp).
  const fpIndex = {};
  for (const p of seed.products) { const fp = productFingerprint(p); if (fp && !fpIndex[fp]) fpIndex[fp] = p; }

  // Volumes conhecidos por produto (canónico + variantes de qualquer loja) —
  // guard de volume: o fingerprint ignora volume, por isso só anexamos a
  // oferta pharma2you quando o seu volume coincide com um do produto (evita
  // pôr um "150ml" a competir num produto de "300ml").
  const volsByEan = {};
  for (const sp2 of seed.store_products)
    for (const it of sp2.items)
      if (Array.isArray(it.variants))
        for (const v of it.variants)
          if (v.volume_ml > 0) (volsByEan[it.ean] = volsByEan[it.ean] || new Set()).add(v.volume_ml);
  function volumeOk(target, fv) {
    if (!fv) return true;                        // feed sem volume → não bloqueia
    const tvs = new Set(volsByEan[target.ean] || []);
    const cv = extractVolumeMl(target.name); if (cv) tvs.add(cv);
    if (tvs.size === 0) return true;             // alvo sem volume conhecido → permite
    for (const tv of tvs) if (Math.abs(tv - fv) / Math.max(tv, fv) <= 0.06) return true;
    return false;
  }

  // Lista de marcas conhecidas (normalizadas) p/ match por prefixo do título.
  // Ordenadas pela mais comprida primeiro (evita "La" antes de "La Roche-Posay").
  const brandSet = new Map();   // normBrand -> displayBrand original
  for (const p of seed.products) {
    if (!p.brand) continue;
    const nb = norm(p.brand);
    if (nb.length >= 3 && !brandSet.has(nb)) brandSet.set(nb, p.brand);
  }
  const brandList = [...brandSet.keys()].sort((a, b) => b.length - a.length);

  function resolveBrand(item) {
    if (item.brand) return item.brand;                       // do "Marcas > X > Marca"
    const tn = norm(item.name);
    for (const nb of brandList) {
      if (tn === nb || tn.startsWith(nb + ' ')) return brandSet.get(nb);
    }
    return null;
  }

  // Grupo de store_products da pharma2you.
  let sp = seed.store_products.find(g => g.store_slug === STORE_SLUG);
  if (!sp) { sp = { store_slug: STORE_SLUG, items: [] }; seed.store_products.push(sp); }
  const itemByEan = {};
  for (const it of sp.items) itemByEan[it.ean] = it;

  // Auto-registo da loja em seed.stores[] (a partir de stores.json).
  if (!seed.stores.some(s => s.slug === STORE_SLUG)) {
    let def = null;
    try { def = (loadJSON(path.join(ROOT, 'data', 'stores.json')).stores || []).find(s => s.id === STORE_SLUG); } catch {}
    seed.stores.push({
      slug: STORE_SLUG,
      name: 'Continente Online',
      base_url: 'https://www.continente.pt',
      logo_url: null,
      free_shipping_threshold: 9999,
      shipping_zones: { mainland: 5.99, madeira: 5.99, acores: 5.99 },
    });
    console.log(`🏬 Loja "Continente Online" registada em seed.stores[].`);
  }

  let matched = 0, noBrand = 0, noMatch = 0, volSkip = 0, added = 0, updated = 0, imgFilled = 0;
  const addedC = { value: 0 }, updatedC = { value: 0 };

  for (const ep of items) {
    const brand = resolveBrand(ep);
    if (!brand) { noBrand++; continue; }
    const fp = productFingerprint({ name: ep.name, brand });
    const target = fp ? fpIndex[fp] : null;
    if (!target) { noMatch++; continue; }
    if (!volumeOk(target, ep.volume_ml)) { volSkip++; continue; }   // guard de volume
    matched++;

    if (!target.image_url && ep.image_url) { target.image_url = ep.image_url; imgFilled++; }

    const r = upsertStoreItem(
      { storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC },
      target.ean, { ...ep, brand }, feed.scraped_at
    );
    if (r.action === 'added') added++;
    else if (r.action === 'merged') updated++;
  }

  console.log('══════ Resumo (pharma2you · fonte de preço por fingerprint) ══════');
  console.log(`  Casados por fingerprint:   ${matched}`);
  console.log(`  Sem marca resolúvel:       ${noBrand}`);
  console.log(`  Sem produto correspondente: ${noMatch}`);
  console.log(`  Volume não coincide (skip): ${volSkip}`);
  console.log(`  Ofertas pharma2you:        +${added} novas, ${updated} actualizadas (total ${sp.items.length})`);
  console.log(`  Imagens preenchidas:       ${imgFilled}`);
  const withDisc = sp.items.filter(i => i.previous_price && i.previous_price > i.price).length;
  console.log(`    com desconto activo:     ${withDisc}`);

  if (DRY_RUN) { console.log('\n🧪 --dry-run: seed NÃO gravado.'); return; }
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ ${SEED_BUNDLE} actualizado (${(fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1)} MB)`);

  if (NO_INJECT) { console.log('↩  --no-inject: não re-injectado.'); return; }
  console.log('\n▶ Re-injectando no demo.html + index.html…');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) console.log('\n✅ Integração pharma2you completa.');
})();
