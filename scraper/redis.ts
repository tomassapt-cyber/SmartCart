import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis] Erro de ligação:', err.message);
});

/** TTL de 23h — invalida antes do próximo scraping às 06h00. */
const CACHE_TTL_SECONDS = 23 * 60 * 60;

const KEY_PRICES = 'smartcart:prices:today';
const KEY_LAST_SCRAPE = 'smartcart:last_scrape';

export async function cacheSetPrices(pricesJson: string): Promise<void> {
  await redis.set(KEY_PRICES, pricesJson, 'EX', CACHE_TTL_SECONDS);
}

export async function cacheGetPrices(): Promise<string | null> {
  return redis.get(KEY_PRICES);
}

export async function cacheInvalidatePrices(): Promise<void> {
  await redis.del(KEY_PRICES);
}

export async function cacheSetLastScrape(isoDate: string): Promise<void> {
  await redis.set(KEY_LAST_SCRAPE, isoDate, 'EX', CACHE_TTL_SECONDS);
}

export async function cacheGetLastScrape(): Promise<string | null> {
  return redis.get(KEY_LAST_SCRAPE);
}
