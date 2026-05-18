// Entrada do orchestrator TS: corre scrapers registados no Map, persiste em prices, regenera demo.html ao fim.
/**
 * SmartCart Scraper — entrada principal
 *
 * Modos:
 *   node dist/index.js             → arranca cron (06h00 PT diário)
 *   node dist/index.js --run-now   → corre imediato e sai
 *
 * Após scraping bem sucedido:
 *   - prices populado (append-only)
 *   - cache Redis invalidado
 *   - stores.last_scraped_at actualizado
 *   - data/{products-master,prices-snapshot}.json + demo.html regenerados
 *     via build-demo-seed.js + inject-seed-into-demo.js
 *
 * Adicionar nova loja:
 *   1. Criar scraper em scrapers/<slug>.ts (estende BaseScraper)
 *   2. Importar e registar no Map SCRAPERS abaixo
 *   3. Garantir que a loja existe em stores (build-catalog.js trata disto)
 */

import * as path from 'path';
import { spawnSync } from 'child_process';
import * as cron from 'node-cron';
import * as dotenv from 'dotenv';
import { pool } from './db';
import { redis, cacheInvalidatePrices, cacheSetLastScrape } from './redis';
import { NotinoScraper } from './scrapers/notino';
import { BaseScraper, ScrapeSummary } from './scrapers/base';
import { chunk } from './utils/delay';

dotenv.config();

// ------------------------------------------------------------
// Registo de scrapers por slug de loja.
// Adicionar novos scrapers aqui à medida que forem validados.
// ------------------------------------------------------------
const SCRAPERS = new Map<string, BaseScraper>([
  ['notino',  new NotinoScraper()],
  // ['douglas', new DouglasScraper()],
  // ['sephora', new SephoraScraper()],
  // ['druni',   new DruniScraper()],
]);

const CONCURRENCY = Number(process.env.SCRAPE_CONCURRENCY ?? 2);
const CRON_EXPR = process.env.SCRAPE_CRON ?? '0 6 * * *';

// ------------------------------------------------------------
// Main scraping
// ------------------------------------------------------------
async function runAllScrapers(): Promise<void> {
  const startedAt = new Date();
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🚀 Scraping iniciado às ${startedAt.toLocaleTimeString('pt-PT')}`);
  console.log(`${'─'.repeat(60)}\n`);

  try {
    await cacheInvalidatePrices();
    console.log('[Cache] Redis invalidado ✓\n');
  } catch (err) {
    console.warn('[Cache] Não foi possível invalidar Redis:', (err as Error).message);
  }

  const scrapers = [...SCRAPERS.values()];
  const summaries: ScrapeSummary[] = [];

  for (const batch of chunk(scrapers, CONCURRENCY)) {
    const results = await Promise.allSettled(
      batch.map(async (scraper) => {
        console.log(`► A iniciar scraper: ${scraper.storeName}`);
        try {
          return await scraper.run();
        } catch (err) {
          console.error(`✗ ${scraper.storeName} falhou:`, (err as Error).message);
          return { store_slug: scraper.storeSlug, ok: 0, fail: 0, log_id: -1 } satisfies ScrapeSummary;
        }
      }),
    );
    for (const r of results) if (r.status === 'fulfilled') summaries.push(r.value);
  }

  // ─── Relatório ───
  const finishedAt = new Date();
  const durationSec = ((finishedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ Scraping concluído em ${durationSec}s`);
  console.log(`${'─'.repeat(60)}`);
  let totalOk = 0, totalFail = 0;
  for (const s of summaries) {
    const icon = s.fail > 0 ? (s.ok === 0 ? '✗' : '⚠') : '✓';
    console.log(`   ${icon} ${s.store_slug.padEnd(12)} ok=${s.ok}  falha=${s.fail}`);
    totalOk += s.ok;
    totalFail += s.fail;
  }
  console.log(`${'─'.repeat(60)}`);
  console.log(`   Total: ${totalOk} OK  |  ${totalFail} falha(s)`);
  console.log(`${'─'.repeat(60)}\n`);

  try { await cacheSetLastScrape(finishedAt.toISOString()); } catch { /* não crítico */ }

  // ─── Regenera demo.html ───
  await regenerateDemo();
}

/**
 * Após cada job, regenera o demo.html para reflectir os preços do dia.
 * Lê de products/prices da BD (via export-snapshot) → builda seed → injecta.
 */
async function regenerateDemo(): Promise<void> {
  const ROOT = path.resolve(__dirname, '..', '..');     // dist/index.js → scraper/dist/index.js → ROOT é dois acima
  // Nota: ajustar caminho se a build colocar dist noutro sítio
  console.log('► A regenerar demo.html…');

  // 1) Export do estado actual da BD para data/products-master + prices-snapshot
  try {
    await exportSnapshotFromDb(ROOT);
  } catch (err) {
    console.warn('  ⚠ export do snapshot falhou:', (err as Error).message);
    return;
  }

  // 2) Builda seed e injecta no demo
  for (const script of ['build-demo-seed.js', 'inject-seed-into-demo.js']) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script)], { stdio: 'inherit' });
    if (r.status !== 0) console.warn(`  ⚠ ${script} falhou (exit ${r.status})`);
  }
  console.log('✔ demo.html regenerado');
}

/**
 * Exporta o estado actual de products + latest_prices para JSONs
 * (formato esperado pelo build-demo-seed.js).
 */
async function exportSnapshotFromDb(rootDir: string): Promise<void> {
  const fs = await import('fs');
  const { rows: products } = await pool.query(`
    SELECT ean, name, brand, brand_slug, category, segment,
           volume_ml, volume_unit, base_price, image_url, ean_source
    FROM products WHERE active = TRUE ORDER BY brand, name
  `);
  const { rows: prices } = await pool.query(`
    SELECT p.ean, s.slug AS store_slug, lp.price, lp.previous_price,
           lp.discount_pct, lp.currency, lp.in_stock, lp.url, lp.scraped_at
    FROM latest_prices lp
    JOIN products p ON p.id = lp.product_id
    JOIN stores s   ON s.id = lp.store_id
  `);
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(rootDir, 'data', 'products-master.json'),
    JSON.stringify({ version: '2.0', generated_at: now, count: products.length, products }, null, 2));
  fs.writeFileSync(path.join(rootDir, 'data', 'prices-snapshot.json'),
    JSON.stringify({ version: '2.0', generated_at: now, count: prices.length, prices }, null, 2));
  console.log(`  ✓ exportado: ${products.length} produtos · ${prices.length} preços`);
}

// ------------------------------------------------------------
// Arranque
// ------------------------------------------------------------
async function main(): Promise<void> {
  const runNow = process.argv.includes('--run-now');

  if (runNow) {
    try { await runAllScrapers(); }
    finally {
      await pool.end();
      try { redis.disconnect(); } catch { /* ok */ }
    }
    return;
  }

  console.log(`⏰ Cron configurado: "${CRON_EXPR}" (próxima execução às 06:00 PT)`);
  const task = cron.schedule(CRON_EXPR, async () => {
    try { await runAllScrapers(); } catch (err) { console.error('Erro no job cron:', err); }
  }, { timezone: 'Europe/Lisbon' });

  process.on('SIGINT', async () => {
    console.log('\n🛑 A encerrar…');
    task.stop();
    await pool.end();
    try { redis.disconnect(); } catch { /* ok */ }
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    task.stop();
    await pool.end();
    try { redis.disconnect(); } catch { /* ok */ }
    process.exit(0);
  });

  console.log('✅ Scraper em espera. Ctrl+C para sair.\n');
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1); });
