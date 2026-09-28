#!/usr/bin/env node
/**
 * CosMath — scraper da Pharma24 (pharma24.pt) · loja 78
 * ======================================================
 * Farmácia online portuguesa, ~5.000 produtos no mapa do site.
 *
 * PORQUE ENTROU (medido a 2026-09-28 pelo mapa CNP→EAN): 0,78× a mediana do
 * mercado nos produtos em comum e a MAIS BARATA em 42% deles — o melhor canal
 * de preço de todas as candidatas avaliadas nesse dia.
 *
 * ⚠️ O JSON-LD DA LOJA ESTÁ PARTIDO: o site deixa código PHP por processar
 * dentro do <script type="application/ld+json"> (a chave "@context" aparece
 * como "<?php $__contextArgs = [] ... ?>"), por isso JSON.parse falha sempre.
 * Os campos lêem-se com expressões regulares dentro desse bloco:
 *   sku  = CNP (7 dígitos)       mpn  = EAN-13
 *   name, brand.name, offers.price, offers.availability, image[0]
 * Se um dia corrigirem o bloco, isto continua a funcionar.
 *
 * O mapa do site mistura produtos (com e sem ".html"), páginas institucionais
 * e 36 endereços /es/ — ficam só as fichas com sku de 7 dígitos e preço.
 *
 * Saída: data/catalog/pharma24-full.json
 * Uso:   node scripts/scrape-pharma24-catalog.js [--limite=N] [--concorrencia=3]
 */
const fs = require('fs');
const path = require('path');
const { fetchTextResilient } = require('./lib/resilient-fetch');
const { decodeEntities } = require('./lib/name-cleanup');

const BASE = 'https://www.pharma24.pt';
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'pharma24-full.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const LIMITE = args.limite ? Number(args.limite) : Infinity;
const CONC = Math.max(1, Math.min(4, Number(args.concorrencia || 3)));
const dorme = ms => new Promise(r => setTimeout(r, ms));
const get = (url, expect) => fetchTextResilient(url, { expect, headers: { 'user-agent': UA, 'accept-language': 'pt-PT,pt;q=0.9' } });

// Endereços do mapa do site que não são fichas (poupam pedidos).
const NAO_FICHA = /\/(es|en)\/|termos|condic[oõ]es|politica|privacidade|contact|sobre|blog|faq|ajuda|conta|carrinho|checkout/i;

function ficha(url, h) {
  const bloco = (h.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i) || [])[1] || '';
  const campo = re => ((bloco.match(re) || [])[1] || '').trim();
  const cnp = campo(/"sku"\s*:\s*"(\d{7})"/);
  const preco = Number(campo(/"price"\s*:\s*"?(\d+(?:\.\d+)?)/));
  if (!cnp || !(preco > 0)) return null;
  const ean = campo(/"mpn"\s*:\s*"(\d{12,14})"/) || null;
  const marca = campo(/"brand"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
  const img = campo(/"image"\s*:\s*\[\s*"([^"]+)"/);
  return {
    url, status: 'ok', scraped_at: new Date().toISOString(),
    name: decodeEntities(campo(/"name"\s*:\s*"([^"]+)"/)),
    brand: marca ? decodeEntities(marca) : null,
    ean, cnp,
    image_url: img || null,
    price: preco,
    previous_price: null,       // a loja não publica o preço antes do desconto na ficha
    in_stock: /InStock/i.test(campo(/"availability"\s*:\s*"([^"]+)"/)),
    volume_ml: null, category: null, variants: [],
  };
}

(async () => {
  const t0 = Date.now();
  const sm = await get(`${BASE}/sitemap.xml`, 'xml');
  let urls = [...new Set([...sm.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]))]
    .filter(u => u.startsWith(BASE + '/') && u !== BASE + '/' && !NAO_FICHA.test(u));
  if (urls.length < 3000) { console.error(`✗ Só ${urls.length} endereços no mapa do site (esperados ~5.000). Não continuo.`); process.exit(1); }
  urls = urls.slice(0, LIMITE);
  console.log(`  ${urls.length} endereços a ler · ${CONC} em paralelo`);

  const produtos = []; let falhas = 0, naoFicha = 0, feitos = 0;
  const fila = [...urls];
  async function trabalhador() {
    while (fila.length) {
      const u = fila.shift();
      try { const p = ficha(u, await get(u)); if (p) produtos.push(p); else naoFicha++; }
      catch (e) { if (/HTTP 404/.test(String(e.message))) naoFicha++; else falhas++; }
      if (++feitos % 500 === 0) console.log(`  ${feitos}/${urls.length} · produtos ${produtos.length} · falhas ${falhas}`);
      await dorme(350);
    }
  }
  await Promise.all(Array.from({ length: CONC }, trabalhador));

  console.log(`  produtos: ${produtos.length} · com EAN: ${produtos.filter(p => p.ean).length} · não-fichas/404: ${naoFicha} · falhas: ${falhas}`);
  if (falhas > urls.length * 0.2) { console.error('✗ Mais de 20% de falhas — bloqueio ou loja em baixo. Não gravo.'); process.exit(1); }
  if (LIMITE === Infinity && produtos.length < 2500) { console.error(`✗ Só ${produtos.length} produtos (mínimo 2.500). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: new Date().toISOString(), source: BASE, in_progress: false, products: produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
