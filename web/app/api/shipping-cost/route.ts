import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
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
  postalCode?: string;
  /** Subtotais por loja, opcional — para calcular envio grátis. */
  subtotals?: Record<string, number>;
}

interface StoreShipping {
  store_slug: string;
  store_name: string;
  district: string;
  zone: string;
  base_price: number;
  free_shipping_threshold: number;
  cost: number;          // já considerando o threshold (pode ser 0)
  free_shipping: boolean;
  min_days: number;
  max_days: number;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  // ----------------------------------------------------------
  // 1. Resolver distrito (CP4 → distrito tem prioridade sobre IP)
  // ----------------------------------------------------------
  let district: District | null = null;
  let source: 'postal_code' | 'ip' | 'fallback' = 'fallback';

  if (body.postalCode) {
    const cp4 = parsePostalCode(body.postalCode);
    if (cp4 !== null) {
      district = postalCodeToDistrict(cp4);
      source = 'postal_code';
    }
  }

  if (!district) {
    const ip = extractClientIp(req.headers);
    if (ip) {
      district = await ipToDistrict(ip);
      if (district) source = 'ip';
    }
  }

  if (!district) {
    district = 'Lisboa'; // fallback razoável
    source = 'fallback';
  }

  const zone = districtToShippingZone(district);

  // ----------------------------------------------------------
  // 2. Buscar regras de portes para todas as lojas activas
  //    Tenta a zona específica; se não houver entrada, cai em "nacional".
  // ----------------------------------------------------------
  const { rows } = await pool.query<{
    slug: string;
    name: string;
    free_shipping_threshold: string;
    price: string;
    min_days: number;
    max_days: number;
  }>(
    `SELECT s.slug,
            s.name,
            s.free_shipping_threshold,
            sr.price,
            sr.min_days,
            sr.max_days
     FROM stores s
     JOIN LATERAL (
       SELECT price, min_days, max_days
       FROM shipping_rules
       WHERE store_id = s.id
         AND district IN ($1, 'nacional')
       ORDER BY (district = $1) DESC  -- prioriza match exacto
       LIMIT 1
     ) sr ON TRUE
     WHERE s.active = TRUE
     ORDER BY s.name`,
    [zone],
  );

  const subtotals = body.subtotals ?? {};
  const shippingByStore: StoreShipping[] = rows.map((r) => {
    const subtotal = Number(subtotals[r.slug] ?? 0);
    const threshold = Number(r.free_shipping_threshold);
    const basePrice = Number(r.price);
    const free = subtotal > 0 && subtotal >= threshold;

    return {
      store_slug: r.slug,
      store_name: r.name,
      district,
      zone,
      base_price: basePrice,
      free_shipping_threshold: threshold,
      cost: free ? 0 : basePrice,
      free_shipping: free,
      min_days: r.min_days,
      max_days: r.max_days,
    };
  });

  return NextResponse.json({
    district,
    zone,
    resolved_from: source,
    stores: shippingByStore,
  });
}
