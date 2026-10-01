#!/usr/bin/env node
/**
 * CosMath — scraper da Farmácia Perto de Mim (farmaciapertodemim.pt) · loja 95
 * ===========================================================================
 * Farmácias do Grupo FarmaAfonso (Barcelos/Porto), loja online à medida
 * (Nuxt): ~7.000 fichas no mapa do site, cada uma com JSON-LD Product — marca,
 * preço, stock e sku = CNP (7 dígitos). SEM EAN: casa por CNP (via os
 * catálogos das outras farmácias) e, sem par, cria dermo com código
 * `farmaciapertodemim-<cnp>`.
 *
 * PORQUE ENTROU (2026-10-01, amostra de 150 fichas, 91 com EAN conhecido pelo
 * mapa CNP→EAN): 1,18× a mediana, a mais barata em 5% — CARA, entra para
 * alargar a comparação (34% de produtos novos). Acessível dos runners
 * (sondar-acesso.yml, 2026-10-01).
 *
 * Genérico: scripts/lib/fichas-jsonld.js. Saída: data/catalog/farmaciapertodemim-full.json
 * Uso: node scripts/scrape-farmaciapertodemim-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherFichas } = require('./lib/fichas-jsonld');

const BASE = 'https://farmaciapertodemim.pt';
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'farmaciapertodemim-full.json');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

(async () => {
  const t0 = Date.now();
  const r = await recolherFichas({
    sitemap: `${BASE}/sitemap.xml`,
    filtroUrl: /\/produtos\/[^/]+\/?$/i,
    concorrencia: 3, pausaMs: 400,
    limite: args.limite ? Number(args.limite) : undefined,
    aoProgresso: (f, t, n) => console.log(`  ${f}/${t} fichas · ${n} produtos`),
  });
  console.log(`  mapa do site: ${r.total} · lidas: ${r.lidas} · produtos: ${r.produtos.length} (com CNP: ${r.produtos.filter(p => p.cnp).length}, com EAN: ${r.produtos.filter(p => p.ean).length}) · sem produto/404: ${r.semProduto} · falhas: ${r.falhas}`);
  if (!args.limite && r.produtos.length < 4000) { console.error(`✗ Só ${r.produtos.length} produtos (mínimo 4.000; ~7.000 fichas a 2026-10-01). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: BASE, in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
