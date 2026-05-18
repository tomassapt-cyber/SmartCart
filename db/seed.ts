/**
 * Seed script — popula a base de dados com as lojas, produtos e preços iniciais.
 * Executa: npx ts-node seed.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../scraper/.env') });

interface SeedStore {
  slug: string;
  name: string;
  base_url: string;
  logo_url: string;
  free_shipping_threshold: number;
  shipping_zones: Record<string, number>;
}

interface SeedProduct {
  ean: string;
  name: string;
  brand: string;
  category: string;
  image_url: string;
}

interface SeedShippingRule {
  store_slug: string;
  district: string;
  price: number;
  min_days: number;
  max_days: number;
}

interface SeedStoreProduct {
  ean: string;
  price: number;
  in_stock: boolean;
  url: string;
}

interface SeedStoreProducts {
  store_slug: string;
  items: SeedStoreProduct[];
}

interface SeedData {
  stores: SeedStore[];
  products: SeedProduct[];
  shipping_rules: SeedShippingRule[];
  store_products: SeedStoreProducts[];
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const data: SeedData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8'),
  );

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // --------------------------------------------------------
    // 1. Lojas
    // --------------------------------------------------------
    console.log('→ A inserir lojas…');
    const storeIdBySlug: Record<string, number> = {};

    for (const store of data.stores) {
      const res = await client.query(
        `INSERT INTO stores (slug, name, base_url, logo_url, shipping_zones, free_shipping_threshold)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (slug) DO UPDATE SET
           name                    = EXCLUDED.name,
           base_url                = EXCLUDED.base_url,
           logo_url                = EXCLUDED.logo_url,
           shipping_zones          = EXCLUDED.shipping_zones,
           free_shipping_threshold = EXCLUDED.free_shipping_threshold
         RETURNING id`,
        [
          store.slug,
          store.name,
          store.base_url,
          store.logo_url,
          JSON.stringify(store.shipping_zones),
          store.free_shipping_threshold,
        ],
      );
      storeIdBySlug[store.slug] = res.rows[0].id;
      console.log(`   ✓ ${store.name} (id=${res.rows[0].id})`);
    }

    // --------------------------------------------------------
    // 2. Produtos
    // --------------------------------------------------------
    console.log('\n→ A inserir produtos…');
    const productIdByEan: Record<string, number> = {};

    for (const product of data.products) {
      const res = await client.query(
        `INSERT INTO products (ean, name, brand, category, image_url)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (ean) DO UPDATE SET
           name      = EXCLUDED.name,
           brand     = EXCLUDED.brand,
           category  = EXCLUDED.category,
           image_url = EXCLUDED.image_url
         RETURNING id`,
        [product.ean, product.name, product.brand, product.category, product.image_url],
      );
      productIdByEan[product.ean] = res.rows[0].id;
      console.log(`   ✓ ${product.name}`);
    }

    // --------------------------------------------------------
    // 3. Regras de envio
    // --------------------------------------------------------
    console.log('\n→ A inserir regras de envio…');

    for (const rule of data.shipping_rules) {
      const storeId = storeIdBySlug[rule.store_slug];
      if (!storeId) {
        console.warn(`   ⚠ Loja desconhecida: ${rule.store_slug}`);
        continue;
      }
      await client.query(
        `INSERT INTO shipping_rules (store_id, district, price, min_days, max_days)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (store_id, district) DO UPDATE SET
           price    = EXCLUDED.price,
           min_days = EXCLUDED.min_days,
           max_days = EXCLUDED.max_days`,
        [storeId, rule.district, rule.price, rule.min_days, rule.max_days],
      );
    }
    console.log(`   ✓ ${data.shipping_rules.length} regras inseridas`);

    // --------------------------------------------------------
    // 4. Preços iniciais (snapshot "ontem")
    // --------------------------------------------------------
    console.log('\n→ A inserir preços iniciais…');
    let priceCount = 0;
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();

    for (const storeProducts of data.store_products) {
      const storeId = storeIdBySlug[storeProducts.store_slug];
      if (!storeId) continue;

      for (const item of storeProducts.items) {
        const productId = productIdByEan[item.ean];
        if (!productId) {
          console.warn(`   ⚠ EAN desconhecido: ${item.ean}`);
          continue;
        }
        await client.query(
          `INSERT INTO prices (product_id, store_id, price, in_stock, url, scraped_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [productId, storeId, item.price, item.in_stock, item.url, yesterday],
        );
        priceCount++;
      }
    }
    console.log(`   ✓ ${priceCount} preços inseridos`);

    await client.query('COMMIT');
    console.log('\n✅ Seed concluído com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro no seed — rollback efectuado:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(process.exit.bind(process, 1));
