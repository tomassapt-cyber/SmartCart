// Classe base dos scrapers TS. Lê alvos da view store_catalog (schema unificado) e persiste em prices (append-only).
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { PoolClient } from 'pg';
import { pool, withTransaction } from '../db';
import { checkAndInsertAlert } from '../utils/priceAlert';
import { delay } from '../utils/delay';

export interface ProductTarget {
  product_id: number;
  store_id: number;
  url: string | null;     // pode ser null na 1ª corrida (sem histórico) — scraper resolve por search
  ean: string;
  name: string;
  brand: string;
  brand_slug: string | null;
}

export interface ScrapeResult {
  product_id: number;
  store_id: number;
  price: number | null;
  in_stock: boolean;
  url: string;
  error?: string;
}

export interface ScrapeSummary {
  store_slug: string;
  ok: number;
  fail: number;
  log_id: number;
}

/**
 * Classe base para todos os scrapers.
 * Cada loja implementa `scrapeProductPage` com os selectores específicos.
 *
 * Pipeline:
 *   1. fetchTargets() lê de store_catalog: pares (product × store) elegíveis
 *      por tier/segment/categoria. Funciona mesmo sem histórico de preços.
 *   2. scrapeProductPage() (concreto por loja) extrai price + in_stock
 *   3. persist() faz INSERT em prices (append-only) + check de alertas
 */
export abstract class BaseScraper {
  abstract storeSlug: string;
  abstract storeName: string;

  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;

  async launch(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pt-PT',
      timezoneId: 'Europe/Lisbon',
      viewport: { width: 1366, height: 768 },
      extraHTTPHeaders: { 'Accept-Language': 'pt-PT,pt;q=0.9' },
    });
    await this.context.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf}', (route) => route.abort());
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.browser = null;
    this.context = null;
  }

  /** Abre uma página de produto e devolve preço + stock. */
  abstract scrapeProductPage(page: Page, url: string): Promise<{ price: number | null; inStock: boolean }>;

  /**
   * Opcionalmente: cada scraper pode implementar resolveUrl(target) para
   * descobrir a URL canónica a partir de marca+nome+EAN quando last_url
   * é NULL. Default: lança erro pedindo URL na primeira corrida.
   */
  async resolveUrl(target: ProductTarget): Promise<string> {
    throw new Error(
      `${this.storeName}: produto ean=${target.ean} sem URL histórica. ` +
      `Implementa resolveUrl() ou popula latest_prices manualmente.`,
    );
  }

  // ----------------------------------------------------------
  // Orquestração: buscar targets + scraping loop
  // ----------------------------------------------------------
  async run(): Promise<ScrapeSummary> {
    const logId = await this.startLog();
    let ok = 0, fail = 0;
    try {
      await this.launch();
      const targets = await this.fetchTargets();
      console.log(`[${this.storeName}] ${targets.length} produtos a verificar`);

      for (const target of targets) {
        try {
          // resolver URL se não houver histórica
          let url = target.url;
          if (!url) {
            try { url = await this.resolveUrl(target); }
            catch (err) {
              fail++;
              console.warn(`   ⚠ ${target.ean} sem URL: ${(err as Error).message}`);
              continue;
            }
          }
          const result = await this.scrapeOne({ ...target, url });
          if (result.price !== null) {
            await this.persist(result);
            ok++;
          } else {
            fail++;
            console.warn(`   ⚠ preço não encontrado: ${url}`);
          }
        } catch (err) {
          fail++;
          console.error(`   ✗ erro em ${target.url || target.ean}:`, (err as Error).message);
        }
        await delay();
      }

      // actualiza last_scraped_at da loja
      await pool.query(`UPDATE stores SET last_scraped_at = NOW() WHERE slug = $1`, [this.storeSlug]);
      await this.finishLog(logId, 'success', ok, fail);
    } catch (err) {
      await this.finishLog(logId, 'failed', ok, fail, (err as Error).message);
      throw err;
    } finally {
      await this.close();
    }

    return { store_slug: this.storeSlug, ok, fail, log_id: logId };
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  /**
   * Lê de store_catalog: universo a scrapar nesta loja com URL histórica
   * se já existir. Dá ao scraper o conhecimento exacto do que ir buscar.
   */
  private async fetchTargets(): Promise<ProductTarget[]> {
    const res = await pool.query<ProductTarget>(
      `SELECT
         product_id, store_id, last_url AS url, product_ean AS ean,
         product_name AS name, product_brand AS brand,
         product_brand_slug AS brand_slug
       FROM store_catalog
       WHERE store_slug = $1
       ORDER BY last_scraped_at NULLS FIRST, product_id`,
      [this.storeSlug],
    );
    return res.rows;
  }

  private async scrapeOne(target: ProductTarget & { url: string }): Promise<ScrapeResult> {
    const page = await this.context!.newPage();
    try {
      const { price, inStock } = await this.scrapeProductPage(page, target.url);
      return {
        product_id: target.product_id,
        store_id: target.store_id,
        price,
        in_stock: inStock,
        url: target.url,
      };
    } finally {
      await page.close();
    }
  }

  private async persist(result: ScrapeResult): Promise<void> {
    await withTransaction(async (client: PoolClient) => {
      await checkAndInsertAlert(client, result.product_id, result.store_id, result.price!);
      await client.query(
        `INSERT INTO prices (product_id, store_id, price, in_stock, url)
         VALUES ($1, $2, $3, $4, $5)`,
        [result.product_id, result.store_id, result.price, result.in_stock, result.url],
      );
    });
  }

  private async startLog(): Promise<number> {
    const res = await pool.query<{ id: number }>(
      `INSERT INTO scraping_logs (store_id, status)
       SELECT id, 'running' FROM stores WHERE slug = $1
       RETURNING id`,
      [this.storeSlug],
    );
    return res.rows[0].id;
  }

  private async finishLog(
    logId: number, status: string, ok: number, fail: number, errorMsg?: string,
  ): Promise<void> {
    await pool.query(
      `UPDATE scraping_logs
       SET finished_at = NOW(), status = $2, products_ok = $3, products_fail = $4, error_msg = $5
       WHERE id = $1`,
      [logId, status, ok, fail, errorMsg ?? null],
    );
  }
}
