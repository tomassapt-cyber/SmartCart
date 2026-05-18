/**
 * SmartCartCosmetics — Scraper Base (JS / Playwright)
 *
 * Classe base para os scrapers das lojas portuguesas. Cada loja
 * estende esta classe e implementa `parseProductPage(html, url)`
 * com os selectores específicos.
 *
 * Funcionalidades incluídas:
 *  - Browser pool com Playwright (chromium headless)
 *  - Rotação de delays jitter para evitar rate-limits
 *  - Retries com backoff exponencial
 *  - Logging estruturado por loja
 *  - Suporte a fetch HTTP simples (cheerio) ou render completo (playwright)
 *
 * Convenção: este módulo paralela a versão TypeScript existente em
 * /scraper/scrapers/base.ts. Use este caminho JS quando integrares
 * directamente em /api/ ou jobs Node simples sem build step.
 */

// Lazy require — só carrega playwright se realmente usado
let _chromium = null;
function getChromium() {
  if (!_chromium) {
    _chromium = require('playwright').chromium;
  }
  return _chromium;
}

// Pequena utility de espera com jitter
function delay(ms, jitterPct = 0.3) {
  const jitter = ms * jitterPct * (Math.random() * 2 - 1);
  return new Promise((r) => setTimeout(r, Math.max(0, ms + jitter)));
}

// User-agents realistas para rotação
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

class BaseScraper {
  /**
   * @param {object} config
   * @param {string} config.storeSlug      identificador estável (ex.: 'notino')
   * @param {string} config.storeName      nome humano da loja
   * @param {string} config.baseUrl        URL base (ex.: 'https://www.notino.pt')
   * @param {number} [config.minDelayMs]   delay mínimo entre requests (default 2000)
   * @param {number} [config.maxRetries]   tentativas em caso de erro (default 3)
   * @param {boolean}[config.usePlaywright] usa Playwright (true) ou fetch (false)
   * @param {object} [config.logger]       objecto com .info() .warn() .error()
   */
  constructor(config = {}) {
    this.storeSlug = config.storeSlug || 'unknown';
    this.storeName = config.storeName || this.storeSlug;
    this.baseUrl = config.baseUrl || '';
    this.minDelayMs = config.minDelayMs ?? 2000;
    this.maxRetries = config.maxRetries ?? 3;
    this.usePlaywright = config.usePlaywright ?? true;
    this.logger = config.logger || console;

    this._browser = null;
    this._context = null;
    this._stats = { ok: 0, fail: 0, started: null };
  }

  // -----------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------
  async init() {
    this._stats.started = new Date();
    if (this.usePlaywright) {
      this._browser = await getChromium().launch({ headless: true });
      this._context = await this._browser.newContext({
        userAgent: randomUA(),
        locale: 'pt-PT',
        timezoneId: 'Europe/Lisbon',
        viewport: { width: 1366, height: 900 },
        extraHTTPHeaders: { 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.7' },
      });
      this._log('info', 'Browser Playwright iniciado');
    }
  }

  async close() {
    if (this._context) await this._context.close();
    if (this._browser) await this._browser.close();
    this._context = null;
    this._browser = null;
    this._log('info', `Encerrado · ok=${this._stats.ok} · fail=${this._stats.fail}`);
  }

  // -----------------------------------------------------------
  // Core fetch (com retries)
  // -----------------------------------------------------------
  async fetchHTML(url) {
    let lastErr = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // delay com jitter ANTES de cada request (incluindo retry)
        await delay(this.minDelayMs);
        if (this.usePlaywright) {
          return await this._fetchWithPlaywright(url);
        }
        return await this._fetchPlain(url);
      } catch (err) {
        lastErr = err;
        const backoff = this.minDelayMs * Math.pow(2, attempt - 1);
        this._log('warn', `Tentativa ${attempt}/${this.maxRetries} falhou para ${url}: ${err.message}. Backoff ${backoff}ms`);
        await delay(backoff);
      }
    }
    throw lastErr || new Error(`fetchHTML failed: ${url}`);
  }

  async _fetchWithPlaywright(url) {
    if (!this._context) throw new Error('Scraper não inicializado — chama .init() primeiro');
    const page = await this._context.newPage();
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!resp || !resp.ok()) {
        throw new Error(`HTTP ${resp ? resp.status() : 'sem resposta'}`);
      }
      // dá tempo a SPAs montarem
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      const html = await page.content();
      return html;
    } finally {
      await page.close();
    }
  }

  async _fetchPlain(url) {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  }

  // -----------------------------------------------------------
  // API pública: scraping de 1 produto e batch
  // -----------------------------------------------------------
  /**
   * Faz scrape de uma URL e devolve o produto parsed.
   * @param {string} url URL do produto
   * @returns {Promise<{price:number|null, in_stock:boolean, url:string, error?:string}>}
   */
  async scrapeProduct(url) {
    try {
      const html = await this.fetchHTML(url);
      const data = await this.parseProductPage(html, url);
      this._stats.ok++;
      return { ...data, url, store_slug: this.storeSlug };
    } catch (err) {
      this._stats.fail++;
      this._log('error', `Falha em ${url}: ${err.message}`);
      return {
        price: null,
        in_stock: false,
        url,
        store_slug: this.storeSlug,
        error: err.message,
      };
    }
  }

  /**
   * Scrape em lote, sequencial com delays.
   * @param {string[]} urls
   * @returns {Promise<Array>}
   */
  async scrapeBatch(urls) {
    const results = [];
    for (const url of urls) {
      results.push(await this.scrapeProduct(url));
    }
    return results;
  }

  // -----------------------------------------------------------
  // Contracto a implementar pelos subclasses
  // -----------------------------------------------------------
  /**
   * Parse uma página HTML e devolve { price, in_stock, name?, ean?, image? }.
   * Subclasses DEVEM implementar.
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars
  async parseProductPage(html, url) {
    throw new Error(`${this.storeSlug}: parseProductPage não implementado`);
  }

  // -----------------------------------------------------------
  // Helpers utilitários para subclasses
  // -----------------------------------------------------------
  /** Extrai um número de uma string "12,99 €" → 12.99 */
  parsePrice(str) {
    if (str == null) return null;
    const m = String(str).replace(/\s+/g, '').match(/(\d+)[.,]?(\d{0,2})/);
    if (!m) return null;
    const decimals = m[2] ? '.' + m[2].padEnd(2, '0') : '';
    return parseFloat(m[1] + decimals);
  }

  /** Tenta extrair JSON-LD `Product` de um HTML. */
  extractJsonLd(html) {
    const out = [];
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html))) {
      try {
        const parsed = JSON.parse(m[1].trim());
        if (Array.isArray(parsed)) out.push(...parsed);
        else out.push(parsed);
      } catch (_) {}
    }
    return out;
  }

  /** Procura no JSON-LD um node `@type: "Product"`. */
  findProductLd(html) {
    const ld = this.extractJsonLd(html);
    return ld.find((n) => {
      const t = n['@type'];
      return t === 'Product' || (Array.isArray(t) && t.includes('Product'));
    });
  }

  _log(level, msg) {
    const ts = new Date().toISOString();
    const fn = this.logger[level] || this.logger.log || console.log;
    fn.call(this.logger, `[${ts}] [${this.storeSlug}] ${msg}`);
  }
}

module.exports = { BaseScraper, delay, randomUA, USER_AGENTS };
