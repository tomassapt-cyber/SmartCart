import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  CartItem,
  optimizeCart,
  OfferRow,
  ProductInfo,
  StoreInfo,
} from '@/lib/cartOptimizer';
import {
  District,
  districtToShippingZone,
  parsePostalCode,
  postalCodeToDistrict,
} from '@/lib/postalCodes';
import { extractClientIp, ipToDistrict } from '@/lib/geolocation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  cart: CartItem[];
  postalCode?: string;
  district?: District;
  topN?: number;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const cart = (body.cart ?? []).filter(
    (i) => Number.isInteger(i.product_id) && Number.isInteger(i.quantity) && i.quantity > 0,
  );
  if (cart.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  // ----------------------------------------------------------
  // 1. Resolver distrito → zona de envio
  // ----------------------------------------------------------
  let district: District | null = body.district ?? null;

  if (!district && body.postalCode) {
    const cp4 = parsePostalCode(body.postalCode);
    if (cp4 !== null) district = postalCodeToDistrict(cp4);
  }
  if (!district) {
    const ip = extractClientIp(req.headers);
    if (ip) district = await ipToDistrict(ip);
  }
  if (!district) district = 'Lisboa';

  const zone = districtToShippingZone(district);

  // ----------------------------------------------------------
  // 2. Buscar produtos do carrinho
  // ----------------------------------------------------------
  const productIds = cart.map((i) => i.product_id);

  const [productsRes, storesRes, offersRes] = await Promise.all([
    pool.query<ProductInfo>(
      `SELECT id, name, brand, image_url
       FROM products
       WHERE id = ANY($1::int[])`,
      [productIds],
    ),
    pool.query<{
      id: number;
      slug: string;
      name: string;
      free_shipping_threshold: string;
      shipping_cost: string;
      shipping_min_days: number;
      shipping_max_days: number;
    }>(
      `SELECT s.id,
              s.slug,
              s.name,
              s.free_shipping_threshold,
              sr.price       AS shipping_cost,
              sr.min_days    AS shipping_min_days,
              sr.max_days    AS shipping_max_days
       FROM stores s
       JOIN LATERAL (
         SELECT price, min_days, max_days
         FROM shipping_rules
         WHERE store_id = s.id AND district IN ($1, 'nacional')
         ORDER BY (district = $1) DESC
         LIMIT 1
       ) sr ON TRUE
       WHERE s.active = TRUE`,
      [zone],
    ),
    pool.query<OfferRow>(
      `SELECT product_id, store_id, price::float8 AS price, in_stock, url, scraped_at
       FROM latest_prices
       WHERE product_id = ANY($1::int[])`,
      [productIds],
    ),
  ]);

  const products: ProductInfo[] = productsRes.rows;
  const stores: StoreInfo[] = storesRes.rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    free_shipping_threshold: Number(r.free_shipping_threshold),
    shipping_cost: Number(r.shipping_cost),
    shipping_min_days: r.shipping_min_days,
    shipping_max_days: r.shipping_max_days,
  }));
  const offers: OfferRow[] = offersRes.rows.map((o) => ({
    ...o,
    price: Number(o.price),
    scraped_at: new Date(o.scraped_at),
  }));

  // ----------------------------------------------------------
  // 3. Last-update timestamp (mostrado no UI: "Preços atualizados às …")
  // ----------------------------------------------------------
  const lastUpdate = offers.reduce<Date | null>((acc, o) => {
    return acc === null || o.scraped_at > acc ? o.scraped_at : acc;
  }, null);

  // ----------------------------------------------------------
  // 4. Otimizar
  // ----------------------------------------------------------
  const result = optimizeCart({
    cart,
    products,
    stores,
    offers,
    zone,
    topN: body.topN ?? 3,
  });

  return NextResponse.json({
    district,
    zone,
    last_price_update: lastUpdate?.toISOString() ?? null,
    cart_size: cart.length,
    ...result,
  });
}
