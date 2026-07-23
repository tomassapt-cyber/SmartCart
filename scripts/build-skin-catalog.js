#!/usr/bin/env node
/**
 * CosMath — skin.pt: montar catálogo a partir da colheita browser-pane
 * ============================================================
 * skin.pt (Magento) está atrás de Cloudflare Managed Challenge: curl/Node/nuvem
 * caem TODOS; só um Chromium real passa. A colheita faz-se DENTRO do Browser
 * pane (fetch in-page herda o cf_clearance httpOnly) e sai em chunks
 * `chunk-*.b64` = base64(gzip(JSON array de {u,n,b,s,g,p,st,i[,v]})).
 * Este script converte esses chunks no formato da casa.
 *
 * Fichas multi-tamanho vêm como JSON-LD **ProductGroup** (hasVariant[] com
 * sku=CNP e oferta POR TAMANHO): o harvester escolhe o tamanho de cabeça
 * (o que bate no preço do grupo, senão o mais barato em stock) e traz os
 * restantes em `v` → aqui viram `variants[]` estilo druni
 * ({volume_ml, unit, price, url:null}; só os em stock).
 *
 * JSON-LD da ficha: sku = CNP 7 díg na maioria (códigos internos longos são
 * descartados), gtin ausente, brand presente, price COM IVA (validado contra o
 * crowd do seed em 2026-07-23).
 *
 * Uso: node scripts/build-skin-catalog.js --dir=C:/caminho/chunks [--out=...]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DIR = args.dir ? path.resolve(String(args.dir)) : null;
const OUT = args.out ? path.resolve(String(args.out)) : path.join(ROOT, 'data', 'catalog', 'skin-full.json');
if (!DIR || !fs.existsSync(DIR)) { console.error('✗ --dir=<pasta com chunk-*.b64> obrigatório'); process.exit(1); }

function volumeFromName(name) {
  const m = (name || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const v = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}
function unitFromName(name) {
  const m = (name || '').match(/\d+(?:[.,]\d+)?\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null; const u = m[1].toLowerCase();
  return (u === 'ml' || u === 'l') ? 'ml' : 'g';
}

const files = fs.readdirSync(DIR).filter(f => /^chunk-.*\.b64$/.test(f)).sort();
if (!files.length) { console.error('✗ 0 chunks em', DIR); process.exit(1); }
const raw = [];
for (const f of files) {
  const b64 = fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\s+/g, '');
  const arr = JSON.parse(zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8'));
  raw.push(...arr);
  console.log(`  ${f}: ${arr.length} registos`);
}

const seen = new Set();
const stats = { dup: 0, noncosmetic: 0, nokey: 0, noprice: 0, ok: 0 };
const scraped_at = new Date().toISOString();
const products = [];
for (const r of raw) {
  if (!r || !r.u || seen.has(r.u)) { stats.dup++; continue; }
  seen.add(r.u);
  const name = (r.n || '').toString().replace(/\s+/g, ' ').trim();
  if (!name || isNonCosmetic(name)) { stats.noncosmetic++; continue; }
  const ean = /^\d{12,14}$/.test(r.g || '') && !/0{6,}/.test(r.g) ? String(r.g) : null;
  const cnp = /^\d{7}$/.test(r.s || '') ? String(r.s) : null;
  // sem chave (sku interno: Nivea/Revlon/… retalho) fica NO catálogo com
  // ean/cnp null — o integrador anexa-os por fingerprint+guard de volume.
  if (!ean && !cnp) stats.nokey++;
  const price = (typeof r.p === 'number' && isFinite(r.p) && r.p > 0) ? Math.round(r.p * 100) / 100 : null;
  if (price == null) { stats.noprice++; continue; }
  const variants = Array.isArray(r.v)
    ? r.v.filter(v => v && v.st && v.p > 0).map(v => ({ volume_ml: volumeFromName(v.n), unit: unitFromName(v.n), price: Math.round(v.p * 100) / 100, url: null }))
    : [];
  products.push({
    url: r.u, status: 'ok', scraped_at,
    name, brand: r.b || null, ean, cnp,
    image_url: r.i || null, price, previous_price: null,
    in_stock: r.st !== false, volume_ml: volumeFromName(name), category: null,
    variants: variants.length > 1 ? variants : [],
  });
  stats.ok++;
}

console.log(`\n══════ build skin-full ══════`);
console.log(`  brutos: ${raw.length} · ok: ${stats.ok} · dup: ${stats.dup} · não-cosmético: ${stats.noncosmetic} · sem chave: ${stats.nokey} · sem preço: ${stats.noprice}`);
console.log(`  com CNP: ${products.filter(p => p.cnp).length} · com EAN: ${products.filter(p => p.ean).length} · in_stock: ${products.filter(p => p.in_stock).length}`);
if (products.length === 0) { console.error('✗ 0 produtos — NÃO escrevo o catálogo.'); process.exit(1); }
fs.writeFileSync(OUT, JSON.stringify({ scraped_at, source: 'skin.pt (Magento; colheita browser-pane in-page, Cloudflare Challenge; JSON-LD sku=CNP)', in_progress: false, products }), 'utf8');
console.log(`\n✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
