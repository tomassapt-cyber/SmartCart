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
// 2026-10-02 — o que ainda chegava aos cartões (índice publicado):
//   · 88 entidades fora da tabela ("AV&Egrave;NE") → tabela de acentos completa;
//   · 188 com "�" (o scraper leu a página com o charset errado: "Av�ne",
//     "S�rum") → reparados pela palavra mais comum do próprio catálogo;
//   · 155 com "Preço Especial", "PROMO", "(Cópia)" colados ao nome;
//   · 537 com pontuação solta ("Gel , 20 mg");
//   · 1.043 TODOS EM MAIÚSCULAS ("BARRAL BABYPROTECT CREME BANHO") → forma
//     normal, mantendo siglas (SPF, AHA, ISDIN, SVR — lista explícita: as
//     marcas do seed vêm muitas vezes em maiúsculas, "URIAGE", e não servem)
//     e unidades em minúsculas (500ml).
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
  '&ordm;': 'º', '&ordf;': 'ª', '&deg;': '°', '&reg;': '®', '&trade;': '™', '&copy;': '©',
  '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”', '&laquo;': '«', '&raquo;': '»',
  '&middot;': '·', '&times;': '×', '&szlig;': 'ß', '&oelig;': 'œ', '&OElig;': 'Œ', '&aelig;': 'æ',
};
// qualquer letra acentuada nomeada (&Egrave; &uuml; &icirc; &aring;…) → letra + acento, composta
const ACENTO = { acute: '\u0301', grave: '\u0300', circ: '\u0302', tilde: '\u0303', uml: '\u0308', cedil: '\u0327', ring: '\u030A' };

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
    t = t.replace(/&([a-z])(acute|grave|circ|tilde|uml|cedil|ring);/gi, (_, l, a) => (l + ACENTO[a.toLowerCase()]).normalize('NFC'));
    if (t === antes) break;
  }
  return t;
}

// Nome de loja colado no FIM do nome (o scraper apanhou o título da página).
// Só no fim e precedido de traço — evita apanhar marcas com estas palavras.
const LOJA_NO_FIM = /\s[-–—]\s*(farm[áa]cia|parafarm[áa]cia|perfumes\s?club|perfumesclub|druni|notino|wells|primor|sweetcare|atida|mifarma|dermis|skin\.pt|cocooncenter|pharma[- ]?gdd)\b.*$/i;

// "Preço Especial", "PROMO", "(Cópia)"… colados ao nome (não dizem nada do produto)
const PRECO_ESPECIAL = /\s*[(\[]?\s*pre[çc]o especial\s*[)\]]?/gi;
const LIXO_NO_FIM = /\s*[-–(\[]?\s*(promo(?:[çc][ãa]o)?|c[óo]pia|copy|novo c[óo]digo)\s*[)\]]?\s*$/i;

function arrumarPontuacao(t) {
  return t.replace(/\s+([,;:!?)\]])/g, '$1').replace(/([(\[])\s+/g, '$1')
    .replace(/[\s,;:–-]+$/, '').replace(/^[\s,;:–-]+/, '');
}

// ── TUDO EM MAIÚSCULAS → forma normal ──────────────────────────────────────
const LIGACAO = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'sem', 'para', 'p', 'a', 'o', 'as', 'os',
  'ao', 'aos', 'por', 'no', 'na', 'nos', 'nas', 'en', 'el', 'la', 'le', 'les', 'et', 'y', 'of', 'and', 'the', 'with', 'for']);
// siglas curtas que ficam em maiúsculas (o resto das palavras curtas — GEL, PÓ, SOL — não)
const SIGLAS_CURTAS = new Set(['spf', 'fps', 'aha', 'bha', 'pha', 'uv', 'uva', 'uvb', 'ar', 'bb', 'cc', 'dd', 'hd', 'ph',
  'dna', 'cbd', 'led', 'sos', 'xl', 'xs', 'xxl', 'ii', 'iii', 'iv', 'ds', 'md', 'ha', 'egf', 'txa', 'ppd', 'nmf', 'pf',
  'ip', 'ac', 'bc', 'ss', 'cs', 'gk', 'ck', 'dkny', 'ysl', 'nyx', 'ogx', 'svr', 'acm', 'nyc', 'ghd', 'sk', 'mac',
  'isdin', 'rna', 'ldl', 'pdrn', 'q10', 'dha', 'epa', 'msm', 'nac', 'gaba']);
const UNIDADE = /^(\d+(?:[.,]\d+)?)(ml|g|gr|grs|kg|l|mg|cl|un|uds)$/i;
const maiuscula = w => w.charAt(0).toLocaleUpperCase('pt') + w.slice(1).toLocaleLowerCase('pt');
function palavraNormal(w, primeira) {
  const m = w.match(UNIDADE);
  if (m) return m[1] + m[2].toLowerCase();
  if (/\d/.test(w)) return w;                                  // SPF50+, H2O, B5, Q10
  if (/^(ml|g|gr|grs|kg|l|mg|cl)$/i.test(w)) return w.toLowerCase();   // "75 ML" → "75 ml"
  const letras = w.replace(/[^\p{L}]/gu, '');
  const baixa = letras.toLocaleLowerCase('pt');
  if (LIGACAO.has(baixa) && !primeira) return w.toLocaleLowerCase('pt');
  if (SIGLAS_CURTAS.has(baixa)) return w;                      // AHA, BHA, SPF, UV, BB, AR
  // maiúscula no início e depois de ' - & / ( . : "L'Oréal", "Anti-Idade", "Roger&Gallet"
  return w.toLocaleLowerCase('pt').replace(/(^|['’\-&/(.])(\p{L})/gu, (_, sep, l) => sep + l.toLocaleUpperCase('pt'));
}
function desgritar(t) {
  const letras = t.match(/\p{L}/gu) || [];
  if (letras.length < 8) return t;
  const altas = letras.filter(l => l !== l.toLocaleLowerCase('pt')).length;
  if (altas / letras.length < 0.8) return t;
  const gritadas = t.split(/\s+/).filter(w => { const l = w.replace(/[^\p{L}]/gu, ''); return l.length >= 4 && l === l.toLocaleUpperCase('pt'); });
  if (gritadas.length < 2) return t;                           // "AHA 5% BHA 2%" fica
  return t.split(/(\s+)/).map((w, i) => /^\s+$/.test(w) ? w : palavraNormal(w, i === 0)).join('');
}

/**
 * Limpa um nome para APRESENTAÇÃO (não tocar no seed em disco).
 * ⚠️ Só remove RETICÊNCIAS (3+ pontos ou "…") — nunca um ponto isolado: há
 * nomes legítimos que acabam em ponto por serem abreviaturas ("Effaclar A.I.",
 * "Multirepair H.A."), e uma primeira versão desta função estragava-os.
 * @param {object} [opts] { reparar: fn (palavras com "�") }
 */
function cleanName(nome, opts = {}) {
  let t = decodeEntities(nome);
  if (opts.reparar) t = opts.reparar(t);
  t = t.replace(LOJA_NO_FIM, '');
  t = t.replace(/\s*(\.{3,}|…)\s*$/u, '');   // só reticências, não pontos soltos
  t = t.replace(PRECO_ESPECIAL, ' ');
  for (let i = 0; i < 3 && LIXO_NO_FIM.test(t); i++) t = t.replace(LIXO_NO_FIM, '');
  t = arrumarPontuacao(t.replace(/\s{2,}/g, ' ').trim());
  t = desgritar(t);
  return t.replace(/\s{2,}/g, ' ').trim();
}

// ── "�" (charset errado no scraper) → a palavra mais comum do catálogo ─────
// "Av�ne" → procura palavras do catálogo com a mesma forma e UMA letra
// não-ASCII no lugar do "�" ("avène" 4.000×). Só troca se houver uma
// vencedora clara (≥ 3 ocorrências e ≥ 2× a segunda); "1�" (1º/1ª) fica.
function criarReparador(nomes) {
  const freq = new Map();
  for (const n of nomes) {
    for (const w of decodeEntities(n).toLocaleLowerCase('pt').match(/[\p{L}\dºª]+/gu) || []) freq.set(w, (freq.get(w) || 0) + 1);
  }
  const porTamanho = new Map();
  for (const [w, n] of freq) if (n >= 3 && /[^\x00-\x7f]/.test(w)) (porTamanho.get(w.length) || porTamanho.set(w.length, []).get(w.length)).push([w, n]);
  const cache = new Map();
  const corrigir = (palavra, onde, nome) => {
    const baixa = palavra.toLocaleLowerCase('pt');
    if (!cache.has(baixa)) {
      const re = new RegExp('^' + baixa.split('\uFFFD').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^\\x00-\\x7f]') + '$', 'u');
      const cands = (porTamanho.get(baixa.length) || []).filter(([w]) => re.test(w)).sort((a, b) => b[1] - a[1]);
      cache.set(baixa, cands.length && (cands.length === 1 || cands[0][1] >= 2 * cands[1][1]) ? cands[0][0] : null);
    }
    const certa = cache.get(baixa);
    if (!certa) return palavra;
    const letras = palavra.replace(/[^\p{L}]/gu, '');
    if (letras && letras === letras.toLocaleUpperCase('pt')) return certa.toLocaleUpperCase('pt');
    // "�leo": a 1.ª letra perdeu-se — maiúscula, a não ser depois de "de", "com"… ("Mistura de óleos")
    const anterior = nome.slice(0, onde).trim().split(/\s+/).pop() || '';
    const inicial = palavra.charAt(0) === '\uFFFD' ? !LIGACAO.has(anterior.toLocaleLowerCase('pt')) : palavra.charAt(0) === palavra.charAt(0).toLocaleUpperCase('pt');
    return inicial ? maiuscula(certa) : certa;
  };
  return nome => (String(nome).includes('\uFFFD') ? String(nome).replace(/[\p{L}\dºª\uFFFD]*\uFFFD[\p{L}\dºª\uFFFD]*/gu, corrigir) : nome);
}

/** Limpador com o contexto do catálogo (reparação de "�" pelas palavras do próprio catálogo). */
function criarLimpezaDeNomes(seed) {
  const opts = { reparar: criarReparador((seed.products || []).map(p => p.name || '')) };
  return nome => {
    const limpo = cleanName(nome, opts);
    return (limpo && limpo.length >= 3) ? limpo : String(nome || '');
  };
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
  const limpar = criarLimpezaDeNomes(seedJson);
  for (const p of seedJson.products) {
    const novo = limpar(p.name);
    if (novo && novo !== p.name) { p.name = novo; limpos++; }
  }
  return { limpos };
}

module.exports = { decodeEntities, cleanName, cleanNameSafe, applyNameCleanup, criarLimpezaDeNomes };
