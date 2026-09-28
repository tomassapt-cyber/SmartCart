/**
 * Integração partilhada para FARMÁCIAS PORTUGUESAS com CNP (e às vezes EAN).
 * ============================================================================
 * Nasceu a 2026-09-28, com a Santa Marta e a Pharma24: é a lógica do
 * integrate-smartbeauty-catalog.js (EAN → CNP com guarda de marca → fingerprint
 * → nome-sem-ruído → fuzzy seguro, guardas de volume e de preço) tirada para
 * uma função, em vez de a copiar mais duas vezes. O integrador de cada loja passa
 * só o que é seu (slug, nome, portes) — ver integrate-pharma24-catalog.js.
 *
 * DIFERENÇA para a Smartbeauty: com `criarDermo: true`, um produto SEM par no
 * catálogo e que o classifyDermo reconhece como dermocosmética é CRIADO (como a
 * Care to Beauty faz). Com EAN real fica esse EAN; só com CNP fica um EAN
 * sintético "<slug>-<cnp>", que o apply-cnp-merge junta ao EAN real quando
 * outra loja partilha o mesmo CNP. Sem código nenhum, NUNCA cria (fantasmas).
 *
 * O CNP é o Código Nacional do Produto (7 dígitos, Infarmed), partilhado entre
 * farmácias — mas às vezes é um código de LINHA que junta produtos diferentes
 * da mesma gama. Daí a guarda de marca e a de preço (>3× fora = outra unidade).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, normalizeBrand, displayBrand, stripAccents, extractVolumeMl, safeFuzzyMatch, looseMatchKey, GENERIC_BRAND_LABELS, isNonCosmetic } = require('./product-fingerprint');
const { upsertStoreItem } = require('./store-item-merge');
const { classifyDermo } = require('./dermo-classify');

const ROOT = path.resolve(__dirname, '..', '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const isCnp = s => /^\d{7}$/.test(String(s || '').trim());
const isRealEan = s => /^\d{12,14}$/.test(String(s || '').trim());
const loadJSON = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const norm = s => stripAccents(String(s || '').toLowerCase()).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * @param {{slug:string, loja:{name:string, base_url:string, free_shipping_threshold:number, shipping_zones:{mainland:number,madeira:number,acores:number}},
 *          criarDermo?:boolean, marcaLixo?:RegExp}} cfg
 */
function integrarFarmacia(cfg) {
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  const DRY_RUN = !!args['dry-run'];
  const NO_INJECT = !!args['no-inject'];
  const SLUG = cfg.slug;
  const FEED = path.join(CATALOG_DIR, `${SLUG}-full.json`);

  if (!fs.existsSync(FEED)) { console.error('✗ Não existe', FEED, `\n  Corre primeiro: node scripts/scrape-${SLUG}-catalog.js`); process.exit(1); }
  const feed = loadJSON(FEED);
  const seed = loadJSON(SEED_BUNDLE);
  if (!feed?.products || !seed?.products) { console.error('✗ Ficheiros inválidos.'); process.exit(1); }

  const items = feed.products.filter(p => p.status === 'ok' && p.price > 0 && !isNonCosmetic(p.name));
  console.log(`📦 ${SLUG}: ${feed.products.length} entradas · ${items.length} com preço (cosmética/saúde)`);
  console.log(`📦 Seed actual:  ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  const productByEan = {};
  for (const p of seed.products) productByEan[p.ean] = p;

  // ── CNP → produtos existentes: catálogos das OUTRAS lojas (url → cnp) juntos
  // ao seed pelos itens de cada loja. É o sinal forte entre farmácias PT.
  const cnpByUrl = {};
  for (const f of fs.readdirSync(CATALOG_DIR)) {
    if (!f.endsWith('-full.json') || f.startsWith(SLUG + '-')) continue;
    const c = loadJSON(path.join(CATALOG_DIR, f));
    for (const p of (c && c.products) || []) { if (!p || !p.url) continue; const cnp = isCnp(p.cnp) ? p.cnp : (isCnp(p.sku) ? p.sku : null); if (cnp) cnpByUrl[p.url] = String(cnp).trim(); }
  }
  const storeCountByEan = {}, cnpToProducts = {}, priceRangeByEan = {}, volsByEan = {};
  for (const g of seed.store_products) for (const it of g.items) {
    storeCountByEan[it.ean] = (storeCountByEan[it.ean] || 0) + 1;
    if (it.price > 0) { const r = priceRangeByEan[it.ean] = priceRangeByEan[it.ean] || { min: it.price, max: it.price }; if (it.price < r.min) r.min = it.price; if (it.price > r.max) r.max = it.price; }
    const cnp = cnpByUrl[it.url];
    if (cnp && productByEan[it.ean]) (cnpToProducts[cnp] = cnpToProducts[cnp] || new Set()).add(productByEan[it.ean]);
    if (Array.isArray(it.variants)) for (const v of it.variants) if (v.volume_ml > 0) (volsByEan[it.ean] = volsByEan[it.ean] || new Set()).add(v.volume_ml);
  }
  const pickBest = list => list.slice().sort((a, b) => (isRealEan(b.ean) - isRealEan(a.ean)) || ((storeCountByEan[b.ean] || 0) - (storeCountByEan[a.ean] || 0)))[0];

  const fpIndex = {}, byBrand = {}, looseIndex = {};
  for (const p of seed.products) {
    const fp = productFingerprint(p); if (fp && !fpIndex[fp]) fpIndex[fp] = p;
    const b = normalizeBrand(p.brand); if (!b) continue;
    (byBrand[b] = byBrand[b] || []).push(p);
    const k = looseMatchKey(p.name, b); if (k) (looseIndex[b + '|' + k] = looseIndex[b + '|' + k] || []).push(p);
  }
  function volumeOk(target, fv) {
    if (!fv) return true;
    const tvs = new Set(volsByEan[target.ean] || []);
    const cv = extractVolumeMl(target.name); if (cv) tvs.add(cv);
    if (!tvs.size) return true;
    for (const tv of tvs) if (Math.abs(tv - fv) / Math.max(tv, fv) <= 0.06) return true;
    return false;
  }

  // Marca: a da loja, a não ser que seja lixo (o próprio nome da loja); senão,
  // a marca conhecida mais longa com que o título começa.
  const brandSet = new Map();
  for (const p of seed.products) { if (!p.brand) continue; const nb = norm(p.brand); if (nb.length >= 3 && !brandSet.has(nb)) brandSet.set(nb, p.brand); }
  const brandList = [...brandSet.keys()].sort((a, b) => b.length - a.length);
  function resolveBrand(item) {
    const v = (item.brand || '').trim();
    if (v && !(cfg.marcaLixo && cfg.marcaLixo.test(v))) return v;
    const tn = norm(item.name);
    for (const nb of brandList) if (tn === nb || tn.startsWith(nb + ' ')) return brandSet.get(nb);
    return v || null;
  }

  let sp = seed.store_products.find(g => g.store_slug === SLUG);
  if (!sp) { sp = { store_slug: SLUG, items: [] }; seed.store_products.push(sp); }
  const itemByEan = {}; for (const it of sp.items) itemByEan[it.ean] = it;
  if (!seed.stores.some(s => s.slug === SLUG)) {
    seed.stores.push({ slug: SLUG, logo_url: null, ...cfg.loja });
    console.log(`🏬 Loja "${SLUG}" registada em seed.stores[].`);
  }

  const n = { ean: 0, cnp: 0, fp: 0, loose: 0, fuzzy: 0, criados: 0, semMarca: 0, semPar: 0, vol: 0, preco: 0, cnpMarca: 0, added: 0, updated: 0 };
  const addedC = { value: 0 }, updatedC = { value: 0 };

  for (const ep of items) {
    const brand = resolveBrand(ep);
    const nb = normalizeBrand(brand);
    let target = null;

    if (isRealEan(ep.ean) && productByEan[ep.ean]) { target = productByEan[ep.ean]; n.ean++; }
    if (!target && isCnp(ep.cnp) && cnpToProducts[ep.cnp]) {
      const cands = [...cnpToProducts[ep.cnp]];
      const ok = cands.filter(c => { const cb = normalizeBrand(c.brand); return !cb || !nb || cb === nb || GENERIC_BRAND_LABELS.has(cb); });
      if (ok.length) { target = pickBest(ok); n.cnp++; } else n.cnpMarca++;
    }
    if (!target && brand) {
      const fp = productFingerprint({ name: ep.name, brand });
      if (fp && fpIndex[fp]) { target = fpIndex[fp]; n.fp++; }
    }
    if (!target && brand) {
      const lk = looseMatchKey(ep.name, brand);
      const cands = lk ? (looseIndex[nb + '|' + lk] || []) : [];
      const lm = cands.find(c => { const cv = extractVolumeMl(ep.name), sv = extractVolumeMl(c.name); return !(cv && sv && Math.abs(cv - sv) / Math.max(cv, sv) > 0.06); });
      if (lm) { target = lm; n.loose++; }
    }
    if (!target && brand) {
      const fz = safeFuzzyMatch({ name: ep.name, brand }, byBrand[nb] || []);
      if (fz) { target = fz.product; n.fuzzy++; }
    }
    if (!target) {
      // Criar só com código (EAN real ou CNP) e só dermocosmética reconhecida.
      const dermo = cfg.criarDermo ? classifyDermo(ep.name) : null;
      if (!dermo || !(isRealEan(ep.ean) || isCnp(ep.cnp)) || !brand) { if (!brand) n.semMarca++; n.semPar++; continue; }
      const novoEan = isRealEan(ep.ean) ? ep.ean : `${SLUG}-${ep.cnp}`;
      if (productByEan[novoEan]) { target = productByEan[novoEan]; }
      else {
        target = { ean: novoEan, name: ep.name, brand: displayBrand(brand) || brand, category: dermo, image_url: ep.image_url || null, _source: `${SLUG}-catalog` };
        seed.products.push(target); productByEan[novoEan] = target;
        const fp = productFingerprint(target); if (fp && !fpIndex[fp]) fpIndex[fp] = target;
        n.criados++;
      }
    }
    if (!volumeOk(target, ep.volume_ml || extractVolumeMl(ep.name))) { n.vol++; continue; }
    const pr = priceRangeByEan[target.ean];
    if (pr && (ep.price > pr.max * 3 || ep.price < pr.min / 3)) { n.preco++; continue; }
    if (!target.image_url && ep.image_url) target.image_url = ep.image_url;

    const r = upsertStoreItem({ storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC }, target.ean, { ...ep, brand }, feed.scraped_at);
    if (r.action === 'added') n.added++; else if (r.action === 'merged') n.updated++;
  }

  console.log(`══════ Resumo (${SLUG}) ══════`);
  console.log(`  Casados por EAN / CNP / fingerprint / nome / fuzzy: ${n.ean} / ${n.cnp} / ${n.fp} / ${n.loose} / ${n.fuzzy}`);
  console.log(`  Produtos novos (dermo, com código): ${n.criados}`);
  console.log(`  Sem par (não criados): ${n.semPar}  (sem marca: ${n.semMarca})  · CNP de outra marca: ${n.cnpMarca}`);
  console.log(`  Recusados — volume: ${n.vol} · preço >3× fora: ${n.preco}`);
  console.log(`  Ofertas ${SLUG}: +${n.added} novas, ${n.updated} actualizadas (total ${sp.items.length})`);

  if (DRY_RUN) { console.log('\n🧪 --dry-run: seed NÃO gravado.'); return; }
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ ${SEED_BUNDLE} actualizado (${(fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1)} MB)`);
  const run = (label, a) => { console.log(`\n▶ ${label}…`); const r = spawnSync('node', a, { cwd: ROOT, stdio: 'inherit' }); if (r.status !== 0) console.warn(`⚠ ${label} falhou — continuar.`); };
  if (n.criados) {
    run('dedup-audit', [path.join(ROOT, 'scripts', 'dedup-audit.js'), '--apply']);
    run('apply-cnp-merge', [path.join(ROOT, 'scripts', 'apply-cnp-merge.js'), '--apply']);
  }
  if (NO_INJECT) { console.log('↩  --no-inject: não re-injectado.'); return; }
  run('Re-injectar no demo/index/catalogo', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')]);
  console.log(`\n✅ Integração ${SLUG} completa.`);
}

module.exports = { integrarFarmacia };
