/**
 * Lojas sem código de barras: juntar pelo nome quando o PREÇO confirma
 * ============================================================
 * PORQUÊ (auditoria 2026-10-02): a Wells e a SweetCare não publicam EAN, por
 * isso só se juntam a um produto do site pelo fingerprint (marca + nome
 * canónico exato). Quando o nome delas é diferente ("Aminexil Clinical REGEN
 * Booster Hair Serum" vs "Dercos Aminexil Clinical Regen Booster Sérum 90mL"),
 * o integrador cria um produto novo que só ela vende — e a comparação perde-se.
 * Medido: 4.992 produtos só da Wells e 6.411 só da SweetCare. A maior parte é
 * mesmo exclusiva (marcas próprias, Beauty List, puroBio…) ou tem nomes
 * diferentes demais para juntar sem risco; com as regras abaixo juntam-se ~60.
 *
 * REGRAS (todas obrigatórias — um erro aqui mostra o preço de outro produto):
 *   • o produto de origem só tem ofertas DESTA loja; o destino tem ≥1 oferta
 *     em stock de OUTRA loja e nenhuma desta;
 *   • mesma marca canónica; Jaccard dos nomes > LIMIAR e ≥1 palavra distintiva
 *     (>4 letras) em comum; sem segundo candidato a menos de 0,1 (ambíguo);
 *   • paridade de recarga/pack/kit/coffret/mini… e nenhum dos dois com tom/cor;
 *   • TAMANHO + PREÇO: com volume (no nome ou nas variantes) tem de haver o
 *     mesmo volume no destino e o preço desse volume a 0,7–1,3× a mediana das
 *     outras lojas; sem volume (Wells põe-no fora do nome), o destino tem de
 *     ter um só tamanho e o preço tem de bater na mesma margem — o preço é o
 *     que distingue 50 ml de 200 ml.
 *
 * A oferta muda de produto (rekey do EAN do item) e o produto de origem sai.
 * Não volta a nascer: o integrador reconhece o produto pelo URL da oferta
 * (scripts/lib/produto-por-url.js).
 */
const F = require('./product-fingerprint');

const LIMIAR = 0.75;
const PARIDADE = /\b(recarga|refill|recharge|coffret|pack|kit|duo|trio|conjunto|set|mini|travel|viagem|amostra|tester|edicao|limitada|limited|xxl|maxi)\b/i;
const TOM = /\b(tom|tone|shade|cor|color|colour|nude|rose|beige|ivory|sand|n\.?\s?\d{1,3}|#\d+)\b/i;
const semAcentos = x => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const mediana = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const precoBate = r => r >= 0.7 && r <= 1.3;

function juntarSemCodigo(seed, lojas = ['wells', 'sweetcare']) {
  const ofertas = new Map();                 // ean → [[loja, item]]  (todas, com ou sem stock)
  for (const sp of seed.store_products || []) {
    for (const it of sp.items || []) (ofertas.get(it.ean) || ofertas.set(it.ean, []).get(it.ean)).push([sp.store_slug, it]);
  }
  const emStock = it => it.in_stock !== false && it.price > 0;
  const tokens = new Map();
  const tok = p => tokens.get(p.ean) || tokens.set(p.ean, F.nameTokenSet(p.name, p.brand)).get(p.ean);

  // preços das OUTRAS lojas por volume (ml arredondado); sem volume → chave 0
  function precosPorVolume(p, loja) {
    const m = new Map();
    const vNome = F.extractVolumeMl(p.name);
    for (const [st, it] of ofertas.get(p.ean) || []) {
      if (st === loja || !emStock(it)) continue;
      const vs = (it.variants || []).filter(v => v.volume_ml && v.price > 0 && v.in_stock !== false);
      const pares = vs.length ? vs.map(v => [Math.round(v.volume_ml), v.price]) : [[vNome ? Math.round(vNome) : 0, it.price]];
      for (const [v, pr] of pares) (m.get(v) || m.set(v, []).get(v)).push(pr);
    }
    return m;
  }

  const fusoes = [];                         // [origem, destino, loja]
  const porLoja = {};
  // cada produto entra numa junção só: um destino que já recebeu (ou uma origem
  // que já saiu) fica de fora — senão o "só Wells" ⇄ "só SweetCare" trocavam-se
  // e desapareciam os dois, e dois itens da mesma loja caíam no mesmo produto
  const envolvidos = new Set();
  for (const loja of lojas) {
    const porMarca = new Map();
    for (const p of seed.products) {
      const b = F.normalizeBrand(p.brand);
      const o = ofertas.get(p.ean);
      if (!b || !o || o.some(([st]) => st === loja) || !o.some(([st, it]) => st !== loja && emStock(it))) continue;
      (porMarca.get(b) || porMarca.set(b, []).get(b)).push(p);
    }
    for (const p of seed.products) {
      const o = ofertas.get(p.ean);
      if (!o || o.length !== 1 || o[0][0] !== loja || !emStock(o[0][1])) continue;
      const it = o[0][1];
      if (envolvidos.has(p.ean)) continue;
      const lista = porMarca.get(F.normalizeBrand(p.brand));
      if (!lista) continue;
      const ct = F.nameTokenSet(p.name, p.brand);
      if (ct.size < 2) continue;
      let melhor = null, ms = LIMIAR, segundo = 0;
      for (const q of lista) {
        if (envolvidos.has(q.ean)) continue;
        const qt = tok(q);
        let distintiva = false;
        for (const t of ct) if (t.length > 4 && qt.has(t) && !/^spf\d*$/.test(t)) { distintiva = true; break; }
        if (!distintiva) continue;
        const sc = F.jaccard(ct, qt);
        if (sc > ms) { segundo = ms; ms = sc; melhor = q; } else if (sc > segundo) segundo = sc;
      }
      if (!melhor || (segundo >= LIMIAR && ms - segundo < 0.1)) continue;
      const a = semAcentos(p.name), b = semAcentos(melhor.name);
      if (PARIDADE.test(a) !== PARIDADE.test(b) || TOM.test(a) || TOM.test(b)) continue;

      const pv = precosPorVolume(melhor, loja);
      const variantes = (it.variants || []).filter(v => v.volume_ml && v.price > 0);
      const vNome = F.extractVolumeMl(p.name);
      let ok;
      if (variantes.length > 1 || (variantes.length === 1 && !vNome)) {
        const comuns = variantes.filter(v => pv.has(Math.round(v.volume_ml)));
        ok = comuns.length > 0 && comuns.every(v => precoBate(v.price / mediana(pv.get(Math.round(v.volume_ml)))));
      } else if (vNome) {
        const v = [...pv.keys()].find(k => k && Math.abs(k - vNome) / Math.max(k, vNome) <= 0.06);
        ok = v != null && precoBate(it.price / mediana(pv.get(v)));
      } else {
        ok = pv.size === 1 && precoBate(it.price / mediana([...pv.values()][0]));
      }
      if (!ok) continue;
      fusoes.push([p, melhor, loja]);
      envolvidos.add(p.ean); envolvidos.add(melhor.ean);
      porLoja[loja] = (porLoja[loja] || 0) + 1;
    }
  }

  if (fusoes.length) {
    const remap = new Map(fusoes.map(([o, d]) => [o.ean, d]));
    for (const sp of seed.store_products) {
      for (const it of sp.items) {
        const d = remap.get(it.ean);
        if (d) it.ean = d.ean;
      }
    }
    for (const [o, d] of fusoes) if (!d.image_url && o.image_url) d.image_url = o.image_url;
    seed.products = seed.products.filter(p => !remap.has(p.ean));
  }
  return { total: fusoes.length, porLoja, fusoes };
}

module.exports = { juntarSemCodigo };
