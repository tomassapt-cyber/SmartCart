import { PoolClient } from 'pg';

const THRESHOLD_PCT = Number(process.env.PRICE_ALERT_THRESHOLD ?? 5);

interface PriceRow {
  product_id: number;
  store_id: number;
  price: number;
}

/**
 * Compara o novo preço com o último preço registado para o mesmo
 * (product, store). Se a variação for ≥ THRESHOLD_PCT, insere alerta.
 */
export async function checkAndInsertAlert(
  client: PoolClient,
  productId: number,
  storeId: number,
  newPrice: number,
): Promise<void> {
  const res = await client.query<PriceRow>(
    `SELECT price
     FROM prices
     WHERE product_id = $1 AND store_id = $2
     ORDER BY scraped_at DESC
     LIMIT 1`,
    [productId, storeId],
  );

  if (res.rowCount === 0) return; // sem histórico — primeira vez

  const oldPrice = Number(res.rows[0].price);
  if (oldPrice === 0) return;

  const variationPct = ((newPrice - oldPrice) / oldPrice) * 100;

  if (Math.abs(variationPct) >= THRESHOLD_PCT) {
    await client.query(
      `INSERT INTO price_alerts (product_id, store_id, old_price, new_price, variation_pct)
       VALUES ($1, $2, $3, $4, $5)`,
      [productId, storeId, oldPrice, newPrice, variationPct.toFixed(2)],
    );

    const direction = variationPct > 0 ? '↑' : '↓';
    console.log(
      `   🔔 Alerta de preço ${direction} ${Math.abs(variationPct).toFixed(1)}% ` +
        `(produto=${productId}, loja=${storeId}): ${oldPrice}€ → ${newPrice}€`,
    );
  }
}
