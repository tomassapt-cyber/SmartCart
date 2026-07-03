#!/usr/bin/env node
/**
 * CosMath — Dedup de variantes de GTIN (UPC-A 12 díg ↔ EAN-13 com zero à frente)
 * ============================================================
 * O MESMO produto físico tem um único código de barras global (GTIN), mas as
 * lojas codificam-no com padding diferente:
 *   UPC-A  850045076290   (12 díg, típico de produtos US)
 *   EAN-13 0850045076290  (13 díg = 0 + UPC-A)
 *   GTIN-14 00850045076290 (14 díg = 00 + UPC-A)
 * Todos são O MESMO NÚMERO. Sem normalização, o produto parte-se em 2-3 cards
 * e os preços NÃO comparam (ex.: Olaplex Nº5P estava em `850045076290` só com
 * druni/notino/primor e `0850045076290` com atida/lojafarmacia — dois cards).
 *
 * Canonicalização SEGURA: remover só ZEROS à esquerda. Isto unifica apenas as
 * codificações do mesmo GTIN de retalho — um GTIN-14 de CAIXA (indicador ≠ 0,
 * ex.: `1085…`) NÃO começa por zero, logo NUNCA é fundido com a unidade.
 * GTINs são números globais únicos → dois produtos com o mesmo valor numérico
 * SÃO o mesmo produto (sem risco de over-merge).
 *
 * `mergeEanVariants(seed)` opera EM MEMÓRIA (usado pelo overlay do inject, que
 * corre a cada refresh) e o CLI `--apply` grava o seed. Idempotente.
 *
 * Uso:
 *   node scripts/dedup-ean-variants.js            # audit (dry-run)
 *   node scripts/dedup-ean-variants.js --apply
 *   node scripts/dedup-ean-variants.js --apply --no-inject
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

// GTIN de retalho: 12-14 díg, sem placeholders. Núcleo (sem zeros à esquerda)
// tem de manter >= 11 díg (evita fundir por acidente números curtos/corrompidos).
const isGtin = e => /^\d{12,14}$/.test(String(e || '')) && !/0{6,}/.test(String(e));
const canonCore = e => String(e).replace(/^0+/, '');

/**
 * Funde variantes de GTIN (zeros à esquerda) num objecto seed EM MEMÓRIA.
 * Devolve { merged, remapped, groups, pick } (para relatórios do CLI).
 */
function mergeEanVariants(seed) {
  const eanCount = {};
  for (const p of seed.products) eanCount[p.ean] = (eanCount[p.ean] || 0) + 1;
  const productByEan = {};
  for (const p of seed.products) if (eanCount[p.ean] === 1) productByEan[p.ean] = p;
  const offersByEan = {};
  for (const sp of seed.store_products) for (const it of sp.items) offersByEan[it.ean] = (offersByEan[it.ean] || 0) + 1;

  const byCore = {};
  for (const p of seed.products) {
    const e = p.ean;
    if (eanCount[e] !== 1 || !isGtin(e)) continue;
    const core = canonCore(e);
    if (core.length < 11) continue;
    (byCore[core] ||= new Set()).add(e);
  }
  const groups = Object.values(byCore).map(s => [...s]).filter(a => a.length >= 2);
  const pick = eans => eans.slice().sort((a, b) =>
    (offersByEan[b] || 0) - (offersByEan[a] || 0)
    || (b.length === 13 ? 1 : 0) - (a.length === 13 ? 1 : 0)
    || String(a).localeCompare(String(b)))[0];

  const eanRemap = {};
  for (const eans of groups) { const canon = pick(eans); for (const e of eans) if (e !== canon) eanRemap[e] = canon; }
  if (!Object.keys(eanRemap).length) return { merged: 0, remapped: 0, groups, pick, productByEan, offersByEan };

  let remapped = 0;
  for (const sp of seed.store_products) {
    const seen = new Map(); const out = [];
    for (const item of sp.items) {
      const r = eanRemap[item.ean] || item.ean;
      if (seen.has(r)) { const i = seen.get(r); const newer = (item.verified_at || '') > (out[i].verified_at || '') ? item : out[i]; out[i] = { ...newer, ean: r }; remapped++; continue; }
      seen.set(r, out.length); out.push({ ...item, ean: r });
    }
    sp.items = out;
  }
  for (const eans of groups) { const canon = pick(eans); const cp = productByEan[canon]; for (const e of eans) { if (e === canon || !cp) continue; const dp = productByEan[e]; if (cp && !cp.image_url && dp?.image_url) cp.image_url = dp.image_url; } }
  const drop = new Set(Object.keys(eanRemap));
  seed.products = seed.products.filter(p => !drop.has(p.ean));
  return { merged: drop.size, remapped, groups, pick, productByEan, offersByEan };
}

module.exports = { mergeEanVariants, isGtin, canonCore };

// ── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const { spawnSync } = require('child_process');
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  const APPLY = !!args.apply;
  const NO_INJECT = !!args['no-inject'];
  const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));

  if (!APPLY) {
    // dry-run: só relatar (não muta o ficheiro).
    const preview = JSON.parse(JSON.stringify(seed));
    const r = mergeEanVariants(preview);
    console.log(`📊 ${seed.products.length} produtos · ${r.groups.length} grupos de GTIN-variante a fundir`);
    console.log('═══ Exemplos ═══');
    r.groups.slice(0, 10).forEach(eans => {
      const canon = r.pick(eans);
      console.log(`▸ keep ${canon} (${r.offersByEan[canon] || 0} lojas) «${(r.productByEan[canon]?.name || '').slice(0, 42)}»  ⟵ ${eans.filter(e => e !== canon).join(', ')}`);
    });
    console.log('\n💡 Aplicar: node scripts/dedup-ean-variants.js --apply');
    process.exit(0);
  }

  const r = mergeEanVariants(seed);
  console.log(`═══ Resultado ═══\nProdutos fundidos: ${r.merged} · ofertas remapeadas: ${r.remapped}`);
  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')}`);
  if (!NO_INJECT) {
    const rr = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
    if (rr.status !== 0) console.warn('⚠ inject falhou.');
  }
}
