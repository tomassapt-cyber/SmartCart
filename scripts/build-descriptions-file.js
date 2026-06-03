#!/usr/bin/env node
/**
 * SmartCart — Índice de descrições para o front-end
 * ============================================================
 *
 * Extrai as descrições já gravadas no seed-bundle.json (pela
 * backfill-descriptions.js) para um ficheiro separado e leve, que o
 * front-end carrega lazy ao abrir um produto — assim o texto NÃO volta
 * a inchar o HTML renderizado.
 *
 * Output: data/descriptions.json no formato
 *   { generated_at, count, map: { ean: "descrição…" } }
 *
 * Só inclui EANs VISÍVEIS (mesma regra do render: produto com pelo menos
 * uma oferta) para não expor texto de produtos ocultos. Idempotente.
 *
 * Uso: node scripts/build-descriptions-file.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const OUT = path.join(ROOT, 'data', 'descriptions.json');
const DRY_RUN = process.argv.includes('--dry-run');

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));

  // EANs com pelo menos uma oferta (≈ "visível"): evita expor descrições de
  // produtos órfãos. Não replicamos o filtro stale/stock completo do inject
  // de propósito — o front-end já só pede a descrição de produtos que mostra.
  const hasOffer = new Set();
  for (const sp of seed.store_products)
    for (const it of sp.items) hasOffer.add(it.ean);

  const map = {};
  for (const p of seed.products) {
    if (!p.description) continue;
    if (!hasOffer.has(p.ean)) continue;
    map[p.ean] = p.description;
  }

  const out = { generated_at: new Date().toISOString(), count: Object.keys(map).length, map };
  const json = JSON.stringify(out);
  console.log(`📝 Descrições exportadas: ${out.count} (de ${seed.products.length} produtos)`);
  console.log(`   tamanho: ${(json.length / 1024 / 1024).toFixed(1)} MB`);

  if (DRY_RUN) { console.log('\n[DRY-RUN] Não escrito.'); return; }
  fs.writeFileSync(OUT, json, 'utf8');
  console.log(`\n✓ ${OUT.replace(ROOT, '.')}`);
})();
