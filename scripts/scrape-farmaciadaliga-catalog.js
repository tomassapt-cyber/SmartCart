#!/usr/bin/env node
/**
 * CosMath — scraper da Farmácia da Liga (farmaciadaliga.pt) · loja 94
 * ===================================================================
 * Farmácia de Gaia com loja online própria. NÃO lê fichas: a loja publica o
 * FEED que envia ao KuantoKusta (`/feed/kk-liga`, para onde o
 * `/kkfeedfarmaciadaliga.xml` do mapa do site redireciona) — um XML de ~1 MB
 * com o catálogo todo: nome, categoria, marca, `reference` (= CNP), preço,
 * preço promocional, stock e EAN. Um pedido por corrida.
 *
 * ⚠️ O feed é gerado na hora: demora ~35 s a responder (medido a 2026-10-01).
 * Por isso o timeout de 3 min por tentativa — com os 30 s por omissão do
 * fetchTextResilient, falhava sempre.
 *
 * PORQUE ENTROU (2026-10-01, medido com o FEED INTEIRO, não com amostra):
 * 6.425 produtos, EAN em 5.746 e CNP em 6.423; 1,08× a mediana nos 3.670 EAN
 * em comum, a mais barata em 7%, 2.072 EAN novos (36%). Preço de mercado um
 * pouco acima: entra para alargar a comparação.
 *
 * Saída: data/catalog/farmaciadaliga-full.json
 * Uso:   node scripts/scrape-farmaciadaliga-catalog.js
 */
const fs = require('fs');
const path = require('path');
const { fetchTextResilient } = require('./lib/resilient-fetch');
const { decodeEntities } = require('./lib/name-cleanup');

const FEED = 'https://www.farmaciadaliga.pt/feed/kk-liga';
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'farmaciadaliga-full.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const num = s => Number(String(s || '').replace(/\./g, '').replace(',', '.'));

// <tag>valor</tag> ou <tag><![CDATA[valor]]></tag>
function tag(bloco, nome) {
  const i = bloco.indexOf(`<${nome}>`);
  if (i < 0) return '';
  const j = bloco.indexOf(`</${nome}>`, i);
  let v = bloco.slice(i + nome.length + 2, j).trim();
  if (v.startsWith('<![CDATA[')) v = v.slice(9, v.endsWith(']]>') ? -3 : undefined);
  return decodeEntities(v.trim());
}

(async () => {
  const t0 = Date.now();
  const xml = await fetchTextResilient(FEED, { expect: 'xml', minBytes: 100000, timeoutMs: 180000, attempts: 3, headers: { 'user-agent': UA } });
  const agora = new Date().toISOString();
  const produtos = [];
  for (const m of xml.matchAll(/<product>([\s\S]*?)<\/product>/g)) {
    const b = m[1];
    const normal = num(tag(b, 'price'));
    const promo = num(tag(b, 'promotional_price'));
    const preco = promo > 0 && promo < normal ? promo : normal;
    if (!(preco > 0)) continue;
    const ean = tag(b, 'ean');
    const ref = tag(b, 'reference');
    produtos.push({
      url: tag(b, 'product_url'),
      status: 'ok',
      scraped_at: agora,
      name: tag(b, 'designation').replace(/\s+/g, ' '),
      brand: tag(b, 'brand') || null,
      ean: /^\d{8}$|^\d{12,14}$/.test(ean) ? ean : null,
      cnp: /^\d{7}$/.test(ref) ? ref : null,
      image_url: tag(b, 'image_url') || null,
      price: preco,
      previous_price: preco < normal - 0.009 ? normal : null,
      in_stock: num(tag(b, 'stock')) > 0,
      volume_ml: null,
      category: tag(b, 'category') || null,
      variants: [],
    });
  }
  console.log(`  feed: ${produtos.length} produtos · com EAN: ${produtos.filter(p => p.ean).length} · com CNP: ${produtos.filter(p => p.cnp).length} · em promoção: ${produtos.filter(p => p.previous_price).length}`);
  if (produtos.length < 4000) { console.error(`✗ Só ${produtos.length} produtos no feed (6.425 a 2026-10-01). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: agora, source: 'https://www.farmaciadaliga.pt', in_progress: false, products: produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 1000)} s`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
