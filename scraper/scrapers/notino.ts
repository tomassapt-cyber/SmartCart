/**
 * Scraper para Notino PT (https://www.notino.pt)
 *
 * Notino é uma SPA React com SSR parcial. O preço final (após login/desconto)
 * aparece no DOM hidratado — por isso precisamos de Playwright e não apenas Cheerio.
 *
 * Estratégia de extracção (por ordem de preferência):
 *  1. data-testid="price"              — atributo estável nos testes e2e da própria Notino
 *  2. [itemprop="price"]               — microdado Schema.org (mais estável)
 *  3. JSON-LD <script type="application/ld+json">  — fallback rico em dados
 *  4. Regex no texto da página         — último recurso
 */

import { Page } from 'playwright';
import { BaseScraper } from './base';

export class NotinoScraper extends BaseScraper {
  storeSlug = 'notino';
  storeName = 'Notino PT';

  private static readonly SELECTORS = {
    price: [
      '[data-testid="price-component"]',
      '[data-testid="price"]',
      'span[itemprop="price"]',
      '[class*="price"][class*="final"]',
      '[class*="FinalPrice"]',
      '[class*="final-price"]',
      '.pd-price',
    ],
    addToCart: [
      '[data-testid="add-to-cart-button"]',
      'button[class*="AddToCart"]',
      'button[class*="add-to-cart"]',
      '[class*="CartButton"]',
    ],
    outOfStock: [
      '[data-testid="out-of-stock"]',
      '[class*="OutOfStock"]',
      '[class*="out-of-stock"]',
      'button[disabled][class*="cart"]',
    ],
  };

  async scrapeProductPage(
    page: Page,
    url: string,
  ): Promise<{ price: number | null; inStock: boolean }> {
    // 1. Navegar para a página do produto
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Aguardar hidratação do React (preço surge após ~1-2 s)
    await page.waitForTimeout(2000);

    // Fechar eventual banner de cookies para não bloquear cliques
    await this.dismissCookieBanner(page);

    // 2. Tentar extrair preço pelos selectores DOM
    let price = await this.extractPriceFromDOM(page);

    // 3. Fallback: JSON-LD estruturado (Schema.org Product/Offer)
    if (price === null) {
      price = await this.extractPriceFromJsonLd(page);
    }

    // 4. Último recurso: regex no texto completo da página
    if (price === null) {
      price = await this.extractPriceByRegex(page);
    }

    // 5. Verificar disponibilidade
    const inStock = await this.checkInStock(page);

    return { price, inStock };
  }

  // --------------------------------------------------------
  // Extracção de preço
  // --------------------------------------------------------

  private async extractPriceFromDOM(page: Page): Promise<number | null> {
    for (const selector of NotinoScraper.SELECTORS.price) {
      try {
        const element = await page.$(selector);
        if (!element) continue;

        // Tenta primeiro o atributo `content` (itemprop="price")
        const content = await element.getAttribute('content');
        if (content) {
          const parsed = parsePrice(content);
          if (parsed !== null) return parsed;
        }

        // Tenta o atributo `data-price`
        const dataPrice = await element.getAttribute('data-price');
        if (dataPrice) {
          const parsed = parsePrice(dataPrice);
          if (parsed !== null) return parsed;
        }

        // Texto visível
        const text = await element.innerText();
        const parsed = parsePrice(text);
        if (parsed !== null) return parsed;
      } catch {
        // selector não encontrado — tentar o próximo
      }
    }
    return null;
  }

  private async extractPriceFromJsonLd(page: Page): Promise<number | null> {
    try {
      const scripts = await page.$$eval(
        'script[type="application/ld+json"]',
        (els) => els.map((el) => el.textContent ?? ''),
      );

      for (const raw of scripts) {
        try {
          const data = JSON.parse(raw);

          // Product com Offer directa
          if (data['@type'] === 'Product') {
            const offer = data.offers ?? data.Offers;
            if (offer) {
              const priceStr = Array.isArray(offer) ? offer[0]?.price : offer.price;
              const parsed = parsePrice(String(priceStr));
              if (parsed !== null) return parsed;
            }
          }

          // Offer directa
          if (data['@type'] === 'Offer' && data.price) {
            const parsed = parsePrice(String(data.price));
            if (parsed !== null) return parsed;
          }
        } catch {
          // JSON inválido — ignorar
        }
      }
    } catch {
      // page.$$eval falhou
    }
    return null;
  }

  private async extractPriceByRegex(page: Page): Promise<number | null> {
    try {
      const bodyText = await page.evaluate(() => document.body.innerText);
      // Padrão: número com vírgula ou ponto decimal seguido de "€" ou precedido de "€"
      // Ex: "32,90 €", "€32.90", "32.90€"
      const matches = bodyText.match(/(\d{1,4}[.,]\d{2})\s*€|€\s*(\d{1,4}[.,]\d{2})/g);
      if (!matches || matches.length === 0) return null;

      // Pegar o primeiro preço razoável (entre 1€ e 1000€)
      for (const m of matches) {
        const parsed = parsePrice(m);
        if (parsed !== null && parsed >= 1 && parsed <= 1000) return parsed;
      }
    } catch {
      // falhou
    }
    return null;
  }

  // --------------------------------------------------------
  // Verificação de stock
  // --------------------------------------------------------

  private async checkInStock(page: Page): Promise<boolean> {
    // Se existir indicador explícito de "sem stock" → false
    for (const sel of NotinoScraper.SELECTORS.outOfStock) {
      const el = await page.$(sel);
      if (el) return false;
    }

    // Se o botão "Adicionar ao carrinho" existir e estiver activo → true
    for (const sel of NotinoScraper.SELECTORS.addToCart) {
      const el = await page.$(sel);
      if (el) {
        const disabled = await el.getAttribute('disabled');
        return disabled === null; // null = sem atributo disabled = activo
      }
    }

    // Fallback via texto da página
    try {
      const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
      if (bodyText.includes('esgotado') || bodyText.includes('indisponível')) return false;
      if (bodyText.includes('adicionar ao carrinho')) return true;
    } catch {
      // falhou
    }

    return true; // benefício da dúvida
  }

  // --------------------------------------------------------
  // Cookie banner
  // --------------------------------------------------------

  private async dismissCookieBanner(page: Page): Promise<void> {
    const cookieSelectors = [
      '#cookie-bar-btn-accept',
      '[data-testid="cookie-accept"]',
      'button[class*="CookieConsent"]',
      '#onetrust-accept-btn-handler',
      '.accept-cookies',
    ];

    for (const sel of cookieSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          await page.waitForTimeout(500);
          return;
        }
      } catch {
        // ignorar
      }
    }
  }
}

// --------------------------------------------------------
// Utilitário de parsing de preço
// --------------------------------------------------------

/**
 * Converte strings como "32,90 €", "32.90", "€ 32.90" em número (32.90).
 * Retorna null se não conseguir interpretar.
 */
function parsePrice(raw: string): number | null {
  if (!raw) return null;

  // Remove símbolos de moeda, espaços e outros caracteres não numéricos
  // excepto vírgula e ponto (separadores decimais)
  const cleaned = raw
    .replace(/[€$£\s]/g, '')
    .replace(/\.(?=\d{3})/g, '')  // remove ponto como separador de milhar (ex: 1.299,90)
    .replace(',', '.');            // normaliza vírgula decimal para ponto

  const value = parseFloat(cleaned);
  if (isNaN(value) || value <= 0) return null;
  return value;
}
