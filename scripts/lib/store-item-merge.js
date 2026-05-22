/**
 * Store-item merge — junta múltiplos scraped products do mesmo catálogo
 * que mapeiam para o mesmo EAN canónico (cross-volume).
 * ============================================================
 *
 * Cenário típico: a loja tem páginas separadas para volumes diferentes
 * do mesmo produto (ex.: Sensibio 250ml e Sensibio 500ml). Ambas
 * mapeiam para o mesmo produto canónico via fingerprint. Em vez de
 * sobrescrever a item anterior, MERGEAMOS as variants — distinção de
 * volume vive DENTRO do store_product, nunca como múltiplas entries.
 */

const { extractVolumeMl } = require('./product-fingerprint');

/**
 * Constrói o array de variants base a partir de um scraped product.
 * Inclui variants[] da página + a "main" variant (volume extraído do nome).
 */
function buildBaseVariants(sp) {
  const baseVariants = (sp.variants || [])
    .filter(v => v.volume_ml > 0 && v.price > 0)
    .map(v => ({
      volume_ml: v.volume_ml,
      unit: v.unit || 'ml',
      price: Number(v.price.toFixed(2)),
      previous_price: v.previous_price && v.previous_price > v.price ? Number(v.previous_price.toFixed(2)) : null,
      in_stock: v.in_stock !== false,
      url: v.url || null,
    }));

  // Garantir que a variant "main" (volume do nome + preço principal) está incluída
  const mainVolume = extractVolumeMl(sp.name);
  if (mainVolume && sp.price > 0 && !baseVariants.some(v => v.volume_ml === mainVolume)) {
    baseVariants.push({
      volume_ml: mainVolume,
      unit: 'ml',
      price: Number(sp.price.toFixed(2)),
      previous_price: sp.previous_price && sp.previous_price > sp.price ? Number(sp.previous_price.toFixed(2)) : null,
      in_stock: sp.in_stock !== false,
      url: sp.url || null,
    });
  }
  return baseVariants;
}

/**
 * Cria ou actualiza um store_product item, mergeando variants em
 * vez de sobrescrever.
 *
 * @param {object} state — { storeSp, itemByEan, addedCounter, updatedCounter }
 * @param {string} targetEan — EAN canónico do produto
 * @param {object} sp — scraped product (com .name, .price, .url, .in_stock, .variants[], .scraped_at)
 * @param {string} sourceTimestamp — ISO date string para verified_at
 * @returns {object} { item, action: 'added'|'merged' }
 */
function upsertStoreItem(state, targetEan, sp, sourceTimestamp) {
  const baseVariants = buildBaseVariants(sp);
  const existingItem = state.itemByEan[targetEan];

  if (existingItem) {
    // MERGE: juntar variants, manter min price como headline
    const mergedVariants = [...(existingItem.variants || [])];
    for (const v of baseVariants) {
      const dup = mergedVariants.find(ev =>
        ev.volume_ml === v.volume_ml && (ev.url === v.url || (!ev.url && !v.url))
      );
      if (!dup) {
        mergedVariants.push(v);
      } else if (v.price < dup.price) {
        // mesmo volume + mesma URL → manter preço mais baixo
        dup.price = v.price;
        dup.in_stock = dup.in_stock || v.in_stock;
      }
    }
    mergedVariants.sort((a, b) => a.volume_ml - b.volume_ml);
    const allPrices = mergedVariants.map(v => v.price).filter(p => p > 0);
    const headlinePrice = allPrices.length ? Math.min(...allPrices) : existingItem.price;
    // URL: manter a do volume mais barato in_stock (mais útil para o user)
    const cheapestInStock = mergedVariants.find(v => v.price === headlinePrice && v.in_stock);
    const headlineUrl = cheapestInStock?.url || existingItem.url || sp.url;

    existingItem.variants = mergedVariants.length > 0 ? mergedVariants : undefined;
    existingItem.price = Number(headlinePrice.toFixed(2));
    existingItem.url = headlineUrl;
    existingItem.in_stock = existingItem.in_stock || sp.in_stock !== false;
    existingItem.verified_at = sp.scraped_at || sourceTimestamp;
    // Re-derivar previous_price/discount_pct para a variante headline (a mais barata)
    const headlineVariant = mergedVariants.find(v => v.price === headlinePrice);
    if (headlineVariant && headlineVariant.previous_price) {
      existingItem.previous_price = headlineVariant.previous_price;
      existingItem.discount_pct = Math.round((1 - headlinePrice / headlineVariant.previous_price) * 100);
    } else if (sp.previous_price && sp.previous_price > headlinePrice) {
      existingItem.previous_price = Number(sp.previous_price.toFixed(2));
      existingItem.discount_pct = Math.round((1 - headlinePrice / sp.previous_price) * 100);
    }
    if (state.updatedCounter) state.updatedCounter.value++;
    return { item: existingItem, action: 'merged' };
  }

  // Criar novo store_product item — preserva previous_price/discount_pct
  // do scrape (vem das promoções activas da loja). Sem isto, os filtros
  // Promoções e secção Em Alta perdem 95%+ das ofertas reais.
  const prev = sp.previous_price && sp.previous_price > sp.price ? Number(sp.previous_price.toFixed(2)) : null;
  const discount = sp.discount_pct
    ? Math.round(sp.discount_pct)
    : (prev ? Math.round((1 - sp.price / prev) * 100) : null);
  const item = {
    ean: targetEan,
    price: Number(sp.price.toFixed(2)),
    previous_price: prev,
    discount_pct: discount,
    in_stock: sp.in_stock !== false,
    url: sp.url,
    verified: true,
    verified_url: true,
    verified_at: sp.scraped_at || sourceTimestamp,
    source: 'scraped',
    variants: baseVariants.length > 0 ? baseVariants : undefined,
  };
  state.storeSp.items.push(item);
  state.itemByEan[targetEan] = item;
  if (state.addedCounter) state.addedCounter.value++;
  return { item, action: 'added' };
}

module.exports = { buildBaseVariants, upsertStoreItem };
