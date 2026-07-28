// Ofertas PODRES + filtro de VISIBILIDADE — o que decide o que é publicável.
//
// PORQUÊ ESTA LIB (2026-07-28): esta lógica vivia inline no
// scripts/inject-seed-into-demo.js, ou seja só o SITE a aplicava. O
// scripts/push-catalog-to-db.js não, por isso a BD — e com ela o app.html —
// mostrava produtos e ofertas que o site esconde de propósito. Medido pelo
// scripts/audit-db-vs-render.js: 6.485 produtos e ~13.900 ofertas a mais.
// Mesmo padrão do scripts/lib/verified-shipping.js: uma definição, dois
// consumidores. NÃO-destrutivo — muta o seed EM MEMÓRIA; o
// data/seed-bundle.json fica intacto e tudo se auto-corrige no próximo build
// (produto volta a stock / é re-verificado → reaparece sozinho).
//
// A lógica é a que estava no inject, movida SEM alterações — a prova é o
// index.html sair com hash byte-idêntico.

/**
 * Esconde ofertas que apodreceram.
 * Regra RELATIVA: oferta >=7 dias mais velha que a mais fresca DA MESMA loja.
 * Regra ABSOLUTA: >14 dias (o ponto cego da relativa — uma loja parada por
 * inteiro não tem nada mais fresco com que comparar, e nada seria escondido;
 * medidas 2.964 ofertas assim, todas de 4 lojas paradas). 14d é folgado de
 * propósito: as lojas SÓ-PC refrescam à mão.
 */
function dropRottenOffers(seedJson) {
  const DAY = 864e5, MAX_LAG_DAYS = 7, MAX_ABS_DAYS = 14;
  const ageOf = (it) => {
    let t = +new Date(it.verified_at || 0);
    for (const v of (it.variants || [])) { const tv = +new Date(v.verified_at || 0); if (tv > t) t = tv; }
    return t;
  };
  const AGORA = Date.now();
  let hidden = 0, hiddenAbs = 0; const perStore = [], perStoreAbs = [];
  for (const sp of seedJson.store_products) {
    let freshest = 0;
    for (const it of sp.items) { const t = ageOf(it); if (t > freshest) freshest = t; }
    if (!freshest) continue;
    const before = sp.items.length;
    let absLoja = 0;
    sp.items = sp.items.filter(it => {
      const t = ageOf(it);
      if (!t) return true;
      if ((freshest - t) > MAX_LAG_DAYS * DAY) return false;             // relativo à loja
      if ((AGORA - t) > MAX_ABS_DAYS * DAY) { absLoja++; return false; } // tecto absoluto
      return true;
    });
    const n = before - sp.items.length;
    if (n) { hidden += n; perStore.push(`${sp.store_slug}:${n}`); }
    if (absLoja) { hiddenAbs += absLoja; perStoreAbs.push(`${sp.store_slug}:${absLoja}`); }
  }
  return { hidden, hiddenAbs, perStore, perStoreAbs, MAX_LAG_DAYS, MAX_ABS_DAYS };
}

/**
 * Esconde produtos que não fazem sentido publicar.
 * Esconde se: não é cosmética · órfão (sem oferta) · esgotado (todas
 * out-of-stock) · fora-de-site (todas as ofertas stale >14d) — este último só
 * para os NÃO-comparáveis: um produto com >=2 lojas com preço e em stock
 * mantém-se visível mesmo que stale.
 * @param {function} isNonCosmetic  injectada para a lib não depender do
 *        product-fingerprint (evita ciclos e mantém-na testável).
 */
function applyVisibilityFilter(seedJson, isNonCosmetic) {
  const STALE_DAYS = 14;
  const offersByEan = {};
  for (const sp of seedJson.store_products)
    for (const it of sp.items) (offersByEan[it.ean] ||= []).push(it);

  // "Agora" robusto = verified_at mais recente do seed (evita marcar tudo
  // stale se o relógio do CI divergir do horário real).
  let maxTs = Date.now();
  for (const offs of Object.values(offersByEan))
    for (const o of offs) { const t = +new Date(o.verified_at || 0); if (t > maxTs) maxTs = t; }
  const ageDays = (o) => o.verified_at ? (maxTs - new Date(o.verified_at)) / 864e5 : Infinity;

  // Comparabilidade: nº de lojas distintas com preço (>=2 = comparável).
  const storesWithPrice = {};
  for (const sp of seedJson.store_products)
    for (const it of sp.items)
      if (it.price > 0) (storesWithPrice[it.ean] ||= new Set()).add(sp.store_slug);
  const comparable = (ean) => (storesWithPrice[ean] ? storesWithPrice[ean].size : 0) >= 2;

  const visibleEans = new Set();
  for (const p of seedJson.products) {
    const offs = offersByEan[p.ean] || [];
    if (isNonCosmetic(p.name)) continue;                      // 0. não é cosmética
    if (offs.length === 0) continue;                          // 1. órfão
    if (offs.every(o => o.in_stock === false)) continue;      // 2. esgotado → SEMPRE esconde
    if (!comparable(p.ean) && offs.every(o => ageDays(o) > STALE_DAYS)) continue;  // 3. fora-de-site
    visibleEans.add(p.ean);
  }

  const totalProducts = seedJson.products.length;
  const totalOffers = seedJson.store_products.reduce((s, sp) => s + sp.items.length, 0);

  seedJson.products = seedJson.products.filter(p => visibleEans.has(p.ean));
  for (const sp of seedJson.store_products)
    sp.items = sp.items.filter(it => visibleEans.has(it.ean));

  return {
    hidden: totalProducts - seedJson.products.length,
    visiveis: seedJson.products.length,
    hiddenOffers: totalOffers - seedJson.store_products.reduce((s, sp) => s + sp.items.length, 0),
  };
}

module.exports = { dropRottenOffers, applyVisibilityFilter };
