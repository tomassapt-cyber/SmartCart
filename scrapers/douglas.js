/**
 * SmartCartCosmetics — Scraper Douglas.pt
 *
 * SSR Next.js com JSON-LD bem estruturado em todas as páginas de produto.
 * Estratégia: HTTP simples + parsing JSON-LD (sem Playwright na maioria
 * dos casos). Fallback DOM para páginas com lazy-load de preço.
 *
 * Selectores observados (Maio 2026):
 *   - JSON-LD primário: <script type="application/ld+json"> Product
 *   - Preço:      [data-testid="product-price-current"]
 *   - Stock:      [data-testid="add-to-bag"]      (disabled ⇒ esgotado)
 *   - Nome:       h1[data-testid="product-name"]
 *   - EAN:        meta[itemprop="gtin13"]
 *
 * Anti-bot: DataDome. Rotação de IP recomendada acima de 100 produtos
 * sequenciais. UA realista + Accept-Language pt-PT obrigatórios.
 */

const { BaseScraper } = require('./scraper-base');

class DouglasScraper extends BaseScraper {
  constructor(opts = {}) {
    super({
      storeSlug: 'douglas',
      storeName: 'Douglas PT',
      baseUrl: 'https://www.douglas.pt',
      minDelayMs: 1800,
      maxRetries: 3,
      usePlaywright: false,        // SSR — fetch simples chega
      ...opts,
    });
  }

  async parseProductPage(html, url) {
    // 1) JSON-LD é a fonte canónica para Douglas
    const ld = this.findProductLd(html);
    if (ld) {
      const offers = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      const price = offers ? this.parsePrice(offers.price ?? offers.lowPrice) : null;
      const inStock = offers
        ? /InStock|LimitedAvailability/i.test(String(offers.availability || ''))
        : false;
      return {
        price,
        in_stock: inStock,
        name: ld.name || null,
        ean: ld.gtin13 || ld.gtin || ld.sku || null,
        brand: ld.brand?.name || ld.brand || null,
        image: ld.image && (Array.isArray(ld.image) ? ld.image[0] : ld.image),
        currency: offers?.priceCurrency || 'EUR',
      };
    }

    // 2) Fallback DOM
    const eanMeta = html.match(/<meta[^>]+itemprop=["']gtin13["'][^>]+content=["']([^"']+)["']/i);
    const priceTd = html.match(/data-testid=["']product-price-current["'][^>]*>([^<]+)</i);
    const nameTd = html.match(/data-testid=["']product-name["'][^>]*>\s*([^<]+?)\s*</i);
    const addBag = html.match(/data-testid=["']add-to-bag["'][^>]*?(disabled)?[^>]*>/i);
    const inStock = addBag ? !/disabled/i.test(addBag[0]) : false;

    return {
      price: priceTd ? this.parsePrice(priceTd[1]) : null,
      in_stock: inStock,
      name: nameTd ? nameTd[1].trim() : null,
      ean: eanMeta ? eanMeta[1] : null,
      currency: 'EUR',
    };
  }
}

module.exports = { DouglasScraper };

// CLI standalone: `node scrapers/douglas.js <url>`
if (require.main === module) {
  (async () => {
    const url = process.argv[2];
    if (!url) {
      console.error('Uso: node scrapers/douglas.js <url-produto>');
      process.exit(1);
    }
    const s = new DouglasScraper();
    await s.init();
    const r = await s.scrapeProduct(url);
    console.log(JSON.stringify(r, null, 2));
    await s.close();
  })();
}
