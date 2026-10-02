/**
 * "Este produto do catálogo da loja JÁ EXISTE no seed?" — para o filtro de foco.
 * ============================================================
 * Vários integradores (atida, bairro, druni, farmacia365, farmaciapt,
 * sweetcare, wells) filtram o catálogo por categoria ANTES de procurar o
 * produto no seed. O filtro existe para não CRIAR produtos fora do foco
 * (maquilhagem, perfume, suplementos…) — mas, aplicado antes do match, também
 * impedia a loja de juntar o seu preço a um produto que JÁ está no site.
 *
 * Medido a 2026-10-02: a atida tinha 169 produtos com EAN igual ao de um
 * produto do site (ex.: Toleriane Dermallergo Noite, já em 35 lojas) deitados
 * fora só porque a categoria no catálogo dela vinha vazia; a farmacia365 59 e
 * a farmaciapt 47. Cada um é uma loja a menos na comparação.
 *
 * Regra nova: o filtro de foco continua a mandar na CRIAÇÃO de produtos; um
 * produto que bate com o seed pelas MESMAS regras do loop de match do
 * integrador (EAN válido para esse integrador, ou fingerprint exacto) passa
 * sempre. Como bate, o loop encontra-o e nunca chega ao ramo de criar — por
 * isso isto não cria produtos novos, só junta ofertas a produtos existentes.
 *
 * @param {object}   seed       o seed carregado (usa seed.products)
 * @param {function} eanValido  o isRealEan do próprio integrador — tem de ser o
 *                              mesmo que o loop usa, senão um EAN aceite aqui
 *                              podia não bater lá e cair no ramo de criar
 * @returns {function(object): boolean}
 */
const { productFingerprint } = require('./product-fingerprint');

function criarJaNoSeed(seed, eanValido) {
  const eans = new Set();
  const fps = new Set();
  for (const p of seed.products || []) {
    if (p.ean) eans.add(String(p.ean));
    const fp = productFingerprint(p);
    if (fp) fps.add(fp);
  }
  return function jaNoSeed(p) {
    if (!p) return false;
    const e = p.ean != null ? String(p.ean) : '';
    if (e && eanValido(e) && eans.has(e)) return true;
    const fp = productFingerprint(p);
    return !!(fp && fps.has(fp));
  };
}

module.exports = { criarJaNoSeed };
