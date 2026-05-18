/**
 * Vai buscar URLs de imagens reais para cada produto via Open Beauty Facts.
 *
 * Estratégia em camadas:
 *   1. Open Beauty Facts (https://world.openbeautyfacts.org) — API pública por EAN.
 *   2. Open Food Facts fallback — alguns cosméticos estão lá.
 *   3. Mantém o image_url existente se nenhuma fonte responder.
 *
 * Uso: node scripts/fetch-product-images.js
 */

const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '..', 'db', 'seed-data.json');

async function tryOBF(ean) {
  const endpoints = [
    `https://world.openbeautyfacts.org/api/v2/product/${ean}.json`,
    `https://world.openfoodfacts.org/api/v2/product/${ean}.json`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SmartCart-Demo/1.0 (educational)' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const img =
        data?.product?.image_front_url ||
        data?.product?.image_url ||
        data?.product?.selected_images?.front?.display?.pt ||
        data?.product?.selected_images?.front?.display?.en;
      if (img) return img;
    } catch {
      /* ignore */
    }
  }
  return null;
}

(async () => {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  let updated = 0;
  let failed = 0;

  for (const p of seed.products) {
    process.stdout.write(`[${p.ean}] ${p.name.slice(0, 40).padEnd(40)} `);
    const img = await tryOBF(p.ean);
    if (img) {
      p.image_url = img;
      updated++;
      console.log('✓');
    } else {
      failed++;
      console.log('✗ (mantém placeholder)');
    }
    await new Promise((r) => setTimeout(r, 300)); // rate limit cortês
  }

  fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2));
  console.log(`\nDone. ${updated} atualizados, ${failed} sem imagem.`);
})();
