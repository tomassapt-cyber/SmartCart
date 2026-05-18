/**
 * SmartCartCosmetics — Scraper Notino.pt
 *
 * Site SPA React. Requer Playwright para renderizar preço e stock.
 * Selectores observados (Maio 2026 — revalidar se mudarem):
 *   - Preço actual:  span.pd-price-current, .price-value
 *   - Preço anterior: span.pd-price-old, .price-value--old
 *   - Stock:          [data-testid="add-to-cart"] (disabled ⇒ esgotado)
 *   - Nome produto:   h1[itemprop="name"]
 *   - EAN:            <span class="pd-ean">
 *
 * Fallback: JSON-LD `Product` (sempre injetado pela Notino).
 *
 * Rate-limit conhecido: 1 req/2s seguro; >1 req/s → 429.
 */

const { BaseScraper } = require('./scraper-base');

class NotinoScraper extends BaseScraper {
  constructor(opts = {}) {
    super({
      storeSlug: 'notino',
      storeName: 'Notino PT',
      baseUrl: 'https://www.notino.pt',
      minDelayMs: 2500,           // política observada: 1 req/2s
      maxRetries: 3,
      usePlaywright: true,
      ...opts,
    });
  }

  async parseProductPage(html, url) {
    // 1) preferir JSON-LD (mais estável)
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
        image: ld.image && (Array.isArray(ld.image) ? ld.image[0] : ld.image),
        currency: offers?.priceCurrency || 'EUR',
      };
    }

    // 2) fallback: parse DOM
    const priceMatch = html.match(/class="[^"]*pd-price-current[^"]*"[^>]*>([^<]+)</i);
    const oldPriceMatch = html.match(/class="[^"]*pd-price-old[^"]*"[^>]*>([^<]+)</i);
    const eanMatch = html.match(/class="[^"]*pd-ean[^"]*"[^>]*>\s*EAN[:\s]*([0-9]+)/i);
    const nameMatch = html.match(/<h1[^>]*itemprop="name"[^>]*>\s*([^<]+?)\s*</i);

    const cartButton = html.match(/data-testid="add-to-cart"[^>]*(disabled)?[^>]*>/i);
    const inStock = cartButton ? !/disabled/i.test(cartButton[0]) : false;

    return {
      price: priceMatch ? this.parsePrice(priceMatch[1]) : null,
      price_anterior: oldPriceMatch ? this.parsePrice(oldPriceMatch[1]) : null,
      in_stock: inStock,
      name: nameMatch ? nameMatch[1].trim() : null,
      ean: eanMatch ? eanMatch[1] : null,
      currency: 'EUR',
    };
  }
}

module.exports = { NotinoScraper };

// CLI standalone para teste rápido: `node scrapers/notino.js <url>`
if (require.main === module) {
  (async () => {
    const url = process.argv[2];
    if (!url) {
      console.error('Uso: node scrapers/notino.js <url-produto>');
      process.exit(1);
    }
    const s = new NotinoScraper();
    await s.init();
    const r = await s.scrapeProduct(url);
    console.log(JSON.stringify(r, null, 2));
    await s.close();
  })();
}
