#!/usr/bin/env node
'use strict';
/**
 * CosMath — recolha da Farmácia Cuida (farmaciacuida.com) · farmácia portuguesa, dermocosmética, ~5.800 produtos.
 * Shopify: preços e stock em bloco pelo /products.json; GTIN de cada variante
 * lido uma vez no /products/<handle>.js e guardado em data/catalog/farmaciacuida-gtin.json.
 * Bot declarado, robots.txt cumprido, pára em 403/429/desafio sem gravar
 * (scripts/lib/shopify-existentes.js). ~1/3 das variantes só tem CNP (sku de 7 dígitos), sem código de barras: ficam de fora.
 * Saída: data/catalog/farmaciacuida-full.json · Uso: node scripts/scrape-farmaciacuida-catalog.js [--limite=N] [--max-gtin=N]
 * (com --limite o feed sai marcado como parcial e o integrador recusa-o).
 */
const fs = require('fs'), path = require('path');
const { recolher } = require('./lib/shopify-existentes');

const PASTA = path.join(__dirname, '..', 'data', 'catalog');
const OUT = path.join(PASTA, 'farmaciacuida-full.json');
const CACHE = path.join(PASTA, 'farmaciacuida-gtin.json');
const limite = Number((process.argv.find(a => a.startsWith('--limite=')) || '').split('=')[1]) || undefined;
const maxJs = Number((process.argv.find(a => a.startsWith('--max-gtin=')) || '').split('=')[1]) || undefined; // leituras de GTIN nesta corrida (omissão: 600)

// uma variante por linha, ordenadas: diffs pequenos no git
// escrita atómica (temporário + renomear): um corte a meio não deixa a cache estragada
const gravarCache = c => { fs.mkdirSync(PASTA, { recursive: true }); fs.writeFileSync(CACHE + '.tmp', '{\n' + Object.keys(c).sort((a, b) => Number(a) - Number(b)).map(k => `${JSON.stringify(k)}:${JSON.stringify(c[k])}`).join(',\n') + '\n}\n'); fs.renameSync(CACHE + '.tmp', CACHE); };

(async () => {
  const t0 = Date.now();
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  let r;
  // a cache guarda-se mesmo se a recolha parar a meio: os GTIN lidos continuam certos
  try {
    r = await recolher({
      origem: 'https://farmaciacuida.com', prefixo: 'https://farmaciacuida.com', cache, minimo: 4000, limite, maxJs,
      // grava a cache a cada 100 leituras: um processo morto a meio (PC desligado) não perde o que já leu
      aoProgresso: (n, total) => { gravarCache(cache); console.log(`  GTIN: ${n}/${total} produtos novos lidos (cache gravada)`); },
    });
  } finally {
    fs.mkdirSync(PASTA, { recursive: true });
    gravarCache(cache);
  }
  fs.writeFileSync(OUT + '.tmp', JSON.stringify(r));
  fs.renameSync(OUT + '.tmp', OUT);
  console.log(`✓ ${r.bulk_products} produtos (cobertura do mapa ${Math.round(r.coverage * 100)}%) · ${r.variants} variantes · ${r.products.length} com GTIN válido · ` +
    `sem GTIN ${r.counts.sem_gtin} · por ler ${r.counts.por_ler} · GTIN lidos nesta corrida ${r.gtin_lookups} (faltam ${r.gtin_pending}) · ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
