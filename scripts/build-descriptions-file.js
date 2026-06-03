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
const TRANSLATIONS = path.join(ROOT, 'data', 'translations.json');
const DRY_RUN = process.argv.includes('--dry-run');

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));

  // Overlay de tradução PT (opcional, não-destrutivo): se um EAN tiver uma
  // descrição traduzida aqui, ela tem prioridade sobre a descrição raw do
  // seed — assim descriptions.json sai 100% PT sem tocar no seed.
  let trDesc = {};
  try {
    trDesc = (JSON.parse(fs.readFileSync(TRANSLATIONS, 'utf8')).descriptions) || {};
  } catch { /* sem overlay → usa só o seed */ }

  // EANs com pelo menos uma oferta (≈ "visível"): evita expor descrições de
  // produtos órfãos. Não replicamos o filtro stale/stock completo do inject
  // de propósito — o front-end já só pede a descrição de produtos que mostra.
  const hasOffer = new Set();
  for (const sp of seed.store_products)
    for (const it of sp.items) hasOffer.add(it.ean);

  const map = {};
  let translated = 0;
  for (const p of seed.products) {
    if (!hasOffer.has(p.ean)) continue;
    const text = trDesc[p.ean] || p.description;
    if (!text) continue;
    if (trDesc[p.ean]) translated++;
    map[p.ean] = text;
  }

  const out = { generated_at: new Date().toISOString(), count: Object.keys(map).length, map };
  const json = JSON.stringify(out);
  console.log(`📝 Descrições exportadas: ${out.count} (de ${seed.products.length} produtos)`);
  if (translated) console.log(`   ↳ ${translated} com tradução PT do overlay`);
  console.log(`   tamanho: ${(json.length / 1024 / 1024).toFixed(1)} MB`);

  if (DRY_RUN) { console.log('\n[DRY-RUN] Não escrito.'); return; }
  fs.writeFileSync(OUT, json, 'utf8');
  console.log(`\n✓ ${OUT.replace(ROOT, '.')}`);
})();
