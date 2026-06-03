'use strict';
/**
 * clean-description — limpeza extractiva e determinística de descrições raw.
 * ===========================================================================
 * Pega numa descrição scraped (que pode ter HTML, entidades, espaços a mais
 * e ruído de marketing) e devolve um texto curto, limpo e neutro adequado a
 * mostrar/indexar. NÃO usa LLM — é puramente determinístico e idempotente.
 *
 *   cleanDescription(raw, { maxLen=280, brand, name }) -> string|null
 *
 * Devolve null se, após limpeza, sobrar texto demasiado curto (<20 chars).
 */

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#34;': '"',
  '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&ordf;': 'ª', '&ordm;': 'º',
  '&deg;': '°', '&eacute;': 'é', '&aacute;': 'á', '&atilde;': 'ã',
  '&ccedil;': 'ç', '&oacute;': 'ó', '&otilde;': 'õ', '&iacute;': 'í',
  '&uacute;': 'ú', '&acirc;': 'â', '&ecirc;': 'ê', '&ocirc;': 'ô',
  '&hellip;': '…', '&mdash;': '—', '&ndash;': '–', '&reg;': '®', '&trade;': '™',
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&[a-z]+\d*;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ');
}
function safeCodePoint(cp) {
  try { return String.fromCodePoint(cp); } catch { return ' '; }
}

// Linhas/segmentos de ruído típico de e-commerce que não descrevem o produto.
const NOISE = [
  /\b(adicionar ao carrinho|add to cart|comprar agora|buy now)\b/gi,
  /\b(portes? gr[aá]tis|free shipping|envio gr[aá]tis)\b/gi,
  /\b(ver mais|read more|saiba mais|leia mais)\b/gi,
  /\b(em stock|out of stock|esgotado|dispon[ií]vel)\b/gi,
  /\b(refer[êe]ncia|sku|ean|c[oó]digo)\s*[:#]?\s*[\w-]+/gi,
];

/**
 * @param {string} raw
 * @param {{maxLen?:number, brand?:string, name?:string}} [opts]
 * @returns {string|null}
 */
function cleanDescription(raw, opts = {}) {
  const maxLen = opts.maxLen ?? 280;
  if (!raw || typeof raw !== 'string') return null;

  let s = raw;
  // 1) <br>, <li>, <p> → separadores de frase antes de remover tags.
  s = s.replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\s*\/?>/gi, '. ');
  // 2) Remover todas as tags HTML restantes.
  s = s.replace(/<[^>]+>/g, ' ');
  // 3) Decodificar entidades.
  s = decodeEntities(s);
  // 4) Tirar ruído de e-commerce.
  for (const rx of NOISE) s = s.replace(rx, ' ');
  // 5) Normalizar espaços e pontuação repetida.
  s = s.replace(/\s+/g, ' ')
       .replace(/\s+([.,;:!?])/g, '$1')
       .replace(/([.;])\1+/g, '$1')
       .replace(/\.\s*\.\s*/g, '. ')
       .trim();

  if (s.length < 20) return null;

  // 6) Cortar a maxLen numa fronteira de frase (preferida) ou de palavra.
  if (s.length > maxLen) {
    const slice = s.slice(0, maxLen);
    const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
    if (lastStop > maxLen * 0.5) {
      s = slice.slice(0, lastStop + 1).trim();
    } else {
      const lastSpace = slice.lastIndexOf(' ');
      s = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() + '…';
    }
  }

  return s.length >= 20 ? s : null;
}

module.exports = { cleanDescription };
