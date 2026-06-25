'use strict';
/**
 * promo-fold — funde variantes PROMOCIONAIS de um produto no seu produto-base.
 * ============================================================================
 *
 * Um MESMO produto, quando listado por uma loja com uma promoção/oferta
 * associada, aparece no seed como um produto SEPARADO porque o nome traz o
 * marcador da promo:
 *
 *    "Eucerin pH5 Loção Hidratante"                 ← produto-base
 *    "Eucerin pH5 Loção Hidratante + Oferta 100ml"  ← MESMO produto, em promo
 *    "Rene Furterer Astera Fresh Champô 250ml Edição Limitada"
 *    "Isdin Lambdapil Champô 400ml −50% 2ª Unidade"
 *
 * Isto fragmenta o catálogo (cards duplicados) e esconde a promoção do
 * utilizador. Esta função identifica essas variantes, move as suas ofertas
 * para o produto-base com uma NOTA curta de promoção (mostrada no card), e
 * marca os packs multi-unidade para NÃO entrarem na comparação de preço
 * "desde X€" (o preço de um pack 2× distorceria o preço por unidade).
 *
 * É usada como OVERLAY no inject (não-destrutivo): só altera a cópia injectada
 * no HTML; o seed-bundle.json (fonte dos scrapers) fica intacto e o efeito
 * auto-reverte/re-aplica em cada rebuild.
 *
 * Crítico (integridade): NUNCA funde bundles reais (pack/kit/coffret de
 * produtos diferentes) nem cria comparações de preço falsas — packs entram só
 * como nota informativa, nunca como preço de referência.
 */

const { productFingerprint } = require('./product-fingerprint');

// Tem marcador de promoção/oferta no nome?
const PROMO = /\b(oferta|gr[aá]tis|brinde|presente|pre[cç]o especial|promo[cç][aã]o|promo|edi[cç][aã]o\s+(especial|limitada)|2[ªa]\s*unidade)\b|\+\s*\d+\s*(ml|%|unid|un\b)|\d+\s*x\s*\d|-\s*\d+\s*%/i;

// Bundle REAL de produtos diferentes (não é o mesmo produto — não fundir).
const BUNDLE = /\b(pack|kit|coffret|duo|trio|conjunto|estojo|set|coffrets)\b/i;

// Promo multi-unidade (preço de pack — não usar como preço de referência).
const MULTIUNIT = /(\d+)\s*x\s*\d|\d+\s*ml\s*x\s*(\d+)|2[ªa]\s*unidade|\+\s*\d+\s*unid/i;

// Remove a cauda promocional para obter o nome-base (que faz fingerprint igual
// ao do produto-base já existente).
function stripPromo(nm) {
  let n = ' ' + nm + ' ';
  n = n.replace(/\+\s*(oferta\s+)?\d+\s*ml\b/gi, ' ')         // + Oferta 100ml / +100ml
       .replace(/\+\s*\d+\s*%(\s*de\s*oferta)?/gi, ' ')        // + 25% de Oferta
       .replace(/\+\s*(presente|brinde|oferta)\b.*$/gi, ' ')   // + Presente ...
       .replace(/\b(com\s+)?oferta\b.*$/gi, ' ')
       .replace(/\b\d+\s*x\s*\d+\s*ml\b/gi, ' ')               // 2x400ml
       .replace(/\b\d+\s*ml\s*x\s*\d+\b/gi, ' ')               // 100mL x2
       .replace(/-?\s*\d+\s*%/gi, ' ')
       .replace(/\b2[ªa]\s*unidade\b/gi, ' ')
       .replace(/\bpre[cç]o especial\b|\bpromo[cç][aã]o\b|\bpromo\b|gr[aá]tis|brinde/gi, ' ')
       .replace(/\bedi[cç][aã]o\s+(especial|limitada)\b/gi, ' ');
  return n.replace(/\s+/g, ' ').trim();
}

// Classifica a promo → { note, pack }. note = etiqueta curta PT mostrada no card.
function classifyPromo(nm) {
  const n = nm;
  let m;
  if ((m = n.match(/\+\s*(?:oferta\s+)?(\d+)\s*ml\b/i))) return { note: `+${m[1]}ml grátis`, pack: false, gift: true };
  if ((m = n.match(/\+\s*(\d+)\s*%(?:\s*de\s*oferta)?/i))) return { note: `+${m[1]}% grátis`, pack: false, gift: true };
  if (/\b(gr[aá]tis|brinde)\b/i.test(n)) return { note: 'oferta incluída', pack: false, gift: true };
  if (/\b(presente|de oferta)\b/i.test(n)) return { note: 'com presente', pack: false, gift: true };
  if (/edi[cç][aã]o\s+(especial|limitada)/i.test(n)) return { note: 'edição limitada', pack: false, gift: false };
  if ((m = n.match(/2[ªa]\s*unidade/i))) {
    const d = n.match(/-?\s*(\d+)\s*%/);
    return { note: d ? `−${d[1]}% na 2ª unidade` : 'promo 2ª unidade', pack: true, gift: false };
  }
  if ((m = n.match(/(\d+)\s*x\s*\d+\s*ml/i)) || (m = n.match(/\d+\s*ml\s*x\s*(\d+)/i))) {
    return { note: `promo: leva ${m[1]}`, pack: true, gift: false };
  }
  return { note: 'em promoção', pack: false, gift: false };
}

/**
 * Funde as variantes promocionais no produto-base, in-place no objecto seed.
 * @param {object} seed  — { products, store_products, ... } (mutado in-place)
 * @returns {{folded:number, movedOffers:number, annotated:number, examples:string[]}}
 */
function foldPromoVariants(seed) {
  // Índice do produto-BASE (sem marcador) por fingerprint.
  const baseByFp = {};
  for (const p of seed.products) {
    if (PROMO.test(p.name || '')) continue;
    const f = productFingerprint(p);
    if (f && !baseByFp[f]) baseByFp[f] = p;
  }

  // Ofertas por ean (referência aos itens reais para mutar).
  const offersByEan = {};
  for (const sp of seed.store_products)
    for (const it of sp.items)
      (offersByEan[it.ean] = offersByEan[it.ean] || []).push({ slug: sp.store_slug, it });

  const removeEans = new Set();
  let folded = 0, movedOffers = 0, annotated = 0;
  const examples = [];

  for (const p of seed.products) {
    const nm = p.name || '';
    if (!PROMO.test(nm) || BUNDLE.test(nm)) continue;
    const base = stripPromo(nm);
    if (base.length < 4) continue;
    const fp = productFingerprint({ name: base, brand: p.brand });
    const target = baseByFp[fp];
    if (!target || target.ean === p.ean) continue;

    const { note, pack } = classifyPromo(nm);
    const baseOffers = offersByEan[target.ean] || [];
    const baseStores = new Set(baseOffers.map(x => x.slug));

    for (const { slug, it } of (offersByEan[p.ean] || [])) {
      if (baseStores.has(slug)) {
        // A loja já lista o produto-base: anota a promo na oferta existente
        // (só para ofertas-presente/decoração; packs não anotam para não
        // sugerir um preço que não é o do base). Sem duplicar ofertas.
        if (!pack) {
          const ex = baseOffers.find(x => x.slug === slug);
          if (ex && !ex.it.promo_note) { ex.it.promo_note = note; annotated++; }
        }
        continue;
      }
      // Move a oferta para o produto-base, com a nota da promo.
      it.ean = target.ean;
      it.promo_note = note;
      if (pack) it.promo_pack = true;
      baseStores.add(slug);
      movedOffers++;
    }

    removeEans.add(p.ean);
    folded++;
    if (examples.length < 12) examples.push(`${nm.slice(0, 40)}  →  ${target.name.slice(0, 32)}  [${note}]`);
  }

  if (removeEans.size) {
    seed.products = seed.products.filter(p => !removeEans.has(p.ean));
    // Remove quaisquer itens que ficaram com o ean da variante (lojas que já
    // tinham o base — a oferta duplicada/pack não foi movida).
    for (const sp of seed.store_products)
      sp.items = sp.items.filter(it => !removeEans.has(it.ean));
  }

  return { folded, movedOffers, annotated, examples };
}

module.exports = { foldPromoVariants, stripPromo, classifyPromo, PROMO, BUNDLE, MULTIUNIT };
