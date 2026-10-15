#!/usr/bin/env node
'use strict';
/**
 * CosMath — recolha da HaemiSkin (haemiskin.pt) · K-beauty, ~140 produtos (Shopify).
 *
 * Preços e stock em BLOCO pelo /products.json; o código de barras de cada
 * variante lê-se UMA vez no /products/<handle>.js e fica guardado em
 * data/catalog/haemiskin-gtin.json (scripts/lib/shopify-existentes.js — o
 * mesmo da SkinLovers e da Ilha dos Cosméticos). Bot declarado, robots.txt
 * cumprido, pára em 403/429/desafio sem gravar.
 *
 * Histórico: até 28/09 lia o JSON-LD de cada página (o tema novo deixou de o
 * ter); a 14/10 (#61) passou a ler o .js de TODOS os produtos em cada corrida —
 * a partir do PC funcionava, mas nos servidores do GitHub a Shopify respondia
 * 429 logo ao 1.º produto e a loja continuou parada. Com a cache, cada corrida
 * na nuvem faz ~4 pedidos (robots, mapa do site, /products.json) e só lê o .js
 * dos produtos novos (2026-10-15).
 *
 * Saída: data/catalog/haemiskin-full.json (variantes com GTIN válido; a 2.ª+
 * com ?variant=<id>). Uso:
 *   node scripts/scrape-haemiskin-catalog.js              # recolha completa
 *   node scripts/scrape-haemiskin-catalog.js --limit=20   # ensaio: não grava o catálogo
 *   node scripts/scrape-haemiskin-catalog.js --max-gtin=N # leituras de .js nesta corrida
 */
const fs = require('fs'), path = require('path');
const { recolher } = require('./lib/shopify-existentes');
const PASTA = path.join(__dirname, '..', 'data', 'catalog');
const OUT = path.join(PASTA, 'haemiskin-full.json');
const CACHE = path.join(PASTA, 'haemiskin-gtin.json');
const arg = n => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1];
const limite = Number(arg('limit') || arg('limite')) || undefined;
const maxJs = Number(arg('max-gtin')) || undefined;
// uma variante por linha, ordenadas: diffs pequenos no git; escrita atómica
const gravarCache = c => { fs.writeFileSync(CACHE + '.tmp', '{\n' + Object.keys(c).sort((a, b) => Number(a) - Number(b)).map(k => `${JSON.stringify(k)}:${JSON.stringify(c[k])}`).join(',\n') + '\n}\n'); fs.renameSync(CACHE + '.tmp', CACHE); };

(async () => {
  const t0 = Date.now();
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  let r;
  // a cache guarda-se mesmo se a recolha parar a meio: os GTIN lidos continuam certos
  try {
    r = await recolher({ origem: 'https://www.haemiskin.pt', cache, minimo: 80, limite, maxJs });
  } finally {
    fs.mkdirSync(PASTA, { recursive: true });
    gravarCache(cache);
  }
  if (limite) {
    console.log(`[--limit=${limite}] ensaio: ${r.products.length} variantes com GTIN — catálogo de produção NÃO escrito.`);
    return;
  }
  if (!r.products.length) throw new Error('0 variantes com GTIN — não gravo o catálogo');
  fs.writeFileSync(OUT + '.tmp', JSON.stringify(r));
  fs.renameSync(OUT + '.tmp', OUT);
  console.log(`✓ ${r.bulk_products} produtos (cobertura do mapa ${Math.round(r.coverage * 100)}%) · ${r.variants} variantes · ${r.products.length} com GTIN válido · ` +
    `sem GTIN ${r.counts.sem_gtin} · por ler ${r.counts.por_ler} · GTIN lidos nesta corrida ${r.gtin_lookups} (faltam ${r.gtin_pending}) · ${Math.round((Date.now() - t0) / 1000)} s`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
