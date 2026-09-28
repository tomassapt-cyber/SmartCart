#!/usr/bin/env node
/**
 * CosMath — scraper da Farmácia Barata (farmaciabarata.pt) · loja 79
 * ==================================================================
 * Farmácia ESPANHOLA (Córdoba) com site em português e envio para Portugal.
 * PrestaShop, ~12.700 fichas com JSON-LD limpo (gtin13, marca, preço).
 *
 * PORQUE ENTROU (medido a 2026-09-28, amostra de 175 fichas com EAN): 0,98× a
 * mediana do mercado nos 57 produtos em comum, a MAIS BARATA em 28% deles —
 * com 12.700 produtos, é o preço mais baixo em mais de mil. 67% dos EAN são
 * novos no CosMath (marcas de farmácia espanholas: Basiko, Sunlaude, Lacer…).
 *
 * ⚠️ Alguns códigos são nacionais espanhóis (847000…) e não EAN de fábrica:
 * não casam com nada e só entram como produto novo se forem dermo.
 *
 * Genérico: scripts/lib/fichas-jsonld.js. Saída: data/catalog/farmaciabarata-full.json
 * Uso: node scripts/scrape-farmaciabarata-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherFichas } = require('./lib/fichas-jsonld');

const OUT = path.join(__dirname, '..', 'data', 'catalog', 'farmaciabarata-full.json');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

(async () => {
  const t0 = Date.now();
  const r = await recolherFichas({
    sitemap: 'https://www.farmaciabarata.pt/sitemap.xml',
    filtroUrl: /\.html$/i,
    concorrencia: 3, pausaMs: 400,
    limite: args.limite ? Number(args.limite) : undefined,
    aoProgresso: (f, t, n) => console.log(`  ${f}/${t} fichas · ${n} produtos`),
  });
  console.log(`  mapa do site: ${r.total} · lidas: ${r.lidas} · produtos: ${r.produtos.length} (com EAN: ${r.produtos.filter(p => p.ean).length}) · sem produto/404: ${r.semProduto} · falhas: ${r.falhas}`);
  if (!args.limite && r.produtos.length < 6000) { console.error(`✗ Só ${r.produtos.length} produtos (mínimo 6.000). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: 'https://www.farmaciabarata.pt', in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
