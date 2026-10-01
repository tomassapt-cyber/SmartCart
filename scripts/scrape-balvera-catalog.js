#!/usr/bin/env node
/**
 * CosMath — scraper da Balvera (balvera.pt) · loja 91
 * ====================================================
 * Perfumaria portuguesa (Pombal; Balvera — Comércio Perfumarias, Lda), com lojas
 * físicas e loja online própria (Next.js): ~2.750 fichas no mapa do site, cada
 * uma com JSON-LD Product limpo — gtin (EAN), marca, preço, stock.
 *
 * PORQUE ENTROU (2026-10-01, amostra de 97 fichas com EAN): 1,00× a mediana nos
 * 49 produtos em comum, a mais barata em 20%, 49% de EAN novos (perfumaria e
 * maquilhagem de marca).
 *
 * Genérico: scripts/lib/fichas-jsonld.js. Saída: data/catalog/balvera-full.json
 * Uso: node scripts/scrape-balvera-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherFichas } = require('./lib/fichas-jsonld');

const BASE = 'https://balvera.pt';
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'balvera-full.json');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

(async () => {
  const t0 = Date.now();
  const r = await recolherFichas({
    sitemap: `${BASE}/sitemap.xml`,
    filtroUrl: /\/produtos\/[^/]+$/i,
    concorrencia: 2, pausaMs: 400,
    limite: args.limite ? Number(args.limite) : undefined,
    aoProgresso: (f, t, n) => console.log(`  ${f}/${t} fichas · ${n} produtos`),
  });
  console.log(`  mapa do site: ${r.total} · lidas: ${r.lidas} · produtos: ${r.produtos.length} (com EAN: ${r.produtos.filter(p => p.ean).length}) · sem produto/404: ${r.semProduto} · falhas: ${r.falhas}`);
  if (!args.limite && r.produtos.length < 1500) { console.error(`✗ Só ${r.produtos.length} produtos (mínimo 1.500; ~2.750 fichas a 2026-10-01). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: BASE, in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
