/**
 * Recolha genérica: lista de produtos do MAPA DO SITE + dados da FICHA em JSON-LD.
 * ================================================================================
 * O caso mais comum entre as lojas candidatas (PrestaShop, Magento, WooCommerce
 * sem Store API, sites à medida): cada ficha traz um bloco
 * <script type="application/ld+json"> com @type Product — nome, marca, gtin13,
 * sku, offers.price, offers.availability, image. Esta função faz o resto:
 * sitemap (incluindo índices e .xml.gz), fila com N em paralelo, pausa entre
 * pedidos, 404 contado à parte, guarda contra bloqueio silencioso.
 *
 * Lida com JSON-LD em lista, em @graph, com offers como lista ou AggregateOffer
 * (usa lowPrice), e com gtin em gtin13 / gtin / gtin12 / gtin14 / ean.
 * Se o bloco vier partido (há lojas que deixam código do servidor lá dentro —
 * ver scrape-pharma24-catalog.js), usa `extrair` próprio.
 */
const zlib = require('zlib');
const { fetchTextResilient } = require('./resilient-fetch');
const { decodeEntities } = require('./name-cleanup');
const { imagemValida } = require('./imagem-valida');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const dorme = ms => new Promise(r => setTimeout(r, ms));
const eanOk = s => /^\d{8}$|^\d{12,14}$/.test(String(s || '').trim());
const headers = { 'user-agent': UA, 'accept-language': 'pt-PT,pt;q=0.9' };

async function texto(url, expect) {
  if (/\.gz(\?|$)/i.test(url)) {   // sitemap comprimido: o fetch não o descomprime
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`HTTP ${r.status} · ${url}`);
    return zlib.gunzipSync(Buffer.from(await r.arrayBuffer())).toString('utf8');
  }
  return fetchTextResilient(url, { expect, headers });
}

async function urlsDoSitemap(raiz, filtroUrl, filtroFilho) {
  const fila = [raiz], urls = new Set(), vistos = new Set();
  while (fila.length) {
    const sm = fila.shift(); if (vistos.has(sm)) continue; vistos.add(sm);
    const x = await texto(sm, 'xml');
    const locs = [...String(x || '').matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&'));
    if (/<sitemapindex/i.test(x)) fila.push(...locs.filter(u => !filtroFilho || filtroFilho.test(u)));
    else for (const u of locs) if (!filtroUrl || filtroUrl.test(u)) urls.add(u);
    await dorme(300);
  }
  return [...urls];
}

function produtoDoJsonLd(html) {
  const blocos = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  for (const b of blocos) {
    let j; try { j = JSON.parse(b.trim()); } catch { continue; }
    const cands = [].concat(j).flatMap(x => (x && x['@graph']) ? x['@graph'] : [x]);
    const p = cands.find(x => x && [].concat(x['@type'] || []).some(t => /^Product$/i.test(t)));
    if (p) return p;
  }
  return null;
}

function normalizar(url, p) {
  const ofertas = [].concat(p.offers || []);
  const o = ofertas[0] || {};
  const preco = Number(o.price ?? o.lowPrice ?? (o.priceSpecification && [].concat(o.priceSpecification)[0]?.price));
  if (!(preco > 0)) return null;
  const gtin = [p.gtin13, p.gtin, p.gtin12, p.gtin14, p.ean, o.gtin13, o.gtin].map(x => String(x || '').trim()).find(eanOk) || null;
  const sku = String(p.sku || '').trim();
  const marca = typeof p.brand === 'string' ? p.brand : (p.brand && p.brand.name) || null;
  return {
    url, status: 'ok', scraped_at: new Date().toISOString(),
    name: decodeEntities(String(p.name || '')).trim(),
    brand: marca ? decodeEntities(String(marca)).trim() : null,
    ean: gtin ? gtin : null,
    cnp: /^\d{7}$/.test(sku) ? sku : null,
    image_url: imagemValida(p.image, url),   // ImageObject, relativo, placeholder → ver lib/imagem-valida
    price: preco,
    previous_price: null,
    in_stock: !o.availability || /InStock|LimitedAvailability|PreOrder/i.test(String(o.availability)),
    volume_ml: null, category: null, variants: [],
  };
}

/**
 * @param {{sitemap:string, filtroUrl?:RegExp, filtroFilho?:RegExp, concorrencia?:number, pausaMs?:number,
 *          limite?:number, extrair?:(url:string, html:string)=>object|object[]|null, aoProgresso?:(feitos:number,total:number,n:number)=>void}} o
 */
async function recolherFichas(o) {
  let urls = await urlsDoSitemap(o.sitemap, o.filtroUrl, o.filtroFilho);
  const total = urls.length;
  if (o.limite) urls = urls.slice(0, o.limite);
  const extrair = o.extrair || ((url, html) => { const p = produtoDoJsonLd(html); return p ? normalizar(url, p) : null; });
  const produtos = []; let falhas = 0, semProduto = 0, feitos = 0;
  const fila = [...urls];
  async function trabalhador() {
    while (fila.length) {
      const u = fila.shift();
      try {
        // `extrair` pode devolver uma lista (uma entrada por variante com EAN
        // próprio — ver scrape-parfumdreams-catalog.js)
        const p = extrair(u, await texto(u));
        if (Array.isArray(p) ? p.length : p) { if (Array.isArray(p)) for (const x of p) produtos.push(x); else produtos.push(p); }
        else semProduto++;
      }
      catch (e) { if (/HTTP 404|HTTP 410/.test(String(e.message))) semProduto++; else falhas++; }
      if (++feitos % 500 === 0 && o.aoProgresso) o.aoProgresso(feitos, urls.length, produtos.length);
      await dorme(o.pausaMs ?? 400);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, o.concorrencia || 3) }, trabalhador));
  if (falhas > urls.length * 0.2) throw new Error(`${falhas} de ${urls.length} fichas falharam — bloqueio ou loja em baixo`);
  return { total, lidas: urls.length, falhas, semProduto, produtos };
}

module.exports = { recolherFichas, urlsDoSitemap, produtoDoJsonLd, normalizar };
