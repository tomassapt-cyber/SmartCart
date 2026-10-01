#!/usr/bin/env node
/**
 * CosMath — scraper da Farmácia Marques Braga (farmaciamarquesbraga.pt) · loja 98
 * Farmácia PT na plataforma AppsFarma (WE MAKE IT — a mesma da MegaFarma,
 * Fastpharma, Farmácia Portugal e Aveirofarma): sitemap/sitemap_web.xml,
 * fichas /pt-pt/product/ com JSON-LD (gtin = EAN em parte, sku = CNP em todas).
 * A plataforma corta quem pede depressa → devagar: 2 em paralelo, 600 ms.
 * Entrou a 2026-10-01: Braga; 1,22× a mediana (amostra de 110 fichas, 84 com EAN), a mais barata em 4% — CARA, entra para alargar a comparação (46% de produtos novos).
 * Genérico: scripts/lib/fichas-jsonld.js. Saída: data/catalog/farmaciamarquesbraga-full.json
 * Uso: node scripts/scrape-farmaciamarquesbraga-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherFichas } = require('./lib/fichas-jsonld');

const OUT = path.join(__dirname, '..', 'data', 'catalog', 'farmaciamarquesbraga-full.json');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

(async () => {
  const t0 = Date.now();
  const r = await recolherFichas({
    sitemap: 'https://farmaciamarquesbraga.pt/sitemap/sitemap_web.xml',
    filtroUrl: /\/pt-pt\/product\//,
    concorrencia: 2, pausaMs: 600,
    limite: args.limite ? Number(args.limite) : undefined,
    aoProgresso: (f, t, n) => console.log(`  ${f}/${t} fichas · ${n} produtos`),
  });
  console.log(`  mapa do site: ${r.total} · lidas: ${r.lidas} · produtos: ${r.produtos.length} (EAN: ${r.produtos.filter(p => p.ean).length} · CNP: ${r.produtos.filter(p => p.cnp).length}) · sem produto/404: ${r.semProduto} · falhas: ${r.falhas}`);
  if (!args.limite && r.produtos.length < 1500) { console.error(`✗ Só ${r.produtos.length} produtos (mínimo 1500; ~2.700 fichas a 2026-10-01). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'https://farmaciamarquesbraga.pt', in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
