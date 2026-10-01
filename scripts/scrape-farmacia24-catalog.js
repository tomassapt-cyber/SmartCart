#!/usr/bin/env node
/**
 * CosMath — scraper da Farmácia 24 (farmacia24.com) · loja 88
 * Entrou a 2026-09-30: farmácia online (Shopify, site em pt-PT), ~3.080 produtos; EAN no barcode em ~79% e CNP no sku em todos. 1,04× a mediana — preço de mercado; entra para alargar a comparação.
 * Shopify: lista do mapa do site, cada produto pelo /products/<handle>.js (EAN no
 * barcode, sku) — ver scripts/lib/shopify-loja.js.
 * Saída: data/catalog/farmacia24-full.json · Uso: node scripts/scrape-farmacia24-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherShopify } = require('./lib/shopify-loja');

const BASE = 'https://farmacia24.com';
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'farmacia24-full.json');
const MARCA_LIXO = /^farm[aá]cia ?24$/i;
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

(async () => {
  const t0 = Date.now();
  const limpaNome = s => String(s || '').replace(/\s+/g, ' ').trim();
  const r = await recolherShopify(BASE, {
    limpaNome: s => limpaNome(s),
    limite: args.limite ? Number(args.limite) : undefined,
    aoProgresso: (n, total) => console.log(`  ${n}/${total} produtos lidos`),
  });
  console.log(`  mapa do site: ${r.handles} · retirados (404): ${r.retirados} · falhas: ${r.falhas} · entradas: ${r.produtos.length} · com EAN: ${r.produtos.filter(p => p.ean).length} · com CNP: ${r.produtos.filter(p => p.cnp).length}`);
  if (!args.limite && r.produtos.length < 1500) { console.error(`✗ Só ${r.produtos.length} produtos (mínimo 1500). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: BASE, in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
