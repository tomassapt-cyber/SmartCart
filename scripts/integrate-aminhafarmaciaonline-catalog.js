#!/usr/bin/env node
/**
 * GirlMath — Integrate aminhafarmaciaonline.pt catalog into seed
 * ============================================================
 *
 * aminhafarmaciaonline.pt NÃO traz EAN no data-layer (vazio); o GTIN-13 vem do
 * campo "mpn" do JSON-LD (só em parte dos produtos). Por isso o matching é
 * HÍBRIDO, em 3 níveis de confiança decrescente — mas TODOS seguros:
 *
 *   1. EAN real (mpn)                         → match forte (igual às outras lojas)
 *   2. Fingerprint nome+VOLUME exacto         → mesmo produto, nome equivalente
 *   3. Fuzzy SEGURO: mesma marca + MESMO volume + jaccard de tokens ≥ FUZZY_MIN
 *      → recupera variações de ordem/fraseado/língua SEM arriscar merges errados
 *         (o guard de volume elimina os 250↔500ml; o guard de marca+jaccard
 *          elimina colisões tipo "Nivea Creme" ↔ "Nivea Men Creme Fresh").
 *
 * POLÍTICA v1: só ENRIQUECE produtos que já temos (nunca cria novos). Como o
 * nosso seed é dermo-cosmética, isto restringe naturalmente a cosmética — os
 * produtos novos da loja (papas, suplementos, etc.) são ignorados.
 *
 * NUNCA altera nomes de produtos (fingerprint do dedup). Idempotente.
 *
 * Uso:
 *   node scripts/integrate-aminhafarmaciaonline-catalog.js [--dry-run] [--max=N] [--fuzzy=0.6]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  productFingerprint, productFingerprintWithVolume, normalizeBrand,
  extractVolumeMl, nameTokenSet, jaccard,
} = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const AMINHA_FULL = path.join(ROOT, 'data', 'catalog', 'aminhafarmaciaonline-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const DRY_RUN = !!args['dry-run'];
const MAX_PRODUCTS = args.max ? parseInt(args.max, 10) : Infinity;
const FUZZY_MIN = args.fuzzy ? parseFloat(args.fuzzy) : 0.7;  // 0.7 = banda verificada sem anomalias

const STORE_SLUG = 'aminhafarmaciaonline';

function loadJSON(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function isRealEan(ean) { return /^\d{12,14}$/.test(ean || ''); }

// ── Guards de segurança do fuzzy ─────────────────────────────────────────
// Mesmo com marca+volume+jaccard, há armadilhas que mudam o PRODUTO/PREÇO:
//   • SPF/FPS diferente  (SPF30 ≠ SPF50+)
//   • multipack          (250ml ≠ 2x250ml; "x 2" promo)
//   • linha/variante      (Creme ≠ "Men" Creme; adulto ≠ "Bebé"/"Junior")
// Se qualquer um diverge → NÃO é o mesmo produto → rejeita o match.
function spfOf(name) {
  const m = (name || '').match(/\b(?:spf|fps)\s*(\d{1,3})\s*(\+?)/i);
  return m ? m[1] + m[2] : null;
}
function packMultiplier(name) {
  const s = (name || '').toLowerCase();
  let m = s.match(/(\d+)\s*[x×]\s*\d/);        // "2x250"
  if (m) return parseInt(m[1], 10);
  m = s.match(/[x×]\s*(\d+)\b/);                 // "100ml x 2"
  if (m) return parseInt(m[1], 10);
  if (/\b(duo|pack|2\s*un|2\s*unid)\b/.test(s)) return 2;
  return 1;
}
const VARIANT_KW = ['men', 'homme', 'man', 'women', 'woman', 'mulher', 'bebe', 'bebé', 'baby', 'kids', 'kid', 'junior', 'infantil', 'child', 'pet'];
function variantFlags(name) {
  const s = ' ' + (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ';
  return VARIANT_KW.filter(k => s.includes(' ' + k.normalize('NFD').replace(/[̀-ͯ]/g, '') + ' ') || s.includes(' ' + k.normalize('NFD').replace(/[̀-ͯ]/g, '') + 's ')).sort().join(',');
}
// FORMATO/TEXTURA — definem o produto. Um gel-de-duche ≠ creme-de-duche.
const FORMAT_WORDS = new Set([
  'creme', 'crema', 'gel', 'gelcreme', 'oleo', 'óleo', 'locao', 'loção', 'leite', 'serum', 'sérum',
  'spray', 'fluido', 'fluida', 'emulsao', 'emulsão', 'solucao', 'solução', 'champo', 'champô',
  'shampoo', 'balsamo', 'bálsamo', 'mousse', 'espuma', 'pasta', 'pomada', 'unguento', 'agua', 'água',
  'sabonete', 'condicionador', 'mascara', 'máscara', 'po', 'pó', 'stick', 'barra', 'ampolas', 'ampola',
]);
// Tokenização CRUA (o nameTokenSet do lib remove palavras de formato, por isso
// não serve para o guard de formato). Aqui queremos ver "creme/gel/fluido/...".
function rawTokens(name) {
  return (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
}
const FORMAT_WORDS_NORM = new Set([...FORMAT_WORDS].map(w => w.normalize('NFD').replace(/[̀-ͯ]/g, '')));
function formatsOf(name) {
  const set = new Set();
  for (const t of rawTokens(name)) if (FORMAT_WORDS_NORM.has(t)) set.add(t);
  return set;
}
function formatGuardOk(aName, sName) {
  const fa = formatsOf(aName), fs2 = formatsOf(sName);
  if (fa.size === 0 || fs2.size === 0) return true;       // um lado não declara formato → ok
  for (const f of fa) if (fs2.has(f)) return true;        // partilham ≥1 formato → ok
  return false;                                            // formatos disjuntos → produtos diferentes
}

function fuzzyGuardOk(aName, sName) {
  const sa = spfOf(aName), ss = spfOf(sName);
  if (sa && ss && sa !== ss) return false;            // SPF diverge
  if (packMultiplier(aName) !== packMultiplier(sName)) return false; // multipack diverge
  if (variantFlags(aName) !== variantFlags(sName)) return false;     // linha/variante diverge
  if (!formatGuardOk(aName, sName)) return false;     // formato/textura diverge
  if (!distinctiveDiffOk(aName, sName)) return false; // token distintivo não-partilhado
  return true;
}

// Palavras GENÉRICAS (descritores de cosmética/farmácia) — diferenças só nestas
// são seguras. Se um nome tem um token distintivo (ex.: "pigmentbio", "verde",
// "original") que o outro não tem, são produtos/variantes diferentes → rejeita.
const GENERIC_WORDS = new Set([
  // tipos/texturas
  'creme', 'crema', 'cr', 'gel', 'gelcreme', 'locao', 'locão', 'leite', 'agua', 'água', 'spray',
  'fluido', 'fluida', 'emulsao', 'emulsão', 'solucao', 'solução', 'champo', 'champô', 'shampoo',
  'oleo', 'óleo', 'serum', 'sérum', 'balsamo', 'bálsamo', 'pasta', 'po', 'pó', 'mousse', 'espuma',
  'pomada', 'unguento', 'stick', 'roll', 'on', 'rollon', 'barra', 'sabonete', 'toalhitas',
  // áreas/funções genéricas
  'corporal', 'corpo', 'facial', 'rosto', 'capilar', 'maos', 'mãos', 'pes', 'pés', 'olhos', 'labial',
  'pele', 'intimo', 'íntimo', 'higiene', 'limpeza', 'hidratante', 'hidratacao', 'hidratação',
  'nutritivo', 'reparador', 'reparadora', 'protetor', 'protector', 'cuidado', 'tratamento',
  'antitranspirante', 'desodorizante', 'desodorante', 'lavante', 'micelar', 'relipidante',
  'aquosa', 'concentrado', 'suave', 'diario', 'diário', 'reequilibrante', 'regulador', 'reguladora',
  // conectores/unidades/ruído
  'com', 'de', 'da', 'do', 'e', 'para', 'sem', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'ao',
  'ml', 'g', 'gr', 'kg', 'l', 'mg', 'un', 'unid', 'x',
]);
function normTok(t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function distinctiveDiffOk(aName, sName) {
  const A = nameTokenSet(aName), S = nameTokenSet(sName);
  const inter = new Set([...A].filter(t => S.has(t)));
  for (const t of [...A, ...S]) {
    if (inter.has(t)) continue;
    const n = normTok(t);
    if (/^\d/.test(n)) continue;                 // números/volumes
    if (n.length <= 2) continue;                 // ruído curto
    if (GENERIC_WORDS.has(n)) continue;          // descritor genérico
    return false;                                // token distintivo não-partilhado → rejeita
  }
  return true;
}

(function main() {
  if (!fs.existsSync(AMINHA_FULL)) {
    console.error('✗ Não existe', AMINHA_FULL);
    console.error('  Corre primeiro: node scripts/scrape-aminhafarmaciaonline-catalog.js');
    process.exit(1);
  }
  const aminhaData = loadJSON(AMINHA_FULL);
  const seed = loadJSON(SEED_BUNDLE);
  if (!aminhaData?.products || !seed?.products) { console.error('✗ Estrutura inválida.'); process.exit(1); }

  let aminha = aminhaData.products.filter(p => p.status === 'ok' && p.price > 0 && p.name);
  console.log(`📦 aminhafarmaciaonline: ${aminhaData.products.length} entradas · ${aminha.length} com nome+preço (${aminha.filter(p => isRealEan(p.ean)).length} c/ EAN mpn)`);
  console.log(`📦 Seed actual:        ${seed.products.length} produtos, ${seed.stores.length} lojas · fuzzy_min=${FUZZY_MIN}\n`);

  aminha = aminha.slice(0, MAX_PRODUCTS);

  // Índices do seed
  const eanIndex = {}, fpIndex = {}, fpvIndex = {}, byBrandVol = {};
  for (const p of seed.products) {
    if (isRealEan(p.ean)) eanIndex[p.ean] = p;
    const fp = productFingerprint(p); if (fp && !fpIndex[fp]) fpIndex[fp] = p;
    const fpv = productFingerprintWithVolume(p); if (fpv && !fpvIndex[fpv]) fpvIndex[fpv] = p;
    const b = normalizeBrand(p.brand || ''), v = extractVolumeMl(p.name);
    if (b && v) { const k = b + '|' + v; (byBrandVol[k] = byBrandVol[k] || []).push(p); }
  }

  let sp = seed.store_products.find(g => g.store_slug === STORE_SLUG);
  if (!sp) { sp = { store_slug: STORE_SLUG, items: [] }; seed.store_products.push(sp); }

  // ── Auto-registo da loja (self-healing) ──────────────────────────────────
  if (!seed.stores.some(s => s.slug === STORE_SLUG)) {
    const FREE_SHIP_BY_TIER = { 1: 29, 2: 30, 3: 39, 4: 49, 5: 30, 6: 25, 7: 30 };
    let def = null;
    try { def = (loadJSON(path.join(ROOT, 'data', 'stores.json')).stores || []).find(s => s.id === STORE_SLUG); } catch (e) {}
    seed.stores.push({
      slug: STORE_SLUG,
      name: (def && def.nome) || 'A Minha Farmácia Online',
      base_url: (def && def.url) || 'https://www.aminhafarmaciaonline.pt',
      logo_url: (def && def.logo_url) || null,
      free_shipping_threshold: (def && def.free_shipping_threshold) || (def && FREE_SHIP_BY_TIER[def.tier]) || 39,
      shipping_zones: (def && def.shipping_zones) || { mainland: 0, madeira: 1.5, acores: 1.5 },
    });
    console.log(`🏬 Loja "A Minha Farmácia Online" registada em seed.stores[].`);
  }

  const itemByEan = {};
  for (const item of sp.items) itemByEan[item.ean] = item;

  let mEan = 0, mFpv = 0, mFuzzy = 0, unmatched = 0, added = 0, updated = 0;
  const addedC = { value: 0 }, updatedC = { value: 0 };
  const fuzzySamples = [];

  for (const ep of aminha) {
    let target = null, via = null;

    // 1. EAN real (mpn)
    if (ep.ean && eanIndex[ep.ean]) { target = eanIndex[ep.ean]; via = 'ean'; mEan++; }

    // 2. Fingerprint nome+volume exacto
    if (!target) {
      const fpv = productFingerprintWithVolume(ep);
      if (fpv && fpvIndex[fpv]) { target = fpvIndex[fpv]; via = 'fpv'; mFpv++; }
    }

    // 3. Fuzzy SEGURO: mesma marca + mesmo volume + jaccard ≥ FUZZY_MIN
    if (!target) {
      const b = normalizeBrand(ep.brand || ''), v = extractVolumeMl(ep.name);
      if (b && v) {
        const cands = byBrandVol[b + '|' + v] || [];
        if (cands.length) {
          const at = nameTokenSet(ep.name);
          let best = null, bestJ = -1;
          for (const c of cands) {
            if (!fuzzyGuardOk(ep.name, c.name)) continue;   // SPF/multipack/variante
            const j = jaccard(at, nameTokenSet(c.name));
            if (j > bestJ) { bestJ = j; best = c; }
          }
          if (best && bestJ >= FUZZY_MIN) {
            target = best; via = 'fuzzy'; mFuzzy++;
            fuzzySamples.push({ a: ep.name, s: best.name, j: bestJ });
          }
        }
      }
    }

    if (!target) { unmatched++; continue; }

    // Se o produto-alvo tinha EAN sintético e a aminha traz EAN real (mpn), faz upgrade.
    if (ep.ean && isRealEan(ep.ean) && !isRealEan(target.ean)) {
      const oldEan = target.ean;
      target.ean = ep.ean; eanIndex[ep.ean] = target; delete eanIndex[oldEan];
      for (const g of seed.store_products) for (const it of g.items) if (it.ean === oldEan) it.ean = ep.ean;
    }

    if (!target.image_url && ep.image_url) target.image_url = ep.image_url;

    const r = upsertStoreItem(
      { storeSp: sp, itemByEan, addedCounter: addedC, updatedCounter: updatedC },
      target.ean, ep, aminhaData.scraped_at
    );
    if (r.action === 'added') added++; else if (r.action === 'merged') updated++;
  }

  console.log('══════ Resumo da integração (aminhafarmaciaonline) ══════');
  console.log(`  Match por EAN (mpn):         ${mEan}`);
  console.log(`  Match nome+volume exacto:    ${mFpv}`);
  console.log(`  Match fuzzy seguro (≥${FUZZY_MIN}):  ${mFuzzy}`);
  console.log(`  Sem match (ignorados v1):    ${unmatched}`);
  console.log(`  Ofertas aminhafarmaciaonline:  +${added} adicionadas, ${updated} actualizadas (total ${sp.items.length})`);
  if (fuzzySamples.length) {
    const sorted = [...fuzzySamples].sort((a, b) => a.j - b.j);
    const toShow = args['list-fuzzy'] ? sorted : sorted.slice(0, 25); // banda MAIS BAIXA primeiro (mais arriscada)
    console.log(`\n  ${args['list-fuzzy'] ? 'TODOS' : '25 mais baixos'} matches FUZZY (jaccard asc — os mais arriscados primeiro):`);
    for (const s of toShow) { console.log(`    [${s.j.toFixed(2)}] aminha: ${s.a}`); console.log(`          seed: ${s.s}`); }
  }

  if (DRY_RUN) { console.log('\n🧪 --dry-run: seed NÃO gravado.'); return; }

  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✔ ${SEED_BUNDLE} actualizado (${(fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1)} MB)`);

  console.log('\n▶ dedup-audit...');
  if (spawnSync('node', [path.join(ROOT, 'scripts', 'dedup-audit.js'), '--apply'], { cwd: ROOT, stdio: 'inherit' }).status !== 0) console.warn('⚠ dedup-audit falhou.');
  console.log('\n▶ dedup-store-url...');
  if (spawnSync('node', [path.join(ROOT, 'scripts', 'dedup-store-url.js'), '--apply', '--no-inject'], { cwd: ROOT, stdio: 'inherit' }).status !== 0) console.warn('⚠ dedup-store-url falhou.');
  console.log('\n▶ normalize-brand-display...');
  if (spawnSync('node', [path.join(ROOT, 'scripts', 'normalize-brand-display.js'), '--apply', '--no-inject'], { cwd: ROOT, stdio: 'inherit' }).status !== 0) console.warn('⚠ normalize falhou.');
  console.log('\n▶ backfill-descriptions...');
  if (spawnSync('node', [path.join(ROOT, 'scripts', 'backfill-descriptions.js')], { cwd: ROOT, stdio: 'inherit' }).status !== 0) console.warn('⚠ backfill falhou.');
  console.log('\n▶ inject-seed-into-demo...');
  if (spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' }).status === 0) console.log('\n✅ Integração aminhafarmaciaonline completa.');
})();
