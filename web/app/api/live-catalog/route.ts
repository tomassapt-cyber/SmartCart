import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function withCors(body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
    },
  });
}

export async function OPTIONS() {
  return withCors({}, 204);
}

export async function GET() {
  try {
    const [storesRes, productsRes, offersRes] = await Promise.all([
      pool.query<{
        slug: string;
        name: string;
        base_url: string;
        logo_url: string | null;
        free_shipping_threshold: string;
        shipping_zones: unknown;
      }>(
        `SELECT slug, name, base_url, logo_url, free_shipping_threshold, shipping_zones
         FROM stores
         WHERE active = TRUE
         ORDER BY name ASC`,
      ),
      pool.query<{
        ean: string;
        name: string;
        brand: string;
        category: string;
        image_url: string | null;
      }>(
        `SELECT ean, name, brand, category, image_url
         FROM products
         ORDER BY brand ASC, name ASC`,
      ),
      pool.query<{
        ean: string;
        store_slug: string;
        price: number;
        in_stock: boolean;
        url: string | null;
        scraped_at: string;
      }>(
        `SELECT p.ean,
                s.slug AS store_slug,
                lp.price::float8 AS price,
                lp.in_stock,
                lp.url,
                lp.scraped_at
         FROM latest_prices lp
         JOIN products p ON p.id = lp.product_id
         JOIN stores s   ON s.id = lp.store_id
         WHERE s.active = TRUE`,
      ),
    ]);

    return withCors({
      fetched_at: new Date().toISOString(),
      stores: storesRes.rows.map((s) => ({
        slug: s.slug,
        name: s.name,
        base_url: s.base_url,
        logo_url: s.logo_url,
        free_shipping_threshold: Number(s.free_shipping_threshold),
        shipping_zones: s.shipping_zones ?? {},
      })),
      products: productsRes.rows,
      offers: offersRes.rows.map((o) => ({
        ean: o.ean,
        store_slug: o.store_slug,
        price: Number(o.price),
        in_stock: o.in_stock,
        url: o.url,
        scraped_at: o.scraped_at,
      })),
    });
  } catch (error) {
    return withCors(
      {
        error: 'Failed to fetch live catalog',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}
