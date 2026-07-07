#!/usr/bin/env node
/**
 * CosMath — Integrate Quickfarma catalog into seed (FONTE DE PREÇO — nunca cria)
 * ===================================================================
 *
 * Lê data/catalog/quickfarma-full.json (Jumpseller; JSON-LD sku=CNP/EAN)
 * e funde no seed em MODO COMPARAÇÃO: Quickfarma entra SÓ como fonte de preço
 * sobre produtos que JÁ EXISTEM. Farmácia dermo PT que carrega as mesmas marcas
 * que já temos (LRP, Uriage, Isdin, Bioderma, Eucerin, Avène) → comparação real
 * por CNP/EAN, zero risco de poluir.
 *
 * POLÍTICA (conservadora, enrich-only):
 *   • EAN directo (gtin13): casa no produto com o mesmo EAN — sinal mais forte.
 *   • CNP directo: o sku=CNP (7 díg) casa num produto existente que partilha
 *     esse CNP (índice construído dos catálogos, como apply-cnp-merge) + guarda
 *     de marca → sinal forte (a loja usa nomes descritivos ≠ dos nossos).
 *   • fingerprint(marca+nome) → adiciona a oferta.
 *   • nome-sem-ruído (looseMatchKey) + volume compatível → idem.
 *   • fuzzy SEGURO (mesma marca+volume, J≥0.85, token distintivo) → idem.
 *   • SEM match → IGNORA (não cria produto novo).
 *
 * NB: como NÃO criamos sintéticos, o apply-cnp-merge não é necessário para esta
 * loja — fazemos o join por CNP aqui, directamente, sem poluir o catálogo.
 *
 * NUNCA altera nomes/EANs de produtos. Idempotente.
 *
 * Uso:
 *   node scripts/integrate-quickfarma-catalog.js
 *   node scripts/integrate-quickfarma-catalog.js --dry-run
 *   node scripts/integrate-quickfarma-catalog.js --no-inject
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, normalizeBrand, displayBrand, stripAccents, extractVolumeMl, safeFuzzyMatch, looseMatchKey, GENERIC_BRAND_LABELS, isNonCosmetic } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const FEED_FULL = path.join(ROOT, 'data', 'catalog', 'quickfarma-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const STORE_SLUG = 'quickfarma';
const isCnp = s => /^\d{7}$/.test(String(s || '').trim());
const isRealEan = s => /^\d{12,14}$/.test(String(s || '').trim());

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY_RUN = !!args['dry-run'];
const NO_INJECT = !!args['no-inject'];

function loadJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
const norm = s => stripAccents(String(s || '').toLowerCase()).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

(function main() {
  if (!fs.existsSync(FEED_FULL)) {
    console.error('✗ Não existe', FEED_FULL, '\n  Corre primeiro: node scripts/scrape-quickfarma-catalog.js');
    process.exit(1);
  }
  const feed = loadJSON(FEED_FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!feed?.products || !seed?.products) { console.error('✗ Ficheiros inválidos.'); process.exit(1); }

  let items = feed.products.filter(p => p.status === "ok" && p.price > 0 && !isNonCosmetic(p.name));
  console.log(`📦 quickfarma: ${feed.products.length} entradas · ${items.length} com preço`);
  console.log(`📦 Seed actual:     ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  const productByEan = {};
  for (const p of seed.products) productByEan[p.ean] = p;

  // ── Índice CNP → produto existente (join catálogos↔seed por URL, como
  // apply-cnp-merge). Exclui o próprio catálogo quickfarma. É o sinal forte:
  // a loja usa nomes descritivos diferentes dos nossos, mas o CNP nacional é
  // partilhado entre farmácias. ──
  const cnpByUrl = {};
  for (const f of fs.readdirSync(CATALOG_DIR)) {
    if (!f.endsWith('-full.json') || f.startsWith(STORE_SLUG)) continue;
    let c; try { c = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, f), 'utf8')); } catch { continue; }
    for (const p of c.products || []) { if (!p || !p.url) continue; const cnp = isCnp(p.cnp) ? p.cnp : (isCnp(p.sku) ? p.sku : null); if (cnp) cnpByUrl[p.url] = String(cnp).trim(); }
  }
  const storeCountByEan = {};
  const cnpToProducts = {};   // cnp -> Set(produto)
  for (const g of seed.store_products) for (const it of g.items) {
    storeCountByEan[it.ean] = (storeCountByEan[it.ean] || 0) + 1;
    const cnp = cnpByUrl[it.url];
    if (cnp && productByEan[it.ean]) (cnpToProducts[cnp] = cnpToProducts[cnp] || new Set()).add(productByEan[it.ean]);
  }
  // Escolhe o melhor alvo de um conjunto: EAN real primeiro, depois mais lojas.
  function pickBest(list) {
    return list.slice().sort((a, b) => (isRealEan(b.ean) - isRealEan(a.ean)) || ((storeCountByEan[b.ean] || 0) - (storeCountByEan[a.ean] || 0)))[0];
  }

  // Índice de fingerprint do seed (produto-base por fp).
  const fpIndex = {};
  for (const p of seed.products) { const fp = productFingerprint(p); if (fp && !fpIndex[fp]) fpIndex[fp] = p; }
  // Índice por marca canónica p/ o fallback fuzzy seguro (mesma marca).
  const byBrand = {};
  for (const p of seed.products) { const b = normalizeBrand(p.brand); if (b) (byBrand[b] = byBrand[b] || []).push(p); }
  // Índice de match SOLTO seguro (nome sem palavras-ruído): brand|chave -> produtos.
  const looseIndex = {};
  for (const p of seed.products) { const b = normalizeBrand(p.brand); if (!b) continue; const k = looseMatchKey(p.name, b); if (k) (looseIndex[b + '|' + k] = looseIndex[b + '|' + k] || []).push(p); }

  // Volumes conhecidos por produto (guard de volume — o fingerprint ignora
  // volume, por isso só anexamos quando o volume coincide, evita pôr 150ml a
  // competir num 300ml).
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

  // Marcas conhecidas (normalizadas) p/ match por prefixo do título (fallback
  // quando o vendor é genérico/loja).
  const brandSet = new Map();
  for (const p of seed.products) {
    if (!p.brand) continue;
    const nb = norm(p.brand);
    if (nb.length >= 3 && !brandSet.has(nb)) brandSet.set(nb, p.brand);
  }
  const brandList = [...brandSet.keys()].sort((a, b) => b.length - a.length);
  function resolveBrand(item) {
    // vendor da loja é fiável, mas se for o nome da própria loja tentamos o título.
    const v = (item.brand || '').trim();
    if (v && !/^(quickfarma)/i.test(v)) return v;
    const tn = norm(item.name);
    for (const nb of brandList) if (tn === nb || tn.startsWith(nb + ' ')) return brandSet.get(nb);
    return v || null;
  }

  let sp = seed.store_products.find(g => g.store_slug === STORE_SLUG);
  if (!sp) { sp = { store_slug: STORE_SLUG, items: [] }; seed.store_products.push(sp); }
  const itemByEan = {};
  for (const it of sp.items) itemByEan[it.ean] = it;

  if (!seed.stores.some(s => s.slug === STORE_SLUG)) {
    seed.stores.push({
      slug: STORE_SLUG,
      name: 'Quickfarma',
      base_url: 'https://www.quickfarma.pt',
      logo_url: null,
      // TODO confirmar portes/threshold reais (Shopify PT; ver site/sheet)
      free_shipping_threshold: 49,
      shipping_zones: { mainland: 3.50, madeira: 5.99, acores: 5.99 },
    });
    console.log(`🏬 Loja "Quickfarma" registada em seed.stores[].`);
  }

  let eanMatched = 0, cnpMatched = 0, matched = 0, looseMatched = 0, fuzzyMatched = 0, noBrand = 0, noMatch = 0, volSkip = 0, cnpBrandSkip = 0, added = 0, updated = 0, imgFilled = 0;
  const addedC = { value: 0 }, updatedC = { value: 0 };

  for (const ep of items) {
    const brand = resolveBrand(ep);
    if (!brand) { noBrand++; continue; }
    const nb = normalizeBrand(brand);
    let target = null;

    // ── 0. EAN directo (gtin13 real) — o sinal mais forte, língua irrelevante ──
    if (isRealEan(ep.ean) && productByEan[ep.ean]) { target = productByEan[ep.ean]; eanMatched++; }

    // ── 1. CNP directo (sinal forte) + guarda de marca ──
    if (!target && isCnp(ep.cnp) && cnpToProducts[ep.cnp]) {
      const cands = [...cnpToProducts[ep.cnp]];
      // guarda de marca: só aceita se a marca do alvo coincide (ou é
      // genérica/desconhecida) — evita colisões de CNP=código-de-linha entre
      // produtos de marcas diferentes.
      const brandOk = cands.filter(c => { const cb = normalizeBrand(c.brand); return !cb || !nb || cb === nb || GENERIC_BRAND_LABELS.has(cb); });
      if (brandOk.length) { target = pickBest(brandOk); cnpMatched++; }
      else if (cands.length) cnpBrandSkip++;   // CNP existe mas marca diverge → cai p/ fingerprint
    }

    const fp = productFingerprint({ name: ep.name, brand });
    if (!target && fp && fpIndex[fp]) { target = fpIndex[fp]; matched++; }
    if (!target) {
      const lk = looseMatchKey(ep.name, brand);
      const cands = lk ? (looseIndex[nb + '|' + lk] || []) : [];
      const lm = cands.find(c => { const cv = extractVolumeMl(ep.name), sv = extractVolumeMl(c.name); return !(cv && sv && Math.abs(cv - sv) / Math.max(cv, sv) > 0.06); });
      if (lm) { target = lm; looseMatched++; }
    }
    if (!target) {
      const fz = safeFuzzyMatch({ name: ep.name, brand }, byBrand[nb] || []);
      if (fz) { target = fz.product; fuzzyMatched++; }
    }
    if (!target) { noMatch++; continue; }
    if (!volumeOk(target, ep.volume_ml)) { volSkip++; continue; }

    if (!target.image_url && ep.image_url) { target.image_url = ep.image_url; imgFilled++; }

    const r = upsertStoreItem(
      { storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC },
      target.ean, { ...ep, brand }, feed.scraped_at
    );
    if (r.action === 'added') added++;
    else if (r.action === 'merged') updated++;
  }

  const totalMatched = eanMatched + cnpMatched + matched + looseMatched + fuzzyMatched;
  console.log('══════ Resumo (Quickfarma · fonte de preço, enrich-only) ══════');
  console.log(`  Casados por EAN directo:    ${eanMatched}`);
  console.log(`  Casados por CNP directo:    ${cnpMatched}`);
  console.log(`  Casados por fingerprint:    ${matched}`);
  console.log(`  Casados por nome-sem-ruído: ${looseMatched}`);
  console.log(`  Casados por fuzzy seguro:   ${fuzzyMatched}`);
  console.log(`  Total casados:              ${totalMatched}  (alguns podem falhar no guard de volume)`);
  console.log(`  CNP existe mas marca diverge (→ fp): ${cnpBrandSkip}`);
  console.log(`  Sem marca resolúvel:        ${noBrand}`);
  console.log(`  Sem produto correspondente: ${noMatch}`);
  console.log(`  Volume não coincide (skip): ${volSkip}`);
  console.log(`  Ofertas quickfarma:      +${added} novas, ${updated} actualizadas (total ${sp.items.length})`);
  console.log(`  Imagens preenchidas:        ${imgFilled}`);
  const withDisc = sp.items.filter(i => i.previous_price && i.previous_price > i.price).length;
  console.log(`    com desconto activo:      ${withDisc}`);

  if (DRY_RUN) { console.log('\n🧪 --dry-run: seed NÃO gravado.'); return; }
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ ${SEED_BUNDLE} actualizado (${(fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1)} MB)`);

  if (NO_INJECT) { console.log('↩  --no-inject: não re-injectado.'); return; }
  console.log('\n▶ Re-injectando no demo.html + index.html…');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
  if (r.status === 0) console.log('\n✅ Integração Quickfarma completa.');
})();
