#!/usr/bin/env node
/**
 * CosMath — scraper da Loja do Shampoo (lojashampoo.pt) · loja 80
 * ================================================================
 * A ÚNICA VERTICAL QUE FALTAVA: cabelo profissional (Kérastase, Redken,
 * Olaplex, L'Oréal Professionnel…) — já assinalada na análise de candidatas de
 * 2026-07-30. Loja de Aveiro (Paula Ferreira), OpenCart, ~19.200 fichas com
 * JSON-LD limpo: gtin14 (= EAN-13 com zero à esquerda ou o próprio EAN), marca,
 * preço.
 *
 * PORQUE ENTROU (medido a 2026-09-30, amostra de 143 fichas com EAN): 0,99× a
 * mediana nos 67 produtos em comum, a mais barata em 21% — e 53% dos EAN são
 * NOVOS no CosMath (capilar profissional que as farmácias não vendem).
 *
 * Acesso: em 2026-09-28 a sonda do PC dava "bloqueio" por falso positivo (o
 * reCAPTCHA dos formulários); dos runners do GitHub a loja responde (sondar-
 * acesso.yml, 2026-09-30).
 *
 * Genérico: scripts/lib/fichas-jsonld.js. Saída: data/catalog/lojashampoo-full.json
 * Uso: node scripts/scrape-lojashampoo-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherFichas } = require('./lib/fichas-jsonld');

const OUT = path.join(__dirname, '..', 'data', 'catalog', 'lojashampoo-full.json');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

(async () => {
  const t0 = Date.now();
  const r = await recolherFichas({
    sitemap: 'https://www.lojashampoo.pt/sitemap_products.xml',
    concorrencia: 4, pausaMs: 300,
    limite: args.limite ? Number(args.limite) : undefined,
    aoProgresso: (f, t, n) => console.log(`  ${f}/${t} fichas · ${n} produtos`),
  });
  console.log(`  mapa do site: ${r.total} · lidas: ${r.lidas} · produtos: ${r.produtos.length} (com EAN: ${r.produtos.filter(p => p.ean).length}) · sem produto/404: ${r.semProduto} · falhas: ${r.falhas}`);
  if (!args.limite && r.produtos.length < 10000) { console.error(`✗ Só ${r.produtos.length} produtos (mínimo 10.000; ~19.000 a 2026-09-30). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'https://www.lojashampoo.pt', in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
