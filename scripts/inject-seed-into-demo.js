#!/usr/bin/env node
/**
 * Substitui o conteúdo do <script id="seed-data"> em demo.html pelo
 * seed gerado em data/seed-bundle.json. Operação idempotente.
 *
 * Uso: node scripts/inject-seed-into-demo.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEMO = path.join(ROOT, 'demo.html');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');

const html0 = fs.readFileSync(DEMO, 'utf8');
const seed = fs.readFileSync(SEED, 'utf8');

const OPEN = '<script type="application/json" id="seed-data">';
const CLOSE = '</script>';

const openIdx = html0.indexOf(OPEN);
if (openIdx === -1) { console.error('✗ Tag <script id="seed-data"> não encontrada em demo.html'); process.exit(1); }
const afterOpen = openIdx + OPEN.length;
const closeIdx = html0.indexOf(CLOSE, afterOpen);
if (closeIdx === -1) { console.error('✗ </script> de fecho não encontrado'); process.exit(1); }

// Adicionar um comentário identificativo no início do JSON injectado
const seedJson = JSON.parse(seed);
seedJson._comment = `Catálogo GirlMath v1 — gerado em ${new Date().toISOString()} · ${seedJson.products.length} SKUs · ${seedJson.stores.length} lojas · ${seedJson.store_products.reduce((s, sp) => s + sp.items.length, 0)} ofertas.`;

const newBlock = '\n' + JSON.stringify(seedJson) + '\n';
let next = html0.slice(0, afterOpen) + newBlock + html0.slice(closeIdx);

// Injectar também homepage-data (10KB) no <script id="hp-data"> se existir
const HP_DATA = path.join(ROOT, 'data', 'homepage-data.json');
const HP_OPEN = '<script type="application/json" id="hp-data">';
if (fs.existsSync(HP_DATA) && next.indexOf(HP_OPEN) !== -1) {
  const hpData = fs.readFileSync(HP_DATA, 'utf8');
  const hpOpenIdx = next.indexOf(HP_OPEN);
  const hpAfterOpen = hpOpenIdx + HP_OPEN.length;
  const hpCloseIdx = next.indexOf(CLOSE, hpAfterOpen);
  if (hpCloseIdx !== -1) {
    next = next.slice(0, hpAfterOpen) + '\n' + hpData + '\n' + next.slice(hpCloseIdx);
  }
}
const html = html0;
fs.writeFileSync(DEMO, next, 'utf8');

// Mirror para BOTH index.html (homepage) e catalogo.html (alias).
// O user quer o catálogo dinâmico com todas as features como homepage principal.
const INDEX = path.join(ROOT, 'index.html');
const CATALOGO = path.join(ROOT, 'catalogo.html');
fs.writeFileSync(INDEX, next, 'utf8');
fs.writeFileSync(CATALOGO, next, 'utf8');

const before = (html.length / 1024).toFixed(1);
const after = (next.length / 1024).toFixed(1);
console.log(`✔ ${DEMO}`);
console.log(`✔ ${INDEX} (homepage principal com catálogo)`);
console.log(`✔ ${CATALOGO} (alias /catalogo.html)`);
console.log(`  demo.html: ${before} KB → ${after} KB`);
console.log(`  seed: ${seedJson.products.length} produtos · ${seedJson.stores.length} lojas · ${seedJson.store_products.reduce((s,sp)=>s+sp.items.length,0)} ofertas`);
