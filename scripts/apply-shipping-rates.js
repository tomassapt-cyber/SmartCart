#!/usr/bin/env node
/**
 * Aplica data/shipping-rates.json aos custos de portes do seed + stores.json.
 *
 * Atualiza, por loja:
 *   • free_shipping_threshold  ← rates.free_threshold (null/never → 99999 sentinela,
 *     porque o frontend faz `Number(threshold || 0)` e 0 daria SEMPRE grátis)
 *   • shipping_zones.mainland  ← custo real de envio ao domicílio (continente)
 *   • shipping_zones.madeira/acores ← só quando há valor numérico real (senão mantém)
 *
 * NÃO mexe na UI nem na lógica — só nos DADOS. A comparação (que já soma
 * `subtotal >= threshold ? 0 : shipping_zones[zona]`) passa a usar valores reais.
 *
 * Uso: node scripts/apply-shipping-rates.js [--dry-run]
 *   (depois corre node scripts/inject-seed-into-demo.js)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RATES = path.join(ROOT, 'data', 'shipping-rates.json');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const STORES = path.join(ROOT, 'data', 'stores.json');
const DRY = process.argv.includes('--dry-run');
const NEVER_FREE = 99999;

const load = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const rates = load(RATES).stores;
const seed = load(SEED);
const storesDoc = load(STORES);

function resolve(slug) {
  const r = rates[slug];
  if (!r) return null;
  const threshold = (r.free_threshold == null) ? NEVER_FREE : r.free_threshold;
  const mainland = (typeof r.zones?.mainland === 'number') ? r.zones.mainland : null;
  const madeira = (typeof r.zones?.madeira === 'number') ? r.zones.madeira : null;
  const acores = (typeof r.zones?.acores === 'number') ? r.zones.acores : null;
  return { threshold, mainland, madeira, acores };
}

function patchStore(store, key) {
  const r = resolve(key);
  if (!r) return null;
  const before = { thr: store.free_shipping_threshold, zones: { ...(store.shipping_zones || {}) } };
  store.free_shipping_threshold = r.threshold;
  store.shipping_zones = store.shipping_zones || { mainland: 0, madeira: 1.5, acores: 1.5 };
  if (r.mainland != null) store.shipping_zones.mainland = r.mainland;
  if (r.madeira != null) store.shipping_zones.madeira = r.madeira;
  if (r.acores != null) store.shipping_zones.acores = r.acores;
  return { before, after: { thr: store.free_shipping_threshold, zones: { ...store.shipping_zones } } };
}

console.log('Loja              | threshold (antes→dep) | mainland (antes→dep)');
console.log('------------------|------------------------|---------------------');
let n = 0;
for (const store of seed.stores) {
  const res = patchStore(store, store.slug);
  if (res) {
    n++;
    const thrTxt = `${res.before.thr ?? '-'} → ${res.after.thr}`;
    const mlTxt = `${res.before.zones.mainland ?? '-'} → ${res.after.zones.mainland}`;
    console.log(`${store.slug.padEnd(18)}| ${thrTxt.padEnd(22)} | ${mlTxt}`);
  }
}
// stores.json (id) — para durabilidade no build-demo-seed
for (const s of (storesDoc.stores || [])) patchStore(s, s.id);

console.log(`\n${n} lojas atualizadas no seed.`);
if (DRY) { console.log('🧪 --dry-run: nada gravado.'); process.exit(0); }
fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
fs.writeFileSync(STORES, JSON.stringify(storesDoc, null, 2), 'utf8');
console.log('✔ seed-bundle.json + stores.json gravados. Corre: node scripts/inject-seed-into-demo.js');
