/**
 * "Este endereço já é uma oferta desta loja?" → o produto a que ela pertence.
 * ============================================================
 * PORQUÊ (2026-10-02): vários integradores casam por EAN e depois por
 * fingerprint; sem match, CRIAM um produto novo (EAN sintético). Quando uma
 * oferta da loja já tinha sido fundida noutro produto (dedup-store-url,
 * dedup-audit, apply-cnp-merge), o integrador deixava de a reconhecer e criava
 * o produto outra vez em CADA corrida — que o dedup-store-url voltava a fundir.
 * Medido: farmacia365 512 criados por corrida (510 com o URL já em oferta da
 * loja), bairro 824 (810). Ciclo inútil e mais lento, e o produto mudava de
 * identidade a cada corrida (mau para o sync incremental da BD).
 *
 * Usar ANTES do ramo de criar: se o URL já é oferta da loja, o produto é esse.
 * A identidade produto↔oferta foi estabelecida quando a oferta nasceu (mesma
 * regra do urlRefreshPass em store-item-merge.js).
 */
function criarProdutoPorUrl(seed, storeSlug) {
  const porEan = new Map((seed.products || []).map(p => [p.ean, p]));
  const eanPorUrl = new Map();
  const sp = (seed.store_products || []).find(g => g.store_slug === storeSlug);
  for (const it of (sp && sp.items) || []) {
    if (it.url) eanPorUrl.set(it.url, it.ean);
    for (const v of it.variants || []) if (v.url && !eanPorUrl.has(v.url)) eanPorUrl.set(v.url, it.ean);
  }
  return function produtoPorUrl(url) {
    if (!url) return null;
    const ean = eanPorUrl.get(url);
    return ean ? (porEan.get(ean) || null) : null;
  };
}

module.exports = { criarProdutoPorUrl };
