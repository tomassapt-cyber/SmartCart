#!/usr/bin/env node
/**
 * Inject homepage-data.json into the <script id="homepage-data"> block
 * of homepage.html, writing the result to index.html.
 *
 * Pipeline:
 *   build-homepage-data.js  → data/homepage-data.json (10 KB curated)
 *   inject-homepage-data.js → index.html (com data inlined)
 *
 * Uso: node scripts/inject-homepage-data.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'homepage.html');
const DATA = path.join(ROOT, 'data', 'homepage-data.json');
const OUT = path.join(ROOT, 'index.html');

const OPEN = '<script type="application/json" id="homepage-data">';
const CLOSE = '</script>';

if (!fs.existsSync(TEMPLATE)) { console.error('✗ homepage.html não encontrado'); process.exit(1); }
if (!fs.existsSync(DATA)) {
  console.error('✗ data/homepage-data.json não encontrado.');
  console.error('  Corre primeiro: node scripts/build-homepage-data.js');
  process.exit(1);
}

const html = fs.readFileSync(TEMPLATE, 'utf8');
const data = fs.readFileSync(DATA, 'utf8');

const o = html.indexOf(OPEN);
if (o === -1) { console.error('✗ <script id="homepage-data"> não encontrado em homepage.html'); process.exit(1); }
const afterOpen = o + OPEN.length;
const c = html.indexOf(CLOSE, afterOpen);
if (c === -1) { console.error('✗ </script> de fecho não encontrado'); process.exit(1); }

const newBlock = '\n' + data + '\n';
const out = html.slice(0, afterOpen) + newBlock + html.slice(c);
fs.writeFileSync(OUT, out, 'utf8');

const kb = (out.length / 1024).toFixed(0);
console.log(`✔ ${OUT.replace(ROOT, '.')} (${kb} KB)`);
console.log(`  Injected ${data.length} bytes of homepage-data into <script id="homepage-data">`);
