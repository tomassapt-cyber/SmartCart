#!/usr/bin/env node
'use strict';
/**
 * CosMath — recolha da Glammy (glammy.pt = Farmácia de Gualtar, Farmácia Amado Braga Unip. Lda, Braga) · ~3.700 fichas.
 * Sem API: mapa do site (só as fichas em português) + JSON-LD de cada ficha (gtin, preço, preço riscado, stock).
 * Bot declarado, robots.txt e Crawl-delay cumpridos, pára em 403/429/desafio sem gravar
 * (scripts/lib/fichas-existentes.js). Páginas em windows-1252, descodificadas pelo charset do cabeçalho.
 * Saída: data/catalog/glammy-full.json · Uso: node scripts/scrape-glammy-catalog.js [--limite=N]
 * (com --limite o feed sai marcado como parcial e o integrador recusa-o).
 */
const fs = require('fs'), path = require('path');
const { recolher } = require('./lib/fichas-existentes');

const PASTA = path.join(__dirname, '..', 'data', 'catalog');
const OUT = path.join(PASTA, 'glammy-full.json');
const limite = Number((process.argv.find(a => a.startsWith('--limite=')) || '').split('=')[1]) || undefined;

(async () => {
  const t0 = Date.now();
  const r = await recolher({
    origem: 'https://www.glammy.pt', mapa: 'https://www.glammy.pt/sitemaps/sitemap_products_pt_1.xml',
    filtroFicha: /^https:\/\/www\.glammy\.pt\/pt\/.+_p\d+\.html$/, minimo: 2500, limite,
    aoProgresso: (n, total) => console.log(`  fichas: ${n}/${total}`),
  });
  fs.mkdirSync(PASTA, { recursive: true });
  // escrita atómica (temporário + renomear): um corte a meio não deixa o feed estragado
  fs.writeFileSync(OUT + '.tmp', JSON.stringify(r));
  fs.renameSync(OUT + '.tmp', OUT);
  console.log(`✓ ${r.sitemap_products} fichas no mapa · ${r.read} lidas · ${r.products.length} com GTIN e preço · sem GTIN ${r.counts.sem_gtin} · ` +
    `sem JSON-LD ${r.counts.sem_jsonld} · retiradas ${r.retired} · falhas ${r.failed} · pausa ${r.pause_ms} ms · ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
