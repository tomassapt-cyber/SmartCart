#!/usr/bin/env node
/**
 * CosMath — scraper da My Pharma Spot (mypharmaspot.com) · loja 75
 * ================================================================
 * Farmácia online portuguesa em Shopify, ~1.400 produtos.
 *
 * PORQUE ENTROU (medido a 2026-09-28, antes de integrar — a lição da Care to
 * Beauty): numa amostra de 85 produtos com EAN, nos 29 que já tínhamos a loja
 * estava a 0,84× a mediana do mercado e seria a MAIS BARATA em 55% deles. É um
 * canal de preço a sério, não só mais catálogo.
 *
 * Lista de produtos do mapa do site; cada produto pelo /products/<handle>.js,
 * que traz o EAN (ver lib/shopify-loja.js para o porquê).
 *
 * Nomes: a loja acrescenta ao título um subtítulo de marketing e o próprio nome
 * ("… 50ml – Proteção com Cor e Hidratação | My Pharma Spot"). Corta-se tudo
 * depois do travessão e o " | My Pharma Spot".
 *
 * Saída: data/catalog/mypharmaspot-full.json
 * Uso:   node scripts/scrape-mypharmaspot-catalog.js [--limite=N]
 */
const fs = require('fs');
const path = require('path');
const { recolherShopify } = require('./lib/shopify-loja');

const BASE = 'https://www.mypharmaspot.com';
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'mypharmaspot-full.json');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

function limpaNome(s) {
  return String(s || '')
    .replace(/\s*\|\s*my\s*pharma\s*spot\s*$/i, '')
    .replace(/\s+[–—]\s+.*$/, '')          // subtítulo de marketing depois do travessão
    .replace(/\s+/g, ' ')
    .trim();
}

(async () => {
  const t0 = Date.now();
  const r = await recolherShopify(BASE, {
    limpaNome,
    limite: args.limite ? Number(args.limite) : undefined,
    aoProgresso: (n, total) => console.log(`  ${n}/${total} produtos lidos`),
  });
  const comEan = r.produtos.filter(p => p.ean).length;
  console.log(`  produtos no mapa do site: ${r.handles} · retirados (404): ${r.retirados} · falhas: ${r.falhas} · entradas: ${r.produtos.length} · com EAN: ${comEan}`);
  // Guarda: um resultado muito menor do que o costume é quase sempre bloqueio
  // silencioso, não a loja a encolher. Não se escreve por cima do anterior.
  if (!args.limite && r.produtos.length < 500) {   // 818 a 2026-09-28
    console.error(`✗ Só ${r.produtos.length} produtos — abaixo do mínimo (500). Não gravo.`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: BASE, in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
