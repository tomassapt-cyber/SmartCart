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
const fs = require('fs');
const path = require('path');

// Lojas atualizadas a partir do PC (data/lojas-so-pc.json). Decisão do Tomás
// a 2026-10-14: NUNCA saem do site por idade — é só correr o refresh no PC, e
// o freshness-monitor avisa-o quando passam dos 7 dias. Sem o ficheiro, ficam
// sujeitas ao tecto como as outras; um ficheiro estragado rebenta o build.
function lojasSoPc() {
  const f = path.join(__dirname, '..', '..', 'data', 'lojas-so-pc.json');
  if (!fs.existsSync(f)) return new Set();
  return new Set(Object.keys(JSON.parse(fs.readFileSync(f, 'utf8')).lojas || {}));
}

/**
 * Esconde ofertas que apodreceram.
 * Regra RELATIVA: oferta >=7 dias mais velha que a mais fresca DA MESMA loja.
 * Regra ABSOLUTA: >14 dias (o ponto cego da relativa — uma loja parada por
 * inteiro não tem nada mais fresco com que comparar, e nada seria escondido;
 * medidas 2.964 ofertas assim, todas de 4 lojas paradas). As lojas SÓ-PC
 * (data/lojas-so-pc.json) ficam FORA do tecto absoluto desde 2026-10-14; a
 * relativa continua a valer para elas (oferta que a loja deixou de ter).
 * `agora` só muda para recuperar dias passados (record-price-history --as-of).
 */
function dropRottenOffers(seedJson, agora = Date.now()) {
  const DAY = 864e5, MAX_LAG_DAYS = 7, MAX_ABS_DAYS = 14;
  const soPc = lojasSoPc();
  let mantidasPc = 0; const perStorePc = [];
  const ageOf = (it) => {
    let t = +new Date(it.verified_at || 0);
    for (const v of (it.variants || [])) { const tv = +new Date(v.verified_at || 0); if (tv > t) t = tv; }
    return t;
  };
  const AGORA = agora;
  let hidden = 0, hiddenAbs = 0; const perStore = [], perStoreAbs = [];
  for (const sp of seedJson.store_products) {
    let freshest = 0;
    for (const it of sp.items) { const t = ageOf(it); if (t > freshest) freshest = t; }
    if (!freshest) continue;
    const before = sp.items.length;
    let absLoja = 0, pcLoja = 0;
    const doPc = soPc.has(sp.store_slug);
    sp.items = sp.items.filter(it => {
      const t = ageOf(it);
      if (!t) return true;
      if ((freshest - t) > MAX_LAG_DAYS * DAY) return false;             // relativo à loja
      if ((AGORA - t) > MAX_ABS_DAYS * DAY) {                            // tecto absoluto
        if (doPc) { pcLoja++; return true; }                             // …menos lojas do PC
        absLoja++; return false;
      }
      return true;
    });
    const n = before - sp.items.length;
    if (n) { hidden += n; perStore.push(`${sp.store_slug}:${n}`); }
    if (absLoja) { hiddenAbs += absLoja; perStoreAbs.push(`${sp.store_slug}:${absLoja}`); }
    if (pcLoja) { mantidasPc += pcLoja; perStorePc.push(`${sp.store_slug}:${pcLoja}`); }
  }
  return { hidden, hiddenAbs, perStore, perStoreAbs, mantidasPc, perStorePc, MAX_LAG_DAYS, MAX_ABS_DAYS };
}

/**
 * Esconde produtos que não fazem sentido publicar.
 * Esconde se: não é cosmética · órfão (sem oferta) · esgotado (todas
 * out-of-stock) · fora-de-site (todas as ofertas stale >14d) — este último só
 * para os NÃO-comparáveis: um produto com >=2 lojas com preço e em stock
 * mantém-se visível mesmo que stale. Ofertas de lojas do PC
 * (data/lojas-so-pc.json) nunca contam como stale (2026-10-14).
 * @param {function} isNonCosmetic  injectada para a lib não depender do
 *        product-fingerprint (evita ciclos e mantém-na testável).
 */
function applyVisibilityFilter(seedJson, isNonCosmetic) {
  const STALE_DAYS = 14;
  const soPc = lojasSoPc();
  const offersByEan = {};
  const ofertaPc = new Set();   // ofertas de lojas do PC: nunca contam como «fora-de-site»
  for (const sp of seedJson.store_products)
    for (const it of sp.items) {
      (offersByEan[it.ean] ||= []).push(it);
      if (soPc.has(sp.store_slug)) ofertaPc.add(it);
    }

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
    if (!comparable(p.ean) && offs.every(o => !ofertaPc.has(o) && ageDays(o) > STALE_DAYS)) continue;  // 3. fora-de-site
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

module.exports = { dropRottenOffers, applyVisibilityFilter, lojasSoPc };
