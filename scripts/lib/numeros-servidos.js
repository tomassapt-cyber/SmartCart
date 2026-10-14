// Números do catálogo escritos no HTML SERVIDO (2026-10-14).
//
// O demo.html traz valores de exemplo nos contadores ("17" lojas, "46 / 23+ /
// −38%" no topo). O JavaScript corrige-os depois de arrancar, mas o HTML que o
// Google, as pré-visualizações das partilhas e quem não corre JS lêem dizia
// "Comparamos 17 lojas" (pendência 8 do registo comum). Regra do projeto: um
// número que muda com o catálogo não fica escrito à mão — sai do seed no build.
//
// Escreve exatamente o que o primeiro passo do cliente escreve a partir de
// hp.stats (mesmos ids, mesmo formato), para não haver salto visível.

const IDS_LOJAS = [
  'announce-stores', 'tagline-stores', 'hero-stat-stores', 'news-sub-stores',
  'news-stat-stores', 'footer-tag-stores', 'footer-mini-stores',
];

/** troca o texto do elemento com este id (só elementos sem filhos) */
function trocarTexto(html, id, valor) {
  let n = 0;
  const re = new RegExp('(\\sid="' + id + '"[^>]*>)[^<]*(?=<)', 'g');
  const out = html.replace(re, (m, abertura) => { n++; return abertura + valor; });
  return { html: out, n };
}

/**
 * @param {string} html   HTML gerado a partir do template
 * @param {{stores?:number, products?:number, avg_savings_pct?:number|null}} stats
 * @returns {{html:string, trocas:number}}
 */
function escreverNumerosNoHtml(html, stats) {
  const s = stats || {};
  const pt = n => Number(n).toLocaleString('pt-PT');
  const valores = [];
  if (s.stores > 0) for (const id of IDS_LOJAS) valores.push([id, String(s.stores)]);
  if (s.products > 0) {
    valores.push(['hero-stat-products', s.products + '+']);
    valores.push(['footer-mini-products', pt(s.products)]);
    valores.push(['news-stat-products', pt(s.products)]);
  }
  if (s.avg_savings_pct > 0) valores.push(['hero-stat-savings', '−' + s.avg_savings_pct + '%']);
  let trocas = 0;
  for (const [id, v] of valores) {
    const r = trocarTexto(html, id, v);
    html = r.html; trocas += r.n;
  }
  return { html, trocas };
}

/** "em 70 lojas portuguesas" no manifest → número do catálogo */
function escreverNumeroNoManifest(texto, nLojas) {
  if (!(nLojas > 0)) return texto;
  return texto.replace(/(\bem )\d+( lojas\b)/g, '$1' + nLojas + '$2');
}

module.exports = { escreverNumerosNoHtml, escreverNumeroNoManifest, IDS_LOJAS };
