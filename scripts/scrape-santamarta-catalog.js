#!/usr/bin/env node
/**
 * CosMath — scraper da Farmácia Santa Marta (farmaciasantamarta.pt) · loja 77
 * =========================================================================
 * WooCommerce; catálogo inteiro pela Store API pública (ver lib/woo-loja.js):
 * ~2.900 produtos em ~29 pedidos. O sku é o CNP; a marca vem em brands[].
 *
 * PORQUE ENTROU (medido a 2026-09-28 pelo mapa CNP→EAN dos nossos catálogos):
 * 0,89× a mediana do mercado nos produtos em comum, a mais barata em 38%.
 *
 * Saída: data/catalog/santamarta-full.json
 */
const fs = require('fs');
const path = require('path');
const { recolherWoo } = require('./lib/woo-loja');

const BASE = 'https://farmaciasantamarta.pt';
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'santamarta-full.json');

(async () => {
  const t0 = Date.now();
  const r = await recolherWoo(BASE);
  const comCnp = r.produtos.filter(p => p.cnp).length;
  console.log(`  ${r.paginas} páginas · ${r.produtos.length} produtos com preço · com CNP: ${comCnp}`);
  // 2.890 a 2026-09-28. Muito abaixo disso é quase sempre bloqueio, não a loja a encolher.
  if (r.produtos.length < 1500) { console.error(`✗ Só ${r.produtos.length} produtos (mínimo 1.500). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: BASE, in_progress: false, products: r.produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 1000)} s`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
