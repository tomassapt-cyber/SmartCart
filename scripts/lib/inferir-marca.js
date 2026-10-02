/**
 * Marca em falta → deduzida do código da loja ou do início do nome
 * ============================================================
 * PORQUÊ (auditoria 2026-10-02): 2.012 produtos visíveis não têm marca. Sem
 * marca o productFingerprint dá null, e o dedup-audit nunca os junta ao mesmo
 * produto COM marca. Medido: 426 eram duplicados — "Sensibio Defensive Sérum"
 * sem marca (1 loja, sweetcare) ao lado do da Bioderma (46 lojas); A-Derma
 * Dermalibour+ 50 mL sem marca (byfarma) ao lado do de 21 lojas. Vinham
 * sobretudo da bemecare, camelo, vidamais, dermis e sweetcare, que nem sempre
 * trazem a marca no catálogo.
 *
 * A marca está quase sempre lá, só que noutro sítio:
 *   • no código sintético da loja:  sweetcare-bioderma-sensibio-defensive-…
 *   • no início do nome:            "A-Derma Dermalibour+ Creme Barreira 50 mL"
 *
 * REGRAS (conservadoras — uma marca errada junta produtos diferentes):
 *   • só marcas JÁ conhecidas no seed, com ≥ MIN_PRODUTOS produtos com essa
 *     marca, e cujo nome normalizado tem ≥ 4 caracteres (evita "be", "ole"…);
 *   • a marca tem de estar no INÍCIO (do código sem o prefixo da loja, ou do
 *     nome), seguida de separador — nunca a meio do texto;
 *   • a mais comprida ganha ("nuxe-men" antes de "nuxe");
 *   • o nome mostrado é a grafia mais comum dessa marca no seed.
 */
const { normalizeBrand } = require('./product-fingerprint');

const MIN_PRODUTOS = 3;

const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&[a-z#0-9]+;/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * @param {object} seed  usa seed.products (marcas conhecidas) e seed.stores (prefixos dos códigos)
 * @returns {function(object): (string|null)}  marca deduzida (grafia do seed) ou null
 */
function criarInferidorDeMarca(seed) {
  const contagem = new Map();     // marca normalizada → { n, grafias: Map<grafia, n> }
  for (const p of seed.products || []) {
    const b = normalizeBrand(p.brand);
    if (!b) continue;
    const e = contagem.get(b) || { n: 0, grafias: new Map() };
    e.n++;
    e.grafias.set(p.brand, (e.grafias.get(p.brand) || 0) + 1);
    contagem.set(b, e);
  }
  const marcas = [];              // { chave: slug para comparar, grafia }
  for (const [b, e] of contagem) {
    const chave = slug(b);
    if (e.n < MIN_PRODUTOS || chave.replace(/-/g, '').length < 4) continue;
    const grafia = [...e.grafias].sort((x, y) => y[1] - x[1])[0][0];
    marcas.push({ chave, grafia });
  }
  marcas.sort((a, b) => b.chave.length - a.chave.length);

  // prefixos dos códigos sintéticos: "<loja>-…" (inclui lojas com hífen, ex. bairro-saude)
  const lojas = (seed.stores || []).map(s => s.slug).filter(Boolean).sort((a, b) => b.length - a.length);
  const semPrefixoDeLoja = ean => {
    const e = String(ean || '');
    if (/^\d+$/.test(e)) return '';
    for (const l of lojas) if (e.startsWith(l + '-')) return e.slice(l.length + 1);
    return e.replace(/^[a-z0-9]+-/, '');
  };
  const comeca = (texto, chave) => texto === chave || texto.startsWith(chave + '-');

  return function inferirMarca(p) {
    if (!p || normalizeBrand(p.brand)) return null;   // já tem marca
    const textos = [slug(semPrefixoDeLoja(p.ean)), slug(p.name)].filter(Boolean);
    for (const m of marcas) {
      if (textos.some(t => comeca(t, m.chave))) return m.grafia;
    }
    return null;
  };
}

module.exports = { criarInferidorDeMarca };
