#!/usr/bin/env node
/**
 * CosMath — scraper da MegaFarma (megafarma.pt) · loja 85
 * =======================================================
 * Farmácia online portuguesa, ~8.000 fichas com JSON-LD (gtin = EAN em ~80%,
 * sku = CNP em todas). Mesma plataforma da Fastpharma, Farmácia Portugal e
 * Aveirofarma (sitemap/sitemap_web.xml, /pt-pt/product/) — plataforma que
 * corta quem pede depressa (429/403 aos runners, de forma intermitente). Por
 * isso aqui vai devagar: 2 em paralelo, 600 ms entre pedidos.
 *
 * PORQUE ENTROU (2026-10-01, amostra de 69 com EAN): 0,99× a mediana, a mais
 * barata em 12% dos comuns, 39% de EAN novos. Acesso dos runners confirmado
 * (sondar-acesso.yml).
 *
 * Genérico: scripts/lib/fichas-jsonld.js. Saída: data/catalog/megafarma-full.json
 * Uso: node scripts/scrape-megafarma-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherFichas } = require('./lib/fichas-jsonld');

const OUT = path.join(__dirname, '..', 'data', 'catalog', 'megafarma-full.json');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

(async () => {
  const t0 = Date.now();
  const r = await recolherFichas({
    sitemap: 'https://megafarma.pt/sitemap/sitemap_web.xml',
    filtroUrl: /\/pt-pt\/product\//,
    concorrencia: 2, pausaMs: 600,
    limite: args.limite ? Number(args.limite) : undefined,
    aoProgresso: (f, t, n) => console.log(`  ${f}/${t} fichas · ${n} produtos`),
  });
  console.log(`  mapa do site: ${r.total} · lidas: ${r.lidas} · produtos: ${r.produtos.length} (EAN: ${r.produtos.filter(p => p.ean).length} · CNP: ${r.produtos.filter(p => p.cnp).length}) · sem produto/404: ${r.semProduto} · falhas: ${r.falhas}`);
  if (!args.limite && r.produtos.length < 4000) { console.error(`✗ Só ${r.produtos.length} produtos (mínimo 4.000; ~8.000 a 2026-10-01). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'https://megafarma.pt', in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
