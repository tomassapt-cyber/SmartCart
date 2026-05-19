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

const html = fs.readFileSync(DEMO, 'utf8');
const seed = fs.readFileSync(SEED, 'utf8');

const OPEN = '<script type="application/json" id="seed-data">';
const CLOSE = '</script>';

const openIdx = html.indexOf(OPEN);
if (openIdx === -1) { console.error('✗ Tag <script id="seed-data"> não encontrada em demo.html'); process.exit(1); }
const afterOpen = openIdx + OPEN.length;
const closeIdx = html.indexOf(CLOSE, afterOpen);
if (closeIdx === -1) { console.error('✗ </script> de fecho não encontrado'); process.exit(1); }

// Adicionar um comentário identificativo no início do JSON injectado
const seedJson = JSON.parse(seed);
seedJson._comment = `Catálogo SmartCartCosmetics v1 — gerado em ${new Date().toISOString()} · ${seedJson.products.length} SKUs · ${seedJson.stores.length} lojas · ${seedJson.store_products.reduce((s, sp) => s + sp.items.length, 0)} ofertas. Snapshot: 2026-05-11 06h00.`;

const newBlock = '\n' + JSON.stringify(seedJson) + '\n';
const next = html.slice(0, afterOpen) + newBlock + html.slice(closeIdx);
fs.writeFileSync(DEMO, next, 'utf8');

// Espelhar para index.html para Vercel/Netlify servirem da raiz sem rewrite
const INDEX = path.join(ROOT, 'index.html');
fs.writeFileSync(INDEX, next, 'utf8');

const before = (html.length / 1024).toFixed(1);
const after = (next.length / 1024).toFixed(1);
console.log(`✔ ${DEMO}`);
console.log(`✔ ${INDEX} (espelho para Vercel/Netlify)`);
console.log(`  demo.html: ${before} KB → ${after} KB`);
console.log(`  seed: ${seedJson.products.length} produtos · ${seedJson.stores.length} lojas · ${seedJson.store_products.reduce((s,sp)=>s+sp.items.length,0)} ofertas`);
