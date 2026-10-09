#!/usr/bin/env node
'use strict';
/**
 * CosMath — recolha da SkinLovers (skinlovers.com, Skinlovers Lda, Braga) · dermocosmética, ~3.900 produtos.
 * Shopify: preços e stock em bloco pelo /products.json; GTIN de cada variante
 * lido uma vez no /products/<handle>.js e guardado em data/catalog/skinlovers-gtin.json.
 * Bot declarado, robots.txt cumprido, pára em 403/429/desafio sem gravar
 * (scripts/lib/shopify-existentes.js). Preços do mercado Portugal (/pt-pt), os mesmos da ficha que o cliente abre.
 * Saída: data/catalog/skinlovers-full.json · Uso: node scripts/scrape-skinlovers-catalog.js [--limite=N]
 * (com --limite o feed sai marcado como parcial e o integrador recusa-o).
 */
const fs = require('fs'), path = require('path');
const { recolher } = require('./lib/shopify-existentes');

const PASTA = path.join(__dirname, '..', 'data', 'catalog');
const OUT = path.join(PASTA, 'skinlovers-full.json');
const CACHE = path.join(PASTA, 'skinlovers-gtin.json');
const limite = Number((process.argv.find(a => a.startsWith('--limite=')) || '').split('=')[1]) || undefined;

// uma variante por linha, ordenadas: diffs pequenos no git
const gravarCache = c => fs.writeFileSync(CACHE, '{\n' + Object.keys(c).sort((a, b) => Number(a) - Number(b)).map(k => `${JSON.stringify(k)}:${JSON.stringify(c[k])}`).join(',\n') + '\n}\n');

(async () => {
  const t0 = Date.now();
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  let r;
  // a cache guarda-se mesmo se a recolha parar a meio: os GTIN lidos continuam certos
  try {
    r = await recolher({
      origem: 'https://www.skinlovers.com', prefixo: 'https://www.skinlovers.com/pt-pt', cache, minimo: 2500, limite,
      aoProgresso: (n, total) => console.log(`  GTIN: ${n}/${total} produtos novos lidos`),
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
