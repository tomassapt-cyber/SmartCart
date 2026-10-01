/**
 * Recolha de catálogo de uma loja SHOPIFY, produto a produto, com EAN.
 * =====================================================================
 *
 * PORQUE NÃO O /products.json A GRANEL (como o shopkit-granel.js faz):
 *   1. o /products.json público da Shopify NÃO traz o código de barras — só o
 *      /products/<handle>.js o traz (variants[].barcode). Sem EAN a comparação
 *      cai para marca+nome, que é o que gera produtos-fantasma;
 *   2. a paginação por ?page= pára antes do fim: na MyPharmaSpot devolveu 709
 *      produtos de ~1.400 (2026-09-28).
 *
 * POR ISSO: a lista de produtos vem do MAPA DO SITE (sitemap_products_*.xml,
 * que é completo) e cada produto lê-se no /products/<handle>.js — JSON pequeno
 * (~5 KB), sem HTML, com preço, preço barrado, stock, imagem e EAN.
 *
 * Preços: no .js vêm em CÊNTIMOS (inteiros). Aqui passam a euros.
 *
 * Uso (a partir de um scraper fino, ver scrape-mypharmaspot-catalog.js):
 *   const { recolherShopify } = require('./lib/shopify-loja');
 *   const produtos = await recolherShopify('https://www.loja.pt', { limpaNome, aoProgresso });
 */
const { fetchTextResilient } = require('./resilient-fetch');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const dorme = ms => new Promise(r => setTimeout(r, ms));
const eanOk = s => /^\d{8}$|^\d{12,14}$/.test(String(s || '').trim());

async function texto(url, expect) {
  // o fetchTextResilient já trata de repetições, 429 e páginas de bloqueio
  return fetchTextResilient(url, { expect, headers: { 'user-agent': UA, 'accept-language': 'pt-PT,pt;q=0.9' } });
}

async function handlesDoSitemap(base) {
  const raiz = await texto(`${base}/sitemap.xml`, 'xml');
  const filhos = [...String(raiz || '').matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&'))
    .filter(u => /sitemap_products_/i.test(u));
  if (!filhos.length) throw new Error(`sem sitemap_products_* em ${base}/sitemap.xml`);
  const handles = new Set();
  for (const f of filhos) {
    const x = await texto(f, 'xml');
    for (const m of String(x || '').matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/g)) {
      const h = (m[1].match(/\/products\/([^/?#]+)/) || [])[1];
      if (h) handles.add(decodeURIComponent(h));
    }
    await dorme(300);
  }
  return [...handles];
}

function paraProduto(base, j, limpaNome) {
  const vs = (j.variants || []).filter(v => v && v.price > 0);
  if (!vs.length) return null;
  // Uma entrada por variante com EAN próprio (tamanhos diferentes = produtos
  // diferentes no CosMath); sem EAN, fica só a primeira variante.
  const saida = [];
  const vistos = new Set();
  for (const v of vs) {
    const ean = eanOk(v.barcode) ? String(v.barcode).trim() : null;
    const chave = ean || 'sem-ean';
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const nomeVar = vs.length > 1 && v.title && !/^default title$/i.test(v.title) ? ` ${v.title}` : '';
    const preco = v.price / 100;
    const barrado = v.compare_at_price && v.compare_at_price > v.price ? v.compare_at_price / 100 : null;
    const img = (v.featured_image && v.featured_image.src) || j.featured_image || (j.images && j.images[0]) || null;
    saida.push({
      url: `${base}/products/${j.handle}${vs.length > 1 ? `?variant=${v.id}` : ''}`,
      status: 'ok',
      scraped_at: new Date().toISOString(),
      name: limpaNome(`${j.title}${nomeVar}`),
      _tituloOriginal: j.title,   // antes da limpeza: há lojas que põem a marca no título (ver scrape-mitso)
      brand: (j.vendor || '').trim() || null,
      ean,
      cnp: /^\d{7}$/.test(String(v.sku || '').trim()) ? String(v.sku).trim() : null,
      image_url: img ? (String(img).startsWith('//') ? 'https:' + img : img) : null,
      price: preco,
      previous_price: barrado,
      in_stock: !!v.available,
      volume_ml: null,
      category: j.type || null,
      variants: [],
    });
  }
  return saida;
}

/**
 * @param {string} base  ex.: 'https://www.mypharmaspot.com'
 * @param {{limpaNome?:(s:string)=>string, aoProgresso?:(n:number,total:number)=>void, pausaMs?:number, limite?:number}} o
 */
async function recolherShopify(base, o = {}) {
  const limpaNome = o.limpaNome || (s => s);
  const pausa = o.pausaMs ?? 450;
  let handles = await handlesDoSitemap(base);
  if (o.limite) handles = handles.slice(0, o.limite);
  const produtos = [];
  let falhas = 0, retirados = 0;
  for (let i = 0; i < handles.length; i++) {
    const h = handles[i];
    let j = null;
    try { j = JSON.parse(await texto(`${base}/products/${encodeURIComponent(h)}.js`, 'json')); }
    catch (e) {
      // 404 = produto retirado que o mapa do site ainda lista (na MyPharmaSpot,
      // 144 de 853 a 2026-09-28). Não é bloqueio e não conta para a guarda.
      if (/HTTP 404/.test(String(e && e.message))) retirados++; else falhas++;
    }
    if (j) { const ps = paraProduto(base, j, limpaNome); if (ps) produtos.push(...ps); }
    if (o.aoProgresso && (i + 1) % 100 === 0) o.aoProgresso(i + 1, handles.length);
    await dorme(pausa);
  }
  // Guarda contra a loja a devolver lixo sem dar erro (página de bloqueio a 200,
  // produtos retirados): se mais de 20% falha, o resultado não serve.
  if (falhas > (handles.length - retirados) * 0.2) throw new Error(`${falhas} de ${handles.length - retirados} produtos falharam — bloqueio ou loja em baixo`);
  return { handles: handles.length, falhas, retirados, produtos };
}

module.exports = { recolherShopify, handlesDoSitemap };
