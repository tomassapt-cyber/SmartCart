// Limpeza de NOMES de produto — lixo que vem dos scrapers e chega ao ecrã.
//
// PORQUÊ (2026-07-29): auditoria ao que está no ar encontrou nomes com lixo
// visível para o utilizador, no site E no /app:
//   · 1.028 nomes com entidades HTML por descodificar — "L&#39;Oréal",
//     "Roger&amp;Gallet", "Lift&amp;Repair". O utilizador lê os símbolos.
//   · 135 nomes com o nome da LOJA colado no fim ("Filorga Lift-Mask … -
//     Farmácia Barreiros") — pior ainda quando o cartão mostra esse produto
//     como estando noutra loja.
//   · 254 nomes truncados pelo scraper, a acabar em "…".
//
// NÃO-destrutivo e SÓ de apresentação: muta o seed EM MEMÓRIA. O
// data/seed-bundle.json mantém o nome original — que é a CHAVE do fingerprint
// de deduplicação entre lojas. Mudar o nome no seed partiria o matching.
//
// Usado pelo inject (site) e pelo push-catalog-to-db.js (BD/app), como os
// outros overlays partilhados.

// Entidades que aparecem mesmo no catálogo (+ numéricas).
const ENTIDADES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&hellip;': '…',
  '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
  '&agrave;': 'à', '&acirc;': 'â', '&ecirc;': 'ê', '&ocirc;': 'ô',
  '&atilde;': 'ã', '&otilde;': 'õ', '&ccedil;': 'ç',
  '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
  '&Atilde;': 'Ã', '&Otilde;': 'Õ', '&Ccedil;': 'Ç', '&Ocirc;': 'Ô', '&Ecirc;': 'Ê',
};

/**
 * Descodifica entidades HTML (nomeadas e numéricas).
 * ⚠️ REPETE até estabilizar: há 13 nomes no catálogo com codificação DUPLA
 * ("&amp;amp;" — o scraper escapou o que já vinha escapado). Uma só passagem
 * deixava "&amp;" visível ao utilizador. Limite de 3 voltas para nunca
 * entrar em ciclo com dados patológicos.
 */
function decodeEntities(s) {
  let t = String(s || '');
  for (let volta = 0; volta < 3; volta++) {
    const antes = t;
    // numéricas primeiro (&#211; &#x27;) — cobrem tudo o que a tabela não tem
    t = t.replace(/&#x([0-9a-f]{1,5});/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
    t = t.replace(/&#(\d{1,6});/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
    for (const [e, c] of Object.entries(ENTIDADES)) t = t.split(e).join(c);
    if (t === antes) break;
  }
  return t;
}

// Nome de loja colado no FIM do nome (o scraper apanhou o título da página).
// Só no fim e precedido de traço — evita apanhar marcas com estas palavras.
const LOJA_NO_FIM = /\s[-–—]\s*(farm[áa]cia|parafarm[áa]cia|perfumes\s?club|perfumesclub|druni|notino|wells|primor|sweetcare|atida|mifarma|dermis|skin\.pt|cocooncenter|pharma[- ]?gdd)\b.*$/i;

/**
 * Limpa um nome para APRESENTAÇÃO (não tocar no seed em disco).
 * ⚠️ Só remove RETICÊNCIAS (3+ pontos ou "…") — nunca um ponto isolado: há
 * nomes legítimos que acabam em ponto por serem abreviaturas ("Effaclar A.I.",
 * "Multirepair H.A."), e uma primeira versão desta função estragava-os.
 */
function cleanName(nome) {
  let t = decodeEntities(nome);
  t = t.replace(LOJA_NO_FIM, '');
  t = t.replace(/\s*(\.{3,}|…)\s*$/u, '');   // só reticências, não pontos soltos
  return t.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Versão SEGURA para uso em massa: se a limpeza deixar o nome vazio ou curto
 * demais para identificar o produto, devolve o original. (Medido: 77 nomes do
 * catálogo ficariam inutilizáveis sem esta guarda.)
 */
function cleanNameSafe(nome) {
  const limpo = cleanName(nome);
  return (limpo && limpo.length >= 3) ? limpo : String(nome || '');
}

/**
 * Aplica a limpeza aos produtos do seed EM MEMÓRIA.
 * @returns {{limpos:number}}
 */
function applyNameCleanup(seedJson) {
  let limpos = 0;
  for (const p of seedJson.products) {
    const novo = cleanNameSafe(p.name);
    if (novo && novo !== p.name) { p.name = novo; limpos++; }
  }
  return { limpos };
}

module.exports = { decodeEntities, cleanName, cleanNameSafe, applyNameCleanup };
