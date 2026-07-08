#!/usr/bin/env node
/**
 * CosMath — Auditoria de PREÇOS TRUNCADOS (guarda anti-vírgula-decimal)
 * ============================================================
 * Caso real (2026-07-08): o JSON-LD da mycosmetics emite vírgula decimal
 * ("7,48") e parseFloat truncava para 7 → 100% do catálogo com preços errados
 * durante uma semana. O sintoma é inconfundível: percentagem ANORMAL de preços
 * inteiros num catálogo (normal: 2-10%; fastpharma legitimamente ~40% por
 * pricing redondo — verificado ao vivo; truncagem: >85%).
 *
 * Este script corre no quality-monitor: catálogo com >85% de preços inteiros
 * (e n≥100) → exit 1 (workflow vermelho → email). Whitelist para lojas cujo
 * pricing redondo seja GENUÍNO e verificado à mão.
 *
 * Uso: node scripts/audit-truncated-prices.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const THRESHOLD = 0.85;
const MIN_N = 100;
// lojas com pricing-redondo GENUÍNO confirmado ao vivo (página mostra X.00€)
const WHITELIST = new Set([]);

let bad = [];
for (const f of fs.readdirSync(CATALOG_DIR)) {
  if (!f.endsWith('-full.json')) continue;
  const slug = f.replace('-full.json', '');
  if (WHITELIST.has(slug)) continue;
  let c; try { c = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, f), 'utf8')); } catch { continue; }
  const ps = (c.products || []).map(p => p.price).filter(p => p > 0);
  if (ps.length < MIN_N) continue;
  const share = ps.filter(p => Number.isInteger(p)).length / ps.length;
  if (share > THRESHOLD) bad.push({ slug, n: ps.length, pct: Math.round(share * 100) });
}

console.log('══════ audit-truncated-prices ══════');
if (!bad.length) { console.log('✅ Nenhum catálogo com sinal de truncagem (todos <' + Math.round(THRESHOLD * 100) + '% inteiros).'); process.exit(0); }
for (const b of bad) console.log(`  🚨 ${b.slug}: ${b.pct}% de preços INTEIROS em ${b.n} produtos — provável vírgula-decimal truncada (usar parsePriceEU no scraper!)`);
process.exit(1);
