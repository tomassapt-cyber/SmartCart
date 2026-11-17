'use strict';
/**
 * Ofertas no tamanho da ficha (2026-11-17, auditoria aos produtos com poucas lojas)
 * ==========================================================================
 * Muitas lojas vendem o mesmo produto em vários tamanhos na mesma página, e a oferta
 * guarda os tamanhos todos (variants) com o preço de cada um. O preço «de topo» da
 * oferta é o do tamanho mais barato. Numa ficha cujo nome diz o tamanho (Uriage Hyséac
 * Gel 500 ml), isso punha o preço do frasco de 150 ml ao lado dos de 500 ml: 31 das
 * 55 ofertas, e o «mais barato» de 4,83 € era o de 150 ml (Pharma24).
 *
 * Para cada ficha com UM tamanho no nome (sem packs), e só se a maioria das ofertas
 * tiver esse tamanho (senão o nome é que pode estar errado):
 *   1. a oferta tem esse tamanho entre as variantes → o preço, o link e o stock da
 *      oferta passam a ser os desse tamanho (as variantes ficam todas, para o modal);
 *   2. a oferta só tem outros tamanhos → é outro produto: passa para a ficha desse
 *      tamanho se houver exatamente uma (mesma marca, nome igual tirando o tamanho,
 *      mesmas versões); se não houver, sai desta ficha.
 * Fichas sem tamanho no nome (fichas-família) ficam como estão: aí manda a regra do €/L.
 */
const { normalizeBrand } = require('./product-fingerprint');

const VOLUME_G = /(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/gi;
const PACK = /(\d\s*x\s*\d|\+|\bpack\b|\bcoffret\b|\bkit\b|\bconjunto\b|\bset\b|\bduo\b|\btrio\b|\bestojo\b|\blote\b)/i;
const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ml = (n, u) => { const x = parseFloat(String(n).replace(',', '.')); u = u.toLowerCase(); return (u === 'l' || u === 'kg') ? x * 1000 : x; };
const perto = (a, b) => a > 0 && b > 0 && Math.abs(a - b) / Math.max(a, b) <= 0.06;
/** O tamanho do nome, se houver exatamente um e não for um pack. */
function tamanhoDoNome(nome) {
  const t = semAcento(nome);
  if (PACK.test(t)) return null;
  const todos = [...t.matchAll(VOLUME_G)].map(m => ml(m[1], m[2]));
  const unicos = [...new Set(todos)];
  return unicos.length === 1 && unicos[0] >= 3 ? unicos[0] : null;
}
/** O tamanho que o endereço da página diz («…-150ml», «…_150-ml»). */
function tamanhoDoUrl(url) {
  const m = semAcento(url).match(/[-_/](\d{2,4})[-_]?(ml|gr|g)(?![a-z0-9])/);
  return m ? ml(m[1], m[2]) : null;
}
// os tamanhos que a oferta diz: os das variantes e o do endereço da página
const tamanhosDaOferta = it => {
  const s = (it.variants || []).filter(v => v.volume_ml > 0).map(v => v.volume_ml);
  const u = tamanhoDoUrl(it.url); if (u) s.push(u);
  return s;
};

function alinharTamanhoDaFicha(seedJson, registo = null) {
  const { versoes } = require('../aliases-sinteticos');   // tarde: evita o require circular
  const { canonicalName } = require('./product-fingerprint');
  const palavras = (nome, marca) => new Set(canonicalName(nome || '', marca).split('-').filter(x => x.length > 1 && !/^\d+$/.test(x)));
  const mesmas = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
  const porEan = new Map((seedJson.products || []).map(p => [String(p.ean), p]));
  const itensDe = new Map();
  for (const sp of seedJson.store_products) for (const it of sp.items) (itensDe.get(String(it.ean)) || itensDe.set(String(it.ean), []).get(String(it.ean))).push([sp, it]);
  // fichas com um tamanho no nome, por marca, para encontrar a ficha do outro tamanho
  const doTamanho = new Map();
  const tamFicha = new Map();
  for (const p of seedJson.products || []) {
    const s = tamanhoDoNome(p.name); if (!s) continue;
    tamFicha.set(String(p.ean), s);
    const b = normalizeBrand(p.brand || ''); if (!b) continue;
    (doTamanho.get(b) || doTamanho.set(b, []).get(b)).push(p);
  }
  const semTamanho = nome => palavras(String(nome || '').replace(VOLUME_G, ' '), '');
  const parecenca = (A, B) => { let c = 0; for (const x of A) if (B.has(x)) c++; return c / ((A.size + B.size - c) || 1); };
  function fichaDoTamanho(p, t) {
    const b = normalizeBrand(p.brand || ''); if (!b) return null;
    const A = semTamanho(p.name), va = versoes(p.name);
    const c = (doTamanho.get(b) || []).filter(q => q !== p && perto(tamFicha.get(String(q.ean)), t)
      && parecenca(A, semTamanho(q.name)) >= 0.75 && mesmas(versoes(q.name), va));
    return c.length === 1 ? c[0] : null;
  }

  let alinhadas = 0, movidas = 0, escondidas = 0, duvidosas = 0;
  const fora = new Set();          // itens que saem
  const mover = [];                // [sp, it, ficha nova, variante]
  for (const [ean, s] of tamFicha) {
    const itens = itensDe.get(ean); if (!itens || !itens.length) continue;
    const comTam = itens.filter(([, it]) => tamanhosDaOferta(it).length);
    if (!comTam.length) continue;
    const apoio = comTam.filter(([, it]) => tamanhosDaOferta(it).some(t => perto(t, s))).length;
    if (apoio / comTam.length < 0.5) { duvidosas++; continue; }   // a maioria diz outro tamanho: o nome pode estar errado
    const p = porEan.get(ean);
    for (const [sp, it] of comTam) {
      const vs = (it.variants || []).filter(v => v.volume_ml > 0);
      const certa = vs.find(v => perto(v.volume_ml, s));
      if (certa) {
        if (certa.price > 0 && (Math.abs(certa.price - it.price) >= 0.005 || (certa.url && certa.url !== it.url))) {
          it.price = certa.price;
          if ('previous_price' in certa) it.previous_price = certa.previous_price ?? null;
          if (certa.url) it.url = certa.url;
          if ('in_stock' in certa) it.in_stock = certa.in_stock !== false;
          alinhadas++; if (registo) registo.push(['alinhada', p.name, sp.store_slug, it.url, s]);
        }
        continue;
      }
      if (vs.length === 0 && !tamanhoDoUrl(it.url)) continue;
      // o endereço da página diz o tamanho da ficha: a variante é que está mal lida, a oferta fica
      if (perto(tamanhoDoUrl(it.url), s)) continue;
      const t = (vs[0] && vs[0].volume_ml) || tamanhoDoUrl(it.url);
      if (perto(t, s)) continue;
      const nova = fichaDoTamanho(p, t);
      if (nova && !sp.items.some(o => String(o.ean) === String(nova.ean))) mover.push([sp, it, nova, vs.find(v => perto(v.volume_ml, t))]);
      else { fora.add(it); if (registo) registo.push(['escondida', p.name, sp.store_slug, it.url, t]); }
    }
  }
  for (const [sp, it, nova, v] of mover) {
    if (sp.items.some(o => o !== it && String(o.ean) === String(nova.ean))) { fora.add(it); continue; }
    it.ean = nova.ean;
    if (v && v.price > 0) { it.price = v.price; if (v.url) it.url = v.url; }
    movidas++; if (registo) registo.push(['movida', nova.name, sp.store_slug, it.url, porEan.get(String(nova.ean)) && '']);
  }
  if (fora.size) for (const sp of seedJson.store_products) { const n = sp.items.length; sp.items = sp.items.filter(it => !fora.has(it)); escondidas += n - sp.items.length; }
  return { alinhadas, movidas, escondidas, duvidosas };
}

module.exports = { alinharTamanhoDaFicha, tamanhoDoNome, tamanhoDoUrl };
