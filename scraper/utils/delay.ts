/** Aguarda entre `min` e `max` ms — jitter para imitar comportamento humano. */
export function delay(minMs?: number, maxMs?: number): Promise<void> {
  const min = minMs ?? Number(process.env.SCRAPE_DELAY_MS ?? 2000);
  const max = maxMs ?? min + 1000;
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Divide um array em chunks para processar em lotes (ex: N lojas em paralelo). */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
