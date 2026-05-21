#!/usr/bin/env node
/**
 * Build homepage data — extrai ~25 produtos curados do seed completo
 * (18 577 produtos) para injectar na homepage estática.
 *
 * Output: data/homepage-data.json (~50 KB em vez de 10 MB)
 *
 * Estrutura:
 * {
 *   hero_sponsored: [Product × 5],     // EANs curados
 *   bestsellers:    [Product × 5],     // Top 5 por nº de lojas
 *   skincare_kits:  [Product × 5],     // Filtrar kit/cofre/set/pack
 *   em_alta:        [Product × 5],     // 1 featured + 4 patrocinados
 *   top_brands:     [String × 6],      // Top 6 marcas por contagem
 * }
 *
 * Cada Product traz: ean, name, brand, image_url, best_offer (price, store, url)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const OUT = path.join(ROOT, 'data', 'homepage-data.json');

const SPONSORED_EANS = [
  '3365440787858', // YSL Black Opium
  '3337875585026', // LRP Effaclar Duo+
  '3614271326072', // Lancôme Génifique
  '0887167491625', // Estée Lauder ANR
  '8719134109924', // Rituals Sakura
];

const EM_ALTA_EANS = [
  '3337875585132', // Vichy Minéral 89 (featured big)
  '3401395614172', // Bioderma Sensibio
  '3337875797436', // LRP Anthelios
  '3264680004605', // Nuxe Huile Prodigieuse
  '3522930003151', // Caudalie Vinoperfect
];

const KIT_KEYWORDS = /\b(kit|cofre|set|pack|estuche|conjunto|coffret|bundle|trio|duo)\b/i;

function stripVolume(name) {
  return String(name || '').replace(/\s*\d+(?:[.,]\d+)?\s*(?:ml|gr|g|kg|l)\b/gi, '').trim();
}

function bestOfferFor(seed, ean) {
  let best = null;
  for (const sp of seed.store_products) {
    const item = sp.items.find(i => i.ean === ean && i.in_stock);
    if (!item || item.price == null) continue;
    const hasReal = item.verified === true
      || /scraped|canonical/i.test(item.source || '')
      || (item.variants && item.variants.some(v => v.price > 0));
    if (!hasReal) continue;
    if (!best || item.price < best.price) {
      const store = seed.stores.find(s => s.slug === sp.store_slug);
      best = { price: item.price, store_slug: sp.store_slug, store_name: store?.name || sp.store_slug, url: item.url };
    }
  }
  return best;
}

function countStores(seed, ean) {
  let n = 0;
  for (const sp of seed.store_products) {
    if (sp.items.some(i => i.ean === ean && i.in_stock)) n++;
  }
  return n;
}

function condenseProduct(seed, p) {
  if (!p) return null;
  const best = bestOfferFor(seed, p.ean);
  return {
    ean: p.ean,
    name: stripVolume(p.name),
    brand: p.brand,
    image_url: p.image_url || null,
    best_price: best?.price ?? null,
    best_store: best?.store_name ?? null,
    best_store_slug: best?.store_slug ?? null,
    best_url: best?.url ?? null,
  };
}

function condenseByEan(seed, eans) {
  return eans
    .map(ean => seed.products.find(p => p.ean === ean))
    .filter(Boolean)
    .map(p => condenseProduct(seed, p))
    .filter(p => p && p.best_price != null); // só com oferta válida
}

(function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  console.log(`📦 Seed: ${seed.products.length} produtos`);

  // 1) Hero sponsored — EANs curados
  const heroSponsored = condenseByEan(seed, SPONSORED_EANS);
  console.log(`  Hero sponsored: ${heroSponsored.length}/5`);

  // 2) Bestsellers — top 5 por nº de lojas (excluindo já no hero/em-alta)
  const usedEans = new Set([...SPONSORED_EANS, ...EM_ALTA_EANS]);
  const candidates = seed.products
    .filter(p => !usedEans.has(p.ean) && p.image_url) // só com imagem
    .map(p => ({ p, n: countStores(seed, p.ean) }))
    .sort((a, b) => b.n - a.n);
  const bestsellersRaw = candidates.slice(0, 5).map(c => c.p);
  bestsellersRaw.forEach(p => usedEans.add(p.ean));
  const bestsellers = bestsellersRaw.map(p => condenseProduct(seed, p)).filter(p => p?.best_price != null);
  console.log(`  Bestsellers: ${bestsellers.length}/5`);

  // 3) Skincare kits — filtrar por keyword + ter imagem
  const kitCandidates = seed.products
    .filter(p => !usedEans.has(p.ean) && KIT_KEYWORDS.test(p.name) && p.image_url)
    .map(p => ({ p, n: countStores(seed, p.ean) }))
    .sort((a, b) => b.n - a.n);
  const kitsRaw = kitCandidates.slice(0, 5).map(c => c.p);
  kitsRaw.forEach(p => usedEans.add(p.ean));
  const skincareKits = kitsRaw.map(p => condenseProduct(seed, p)).filter(p => p?.best_price != null);
  console.log(`  Skincare kits: ${skincareKits.length}/5`);

  // 4) Em alta — EANs curados
  const emAlta = condenseByEan(seed, EM_ALTA_EANS);
  console.log(`  Em alta: ${emAlta.length}/5`);

  // 5) Top brands — top 6 por nº de produtos
  const brandCount = {};
  for (const p of seed.products) brandCount[p.brand] = (brandCount[p.brand] || 0) + 1;
  const topBrands = Object.entries(brandCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([brand, n]) => ({ name: brand, products: n }));
  console.log(`  Top brands: ${topBrands.length}`);

  const out = {
    generated_at: new Date().toISOString(),
    seed_total_products: seed.products.length,
    hero_sponsored: heroSponsored,
    bestsellers,
    skincare_kits: skincareKits,
    em_alta: emAlta,
    top_brands: topBrands,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`\n✓ ${OUT.replace(ROOT, '.')} (${kb} KB)`);
})();
