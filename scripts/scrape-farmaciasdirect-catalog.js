#!/usr/bin/env node
/**
 * CosMath — scraper da Farmaciasdirect (farmaciasdirect.pt) · loja 87
 * ==================================================================
 * Farmácia espanhola com loja portuguesa própria (.pt, nomes em português),
 * ~74 mil produtos no total. Shopify HEADLESS (Hydrogen + Sanity): no domínio
 * público o /products/<handle>.js dá 404 e cada ficha pesa ~700 KB.
 *
 * O CAMINHO QUE SERVE (descoberto a 2026-10-01): a loja-base está em
 * farmaciasdirectprod.myshopify.com (aparece no HTML como checkoutDomain), e
 * aí o /collections/<c>/products.json responde — 250 produtos por pedido, com
 * nome em português, marca, preço, preço barrado e stock. E o EAN NÃO PRECISA
 * DE FICHA: o sku é "duas letras + EAN" ("VO7610313392087") em ~90% dos
 * casos; com 12 dígitos é um UPC-A, que vira EAN-13 com um zero à esquerda.
 * Alguns são códigos nacionais espanhóis (847000…): não casam com nada.
 *
 * ⚠️ Limites: a Shopify corta na página 100 de cada coleção (25 mil); por isso
 * por coleção ("cosmetica-8507" ~25.800, "higiene-8508" ~15.600). E a loja
 * devolve 429 a quem pede depressa — pausa de 1,5 s, e o fetchTextResilient
 * repete os 429 com espera.
 *
 * PORQUE ENTROU (2026-10-01, amostra de 119 fichas com EAN): 0,95× a mediana,
 * a mais barata em 19% dos comuns, 82% de EAN novos.
 *
 * Saída: data/catalog/farmaciasdirect-full.json
 * Uso:   node scripts/scrape-farmaciasdirect-catalog.js [--max-paginas=N]
 */
const fs = require('fs');
const path = require('path');
const { fetchTextResilient } = require('./lib/resilient-fetch');
const { decodeEntities } = require('./lib/name-cleanup');

const API = 'https://farmaciasdirectprod.myshopify.com';
const PUBLICO = 'https://www.farmaciasdirect.pt';
const COLECOES = ['cosmetica-8507', 'higiene-8508'];
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'farmaciasdirect-full.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const MAX_PAG = Number(args['max-paginas'] || 100);
const dorme = ms => new Promise(r => setTimeout(r, ms));

// "VO7610313392087" → "7610313392087"; "XX012345678905" (12 díg.) → "0012345678905"
function eanDoSku(sku) {
  // prefixo de 1-4 caracteres a acabar em LETRA ("VO…", "5P…" da 5Punto5); só
  // dígitos com 6 = código nacional espanhol ("302332"), que não é EAN.
  const m = String(sku || '').trim().match(/^[A-Z0-9]{0,3}[A-Z](\d{12,14})$/);
  if (!m) return null;
  const d = m[1];
  if (d.length === 12) return '0' + d;
  if (d.length === 14) return d.startsWith('0') ? d.slice(1) : null;
  return d;
}

(async () => {
  const t0 = Date.now();
  const porId = new Map();
  for (const c of COLECOES) {
    for (let page = 1; page <= MAX_PAG; page++) {
      let lista;
      try {
        lista = JSON.parse(await fetchTextResilient(`${API}/collections/${c}/products.json?limit=250&page=${page}`, {
          expect: 'json', attempts: 6, headers: { 'user-agent': UA, 'accept-language': 'pt-PT,pt;q=0.9' },
        })).products || [];
      } catch (e) { if (/HTTP 400/.test(String(e.message))) break; throw e; }
      if (!lista.length) break;
      for (const p of lista) for (const v of p.variants || []) {
        if (porId.has(v.id)) continue;
        const preco = Number(v.price);
        if (!(preco > 0)) continue;
        const antes = v.compare_at_price && Number(v.compare_at_price) > preco + 0.009 ? Number(v.compare_at_price) : null;
        const nomeVar = (p.variants.length > 1 && v.title && !/^default title$/i.test(v.title)) ? ` ${v.title}` : '';
        porId.set(v.id, {
          url: `${PUBLICO}/products/${p.handle}${p.variants.length > 1 ? `?variant=${v.id}` : ''}`,
          status: 'ok',
          name: decodeEntities(`${p.title}${nomeVar}`).trim(),
          brand: p.vendor ? decodeEntities(p.vendor).trim() : null,
          ean: eanDoSku(v.sku),
          cnp: null,
          image_url: (p.images && p.images[0] && p.images[0].src) || null,
          price: preco, previous_price: antes, in_stock: !!v.available,
          volume_ml: null, category: c, variants: [],
        });
      }
      if (page % 10 === 0) console.log(`  ${c}: página ${page} · ${porId.size} entradas`);
      if (lista.length < 250) break;
      await dorme(1500);
    }
    console.log(`  ${c}: ${porId.size} entradas acumuladas`);
  }
  const agora = new Date().toISOString();
  const produtos = [...porId.values()].map(p => ({ ...p, scraped_at: agora }));
  console.log(`  ${produtos.length} entradas · com EAN: ${produtos.filter(p => p.ean).length}`);
  if (MAX_PAG >= 100 && produtos.length < 20000) { console.error(`✗ Só ${produtos.length} entradas (esperadas ~40 mil). Não gravo.`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: agora, source: PUBLICO, in_progress: false, products: produtos }));
  console.log(`✓ ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB) em ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
