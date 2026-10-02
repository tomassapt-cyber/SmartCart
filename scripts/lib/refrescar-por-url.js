/**
 * Refrescar pelo URL as ofertas que o catálogo fresco da loja ainda tem
 * ============================================================
 * PORQUÊ (auditoria 2026-10-02): ~2.300 ofertas de produtos que a loja AINDA
 * vende (o URL está no catálogo recolhido hoje, em stock e com preço) ficavam
 * paradas >7 dias e o site escondia-as por "podres". Causa: o catálogo atual
 * não traz EAN para essa ficha (farmaciavirtual 603, caretobeauty 557,
 * atuafarmacia 211, unifarma 165, hiperfarma 102…) e os integradores, que casam
 * por EAN/fingerprint, deixavam de a reconhecer. Só 2 integradores usavam o
 * urlRefreshPass.
 *
 * A identidade oferta↔produto ficou estabelecida quando a oferta nasceu; o
 * scrape fresco do MESMO URL é a mesma oferta. Refresca-se preço/stock/variantes
 * e verified_at (= a data em que o recolhedor viu a ficha), via upsertStoreItem.
 *
 * NUNCA quando o catálogo traz OUTRO EAN para esse URL (página com vários
 * tamanhos, ou a loja trocou o produto): aí a cascata normal do integrador é
 * que decide.
 *
 * Guardas por loja (as mesmas do detetor de fantasmas): catálogo completo
 * (in_progress !== true), recente (≤ 4 dias) e com ≥ 30 produtos.
 */
const fs = require('fs');
const path = require('path');
const { upsertStoreItem, isBlockedOffer } = require('./store-item-merge');

const FICHEIRO = { 'loja-farmacia': 'lojafarmacia', 'pharma-gdd': 'pharmagdd' };
const core = e => String(e || '').replace(/^0+/, '');
const eanValido = e => /^\d{8,14}$/.test(String(e || ''));
const normUrl = u => String(u || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');

function refrescarOfertasPorUrl(seed, opts = {}) {
  const dir = opts.catalogDir || path.join(__dirname, '..', '..', 'data', 'catalog');
  const maxDias = opts.maxDias != null ? opts.maxDias : 4;
  const agora = opts.agora || Date.now();
  let total = 0; const porLoja = {};
  for (const sp of seed.store_products || []) {
    const f = path.join(dir, `${FICHEIRO[sp.store_slug] || sp.store_slug}-full.json`);
    if (!fs.existsSync(f)) continue;
    let cat; try { cat = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    const quando = cat.scraped_at || null;
    if (!quando || cat.in_progress === true || !Array.isArray(cat.products) || cat.products.length < 30) continue;
    if ((agora - new Date(quando).getTime()) / 864e5 > maxDias) continue;

    const itemPorUrl = new Map();
    for (const it of sp.items) if (it.url) itemPorUrl.set(normUrl(it.url), it);
    const itemByEan = {}; for (const it of sp.items) itemByEan[it.ean] = it;
    const estado = { storeSp: sp, itemByEan };
    let n = 0;
    for (const ep of cat.products) {
      if (!ep || !ep.url || !(ep.price > 0)) continue;
      const it = itemPorUrl.get(normUrl(ep.url));
      if (!it) continue;
      if (eanValido(ep.ean) && core(ep.ean) !== core(it.ean)) continue;      // outro EAN → não é connosco
      const visto = ep.scraped_at || quando;
      // só as PRESAS: >2 dias atrás do que o recolhedor viu. As outras estão em
      // dia (diferem minutos do carimbo do integrador) — mexer-lhes era ruído no
      // git e na BD em cada corrida, sem ganho nenhum.
      if (it.verified_at && (new Date(visto) - new Date(it.verified_at)) / 864e5 <= 2) continue;
      if (isBlockedOffer(sp.store_slug, it.ean)) continue;
      const r = upsertStoreItem(estado, it.ean, ep, visto);
      if (r.action === 'merged') n++;
    }
    if (n) { porLoja[sp.store_slug] = n; total += n; }
  }
  return { total, porLoja };
}

module.exports = { refrescarOfertasPorUrl };
