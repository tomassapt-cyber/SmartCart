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

const fs = require('fs');
const path = require('path');
const { extractVolumeMl } = require('./product-fingerprint');

// Blocklist de ofertas com EAN ERRADO da própria loja (a loja publica este
// EAN para OUTRO produto — ex.: mordedor de bebé com EAN de creme Clarins).
// Mantida por scripts/audit-price-outliers.js em data/offer-ean-blocklist.json.
// Sem esta guarda, remover a oferta do seed dura 1 dia: o integrador diário
// re-adiciona-a no próximo scrape da loja.
let _blockedOffers = null;
function isBlockedOffer(storeSlug, ean) {
  if (!_blockedOffers) {
    _blockedOffers = new Set();
    try {
      const bl = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'offer-ean-blocklist.json'), 'utf8'));
      for (const b of (bl.blocked || [])) _blockedOffers.add(`${b.store_slug}|${b.ean}`);
    } catch { /* sem blocklist → nada bloqueado */ }
  }
  return _blockedOffers.has(`${storeSlug}|${ean}`);
}

/**
 * Constrói o array de variants base a partir de um scraped product.
 * Inclui variants[] da página + a "main" variant (volume extraído do nome).
 */
function buildBaseVariants(sp) {
  // CRÍTICO: o scraper só captura URL quando o elemento DOM é <a>. Para tiles
  // (button/div/li) a URL fica null. Mas a página scraped (sp.url) É a página
  // dessa variante para muitos sites (Druni/Sweetcare visitam URL por volume).
  // Por isso fallback v.url → sp.url para que cada variante tenha sempre um
  // destino útil quando o user clica "Abrir".
  const baseVariants = (sp.variants || [])
    .filter(v => v.volume_ml > 0 && v.price > 0)
    .map(v => ({
      volume_ml: v.volume_ml,
      unit: v.unit || 'ml',
      price: Number(v.price.toFixed(2)),
      previous_price: v.previous_price && v.previous_price > v.price ? Number(v.previous_price.toFixed(2)) : null,
      in_stock: v.in_stock !== false,
      url: v.url || sp.url || null,
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
  // Defensive: skip products sem preço ou preço inválido. Acontece quando
  // scrape obteve JSON-LD parcial (sem offers) — não-fatal, só ignorar.
  const spPrice = typeof sp?.price === 'number' && isFinite(sp.price) && sp.price > 0 ? sp.price : null;
  if (!spPrice) return { item: null, action: 'skipped' };
  // Oferta confirmada como produto-errado neste EAN → nunca (re-)adicionar.
  if (isBlockedOffer(state.storeSp?.store_slug, targetEan)) return { item: null, action: 'blocked' };
  const baseVariants = buildBaseVariants(sp);
  const existingItem = state.itemByEan[targetEan];

  if (existingItem) {
    // MERGE: juntar variants, manter min price como headline.
    // Regra de dedup: variantes com MESMO volume colidem (ignorando URL).
    //
    // DENTRO do batch (baseVariants desta página): mesmo volume em vários
    // "subtypes" (ex.: sweetcare 500ml normal/pump/reverse) → fica o mais
    // barato in-stock (arbitragem de subtipo).
    // ENTRE batch e histórico: o scrape FRESCO SUBSTITUI o preço antigo do
    // mesmo volume — subidas de preço TÊM de propagar. A regra antiga
    // ("preço mais baixo ganha") deixava preços antigos errados/baixos
    // presos para sempre (ex.: druni 100/250/500ml todos @4.50 de um scrape
    // com bug, nunca curados pelos preços reais 4.50/9.29/10.99) e escondia
    // TODAS as subidas de preço reais — fatal num comparador.
    const batch = [];
    for (const v of baseVariants) {
      const dup = batch.find(b => b.volume_ml === v.volume_ml);
      if (!dup) { batch.push(v); continue; }
      const better = (v.in_stock && !dup.in_stock) || ((v.in_stock === dup.in_stock) && v.price < dup.price);
      if (better) batch[batch.indexOf(dup)] = { ...v, url: v.url || dup.url };
      else if (!dup.url && v.url) dup.url = v.url;
    }
    const mergedVariants = [...(existingItem.variants || [])];
    for (const v of batch) {
      const dup = mergedVariants.find(ev => ev.volume_ml === v.volume_ml);
      if (!dup) {
        mergedVariants.push(v);
        continue;
      }
      // fresco substitui histórico (preço atual da loja, para cima ou baixo)
      dup.price = v.price;
      dup.in_stock = v.in_stock;
      dup.previous_price = v.previous_price || null;
      // Promover URL: se existing não tem mas nova tem, copia
      if (!dup.url && v.url) dup.url = v.url;
    }
    mergedVariants.sort((a, b) => a.volume_ml - b.volume_ml);
    // Headline = variante mais barata EM STOCK (senão a mais barata; senão o
    // preço fresco do scrape — nunca o headline antigo, que pode estar stale).
    const inStockPrices = mergedVariants.filter(v => v.in_stock && v.price > 0).map(v => v.price);
    const allPrices = mergedVariants.map(v => v.price).filter(p => p > 0);
    const headlinePrice = inStockPrices.length ? Math.min(...inStockPrices)
      : (allPrices.length ? Math.min(...allPrices) : spPrice);
    // URL: manter a do volume mais barato in_stock (mais útil para o user)
    const cheapestInStock = mergedVariants.find(v => v.price === headlinePrice && v.in_stock);
    const headlineUrl = cheapestInStock?.url || existingItem.url || sp.url;

    existingItem.variants = mergedVariants.length > 0 ? mergedVariants : undefined;
    existingItem.price = Number(headlinePrice.toFixed(2));
    existingItem.url = headlineUrl;
    // Disponibilidade FRESCA: com variantes, "alguma em stock"; sem, o scrape
    // actual manda. (A regra antiga "existing || novo" nunca deixava uma
    // oferta passar a esgotada — stock sticky é tão enganador como preço sticky.)
    existingItem.in_stock = mergedVariants.length > 0
      ? mergedVariants.some(v => v.in_stock)
      : sp.in_stock !== false;
    existingItem.verified_at = sp.scraped_at || sourceTimestamp;
    // Re-derivar previous_price/discount_pct para a variante headline (a mais barata)
    const headlineVariant = mergedVariants.find(v => v.price === headlinePrice);
    if (headlineVariant && headlineVariant.previous_price) {
      existingItem.previous_price = headlineVariant.previous_price;
      existingItem.discount_pct = Math.round((1 - headlinePrice / headlineVariant.previous_price) * 100);
    } else if (sp.previous_price && sp.previous_price > headlinePrice) {
      existingItem.previous_price = Number(sp.previous_price.toFixed(2));
      existingItem.discount_pct = Math.round((1 - headlinePrice / sp.previous_price) * 100);
    } else {
      // promo antiga terminou → não deixar o claim de desconto stale no card
      existingItem.previous_price = null;
      existingItem.discount_pct = null;
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

/**
 * Passe de REFRESH POR URL (anti-oferta-amarela): para cada produto do catálogo
 * fresco cujo URL já é uma oferta desta loja, refresca preço/stock/verified_at
 * nessa oferta — a identidade produto↔oferta foi estabelecida quando a oferta
 * nasceu; o scrape fresco do MESMO URL é a mesma oferta, mesmo que a ficha
 * tenha perdido a chave (EAN→null) ou o nome tenha derivado (fingerprint já
 * não casa). Sem isto, essas ofertas ficam presas com verificação amarela.
 *
 * @param {object} state  — { storeSp, itemByEan, addedCounter, updatedCounter }
 * @param {Array}  products — entradas do catálogo fresco ({url, price, ...})
 * @param {string} scrapedAt — timestamp do scrape
 * @param {function} [skip] — opcional: skip(ep) true → deixa para a cascata normal
 * @returns {{refreshed:number, usedUrls:Set<string>}}
 */
function urlRefreshPass(state, products, scrapedAt, skip) {
  const itemByUrl = {};
  for (const item of state.storeSp.items) {
    if (item.url) itemByUrl[item.url] = item;
    for (const v of (item.variants || [])) if (v.url) itemByUrl[v.url] = itemByUrl[v.url] || item;
  }
  let refreshed = 0; const usedUrls = new Set();
  for (const ep of products) {
    if (!ep || !ep.url || !(ep.price > 0)) continue;
    if (skip && skip(ep)) continue;
    const it = itemByUrl[ep.url];
    if (!it) continue;
    const r = upsertStoreItem(state, it.ean, ep, scrapedAt);
    if (r.action === 'merged' || r.action === 'added') { refreshed++; usedUrls.add(ep.url); }
  }
  return { refreshed, usedUrls };
}

module.exports = { buildBaseVariants, upsertStoreItem, isBlockedOffer, urlRefreshPass };
