#!/usr/bin/env node
'use strict';
/**
 * CosMath — recolha da Coserty (coserty.com, Espanha; envia para Portugal) · cabelo profissional, ~3.800 produtos.
 * Ronda 9 de lojas (Desktop\duo\LOJAS-RONDA-9-2026-11-17.md): 91% dos produtos que tem em comum
 * connosco são produtos com 1–3 lojas, e vende abaixo da mediana (0,92).
 * Shopify, mercado Portugal em /pt: preços e stock em bloco pelo /pt/products.json; GTIN de cada
 * variante lido uma vez no /pt/products/<handle>.js e guardado em data/catalog/coserty-gtin.json.
 * Bot declarado com o identificador do CosMath, robots.txt cumprido, pára em 403/429/desafio sem
 * gravar (scripts/lib/shopify-existentes.js).
 * Saída: data/catalog/coserty-full.json · Uso: node scripts/scrape-coserty-catalog.js [--limite=N] [--max-gtin=N]
 * (com --limite o feed sai marcado como parcial e o integrador recusa-o).
 */
const fs = require('fs'), path = require('path');
const { recolher } = require('./lib/shopify-existentes');
const { UA_COSMATH } = require('./lib/leitura-alargada');

const PASTA = path.join(__dirname, '..', 'data', 'catalog');
const OUT = path.join(PASTA, 'coserty-full.json');
const CACHE = path.join(PASTA, 'coserty-gtin.json');
const limite = Number((process.argv.find(a => a.startsWith('--limite=')) || '').split('=')[1]) || undefined;
const maxJs = Number((process.argv.find(a => a.startsWith('--max-gtin=')) || '').split('=')[1]) || undefined; // leituras de GTIN nesta corrida (omissão: 600)

// uma variante por linha, ordenadas: diffs pequenos no git; escrita atómica (temporário + renomear)
const gravarCache = c => { fs.mkdirSync(PASTA, { recursive: true }); fs.writeFileSync(CACHE + '.tmp', '{\n' + Object.keys(c).sort((a, b) => Number(a) - Number(b)).map(k => `${JSON.stringify(k)}:${JSON.stringify(c[k])}`).join(',\n') + '\n}\n'); fs.renameSync(CACHE + '.tmp', CACHE); };

(async () => {
  const t0 = Date.now();
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  let r;
  try {
    r = await recolher({
      origem: 'https://www.coserty.com', prefixo: 'https://www.coserty.com/pt', ua: UA_COSMATH, cache, minimo: 2500, limite, maxJs,
      aoProgresso: (n, total) => { gravarCache(cache); console.log(`  GTIN: ${n}/${total} produtos novos lidos (cache gravada)`); },
    });
  } finally {
    gravarCache(cache);
  }
  fs.writeFileSync(OUT + '.tmp', JSON.stringify(r));
  fs.renameSync(OUT + '.tmp', OUT);
  console.log(`✓ ${r.bulk_products} produtos no bloco (${Math.round(r.coverage * 100)}% do mapa) · ${r.variants} variantes · ${r.products.length} linhas com GTIN · GTIN lidos ${r.gtin_lookups}, por ler ${r.gtin_pending} · ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
