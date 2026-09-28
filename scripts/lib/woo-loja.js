/**
 * Recolha de catálogo de uma loja WOOCOMMERCE pela Store API pública.
 * =====================================================================
 * /wp-json/wc/store/v1/products?per_page=100&page=N — sem autenticação, JSON,
 * 100 produtos por pedido: uma farmácia de 3.000 produtos lê-se em 30 pedidos,
 * em vez de 3.000 fichas. O total vem no cabeçalho X-WP-Total.
 *
 * Campos: sku (nas farmácias PT é quase sempre o CNP de 7 dígitos; às vezes o
 * EAN), brands[] (quando a loja usa um plugin de marcas), prices em unidades
 * mínimas (cêntimos) com currency_minor_unit, regular_price = preço antes do
 * desconto, is_in_stock, images[], categories[].
 *
 * Produtos "variable" (vários tamanhos) vêm com o preço mais baixo; fica uma
 * entrada, sem variantes — nas farmácias são raros.
 */
const { fetchTextResilient } = require('./resilient-fetch');
const { decodeEntities } = require('./name-cleanup');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const dorme = ms => new Promise(r => setTimeout(r, ms));
const ehEan = s => /^\d{8}$|^\d{12,14}$/.test(s);
const ehCnp = s => /^\d{7}$/.test(s);

/**
 * @param {string} base ex.: 'https://farmaciasantamarta.pt'
 * @param {{limpaNome?:(s:string)=>string, pausaMs?:number, maxPaginas?:number}} o
 */
async function recolherWoo(base, o = {}) {
  const limpaNome = o.limpaNome || (s => s);
  const produtos = [];
  let paginas = 0;
  for (let p = 1; p <= (o.maxPaginas || 500); p++) {
    const txt = await fetchTextResilient(`${base}/wp-json/wc/store/v1/products?per_page=100&page=${p}`, {
      expect: 'json', headers: { 'user-agent': UA, 'accept-language': 'pt-PT,pt;q=0.9' },
    }).catch(e => { if (/HTTP 400/.test(String(e.message))) return '[]'; throw e; });  // página além do fim = 400
    const lista = JSON.parse(txt);
    if (!Array.isArray(lista) || !lista.length) break;
    paginas++;
    for (const x of lista) {
      const mu = Number(x.prices && x.prices.currency_minor_unit != null ? x.prices.currency_minor_unit : 2);
      const preco = x.prices ? Number(x.prices.price) / 10 ** mu : 0;
      if (!(preco > 0)) continue;
      const regular = x.prices ? Number(x.prices.regular_price) / 10 ** mu : 0;
      const sku = String(x.sku || '').trim();
      produtos.push({
        url: x.permalink,
        status: 'ok',
        scraped_at: new Date().toISOString(),
        name: limpaNome(decodeEntities(x.name || '')),
        brand: x.brands && x.brands[0] ? decodeEntities(x.brands[0].name) : null,
        ean: ehEan(sku) ? sku : null,
        cnp: ehCnp(sku) ? sku : null,
        image_url: x.images && x.images[0] ? x.images[0].src : null,
        price: preco,
        previous_price: regular > preco + 0.009 ? regular : null,
        in_stock: !!x.is_in_stock,
        volume_ml: null,
        category: (x.categories || []).map(c => decodeEntities(c.name)).join(' > ') || null,
        variants: [],
      });
    }
    if (lista.length < 100) break;
    await dorme(o.pausaMs ?? 600);
  }
  return { paginas, produtos };
}

module.exports = { recolherWoo };
