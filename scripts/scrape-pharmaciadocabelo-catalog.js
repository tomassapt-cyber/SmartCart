#!/usr/bin/env node
/**
 * CosMath — scraper da Pharmácia do Cabelo (pharmaciadocabelo.com) · loja 92
 * Entrou a 2026-10-01: cabelo profissional (Kérastase, L'Oréal Professionnel, Redken, Wella, Moroccanoil…), Shopify, ~1.460 produtos; EAN no barcode, vendor = marca. 0,87× a mediana, a mais barata em 51% dos comuns, 59% de EAN novos (amostra de 111, 2026-10-01). ⚠️ Corta quem pede depressa (429 «Verifying your connection») — pausa de 1,5 s.
 * Shopify: lista do mapa do site, cada produto pelo /products/<handle>.js (EAN no
 * barcode, sku) — ver scripts/lib/shopify-loja.js.
 * Saída: data/catalog/pharmaciadocabelo-full.json · Uso: node scripts/scrape-pharmaciadocabelo-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherShopify } = require('./lib/shopify-loja');

const BASE = 'https://pharmaciadocabelo.com';
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'pharmaciadocabelo-full.json');
const MARCA_LIXO = /pharm[aá]cia do cabelo/i;
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

(async () => {
  const t0 = Date.now();
  const limpaNome = s => String(s || '').replace(/\s+/g, ' ').trim();
  const r = await recolherShopify(BASE, {
    limpaNome: s => limpaNome(s),
    limite: args.limite ? Number(args.limite) : undefined,
    pausaMs: 1500,
    aoProgresso: (n, total) => console.log(`  ${n}/${total} produtos lidos`),
  });
  console.log(`  mapa do site: ${r.handles} · retirados (404): ${r.retirados} · falhas: ${r.falhas} · entradas: ${r.produtos.length} · com EAN: ${r.produtos.filter(p => p.ean).length} · com CNP: ${r.produtos.filter(p => p.cnp).length}`);
  if (!args.limite && r.produtos.length < 1000) { console.error(`✗ Só ${r.produtos.length} produtos (mínimo 1000). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: BASE, in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
