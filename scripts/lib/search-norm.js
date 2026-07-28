// Normalização de texto para a PESQUISA (minúsculas, sem acentos).
//
// PORQUÊ (2026-07-28): o `ilike` do PostgREST não ignora acentos. Medido: quem
// escreve "champo" via 44 resultados em vez de 1.126; "mascara" 99 em vez de
// 1.646. Só em 8 termos comuns, ~6.000 resultados escondidos.
//
// A coluna products.search_norm (migration 009) guarda nome+marca já
// normalizados, e o cliente normaliza o que o utilizador escreve com ESTA
// MESMA função. É por isso que ela vive numa lib e não duplicada: se as duas
// normalizações divergirem, a pesquisa passa a falhar em silêncio.
//
// ⚠️ O app.html tem uma cópia desta função (não pode fazer require) — se
// mudares aqui, muda lá também. A função é curta e estável de propósito.

/** minúsculas + sem acentos (NFD e remoção dos diacríticos) */
function searchNorm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** o texto pesquisável de um produto: nome + marca, normalizados */
function productSearchNorm(p) {
  return searchNorm(`${p.name || ''} ${p.brand || ''}`);
}

module.exports = { searchNorm, productSearchNorm };
