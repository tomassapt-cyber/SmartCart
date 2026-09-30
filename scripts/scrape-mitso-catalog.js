#!/usr/bin/env node
/**
 * CosMath — scraper da Mitso (occasion2smile.com) · loja 84
 * Entrou a 2026-09-30: a maior loja portuguesa só de cosmética coreana (Mitso, domínio occasion2smile.com), 1,19× a mediana; EAN no barcode. O vendor é o nome da loja; a marca vem no título ("SOMEBYMI - Produto - descrição").
 * Shopify: lista do mapa do site, cada produto pelo /products/<handle>.js (EAN no
 * barcode, sku) — ver scripts/lib/shopify-loja.js.
 * Saída: data/catalog/mitso-full.json · Uso: node scripts/scrape-mitso-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherShopify } = require('./lib/shopify-loja');

const BASE = 'https://occasion2smile.com';
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'mitso-full.json');
const MARCA_LIXO = /occasion2smile|mitso/i;
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

(async () => {
  const t0 = Date.now();
  const limpaNome = s => String(s || '').split(/\s+-\s+/).slice(0, 2).join(' ').replace(/\s+/g, ' ').trim();
  const r = await recolherShopify(BASE, {
    limpaNome: s => limpaNome(s),
    limite: args.limite ? Number(args.limite) : undefined,
    aoProgresso: (n, total) => console.log(`  ${n}/${total} produtos lidos`),
  });
  // O vendor é o nome da loja: a marca é o primeiro segmento do título original.
  for (const p of r.produtos) if (!p.brand || MARCA_LIXO.test(p.brand)) p.brand = (p._tituloOriginal || '').split(/\s+-\s+/)[0].trim() || null;

  console.log(`  mapa do site: ${r.handles} · retirados (404): ${r.retirados} · falhas: ${r.falhas} · entradas: ${r.produtos.length} · com EAN: ${r.produtos.filter(p => p.ean).length} · com CNP: ${r.produtos.filter(p => p.cnp).length}`);
  if (!args.limite && r.produtos.length < 350) { console.error(`✗ Só ${r.produtos.length} produtos (mínimo 350). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: BASE, in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
