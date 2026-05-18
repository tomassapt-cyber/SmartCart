/**
 * Vai buscar a og:image de cada página Notino para os 20 produtos do seed.
 * As og:image da Notino são imagens oficiais do produto em fundo branco — perfeitas.
 *
 * Uso: node scripts/fetch-notino-images.js
 */
const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '..', 'db', 'seed-data.json');
const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

const notinoBlock = seed.store_products.find((sp) => sp.store_slug === 'notino');
const notinoByEan = new Map(notinoBlock.items.map((p) => [p.ean, p.url]));

async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m =
      html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
    return m ? m[1] : null;
  } catch (e) {
    return null;
  }
}

(async () => {
  let ok = 0,
    fail = 0;
  for (const p of seed.products) {
    const url = notinoByEan.get(p.ean);
    if (!url) {
      console.log(`[${p.ean}] sem URL Notino`);
      fail++;
      continue;
    }
    process.stdout.write(`[${p.ean}] ${p.brand.padEnd(20)} `);
    const img = await fetchOgImage(url);
    if (img) {
      p.image_url = img;
      ok++;
      console.log('✓');
    } else {
      fail++;
      console.log('✗');
    }
    await new Promise((r) => setTimeout(r, 800)); // cortês com Notino
  }
  fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2));
  console.log(`\n${ok} OK, ${fail} falhou.`);
})();
