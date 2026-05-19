/**
 * Product Fingerprint — canonical identity for cross-store deduplication
 * ============================================================
 *
 * O mesmo produto físico aparece em múltiplas lojas com:
 *  - Marca: "La Roche-Posay" vs "La Roche Posay" vs "LRP"
 *  - Nome: "Effaclar Duo+ 40ml" vs "Effaclar Duo + 40 ml"
 *  - Volume: separadamente como variantes
 *
 * Este módulo gera um identificador canónico (fingerprint) que ignora
 * essas variações superficiais e permite linkar produtos entre lojas.
 *
 * Estratégia:
 *  brand_normalized + name_canonical
 *  (volume NÃO entra — é tratado como variante)
 *
 * Exemplos:
 *  "La Roche-Posay Effaclar Duo+ 40ml"           → "la-roche-posay|effaclar-duo+"
 *  "La Roche Posay Effaclar Duo+ M Light 40 ml"  → "la-roche-posay|effaclar-duo+-m-light"
 *  Diferentes (M Light é variante distinta)
 *
 * Uso:
 *  const { productFingerprint } = require('./lib/product-fingerprint');
 *  const fp = productFingerprint({ brand: '...', name: '...' });
 */

// ── Alias map para marcas comuns ──────────────────────────────
// Mapeamos variações textuais para um identificador canónico estável.
const BRAND_ALIASES = {
  // Farmácia
  'la roche posay': 'la-roche-posay',
  'la roche-posay': 'la-roche-posay',
  'laroche posay': 'la-roche-posay',
  'laroche-posay': 'la-roche-posay',
  'lrp': 'la-roche-posay',

  // Skincare premium
  'estee lauder': 'estee-lauder',
  'estée lauder': 'estee-lauder',
  'estee lauder companies': 'estee-lauder',

  'lancome': 'lancome',
  'lancôme': 'lancome',

  "l'oreal paris": 'loreal-paris',
  "l'oréal paris": 'loreal-paris',
  'l oreal paris': 'loreal-paris',
  'l oréal paris': 'loreal-paris',
  'loreal paris': 'loreal-paris',

  "l'oreal professionnel": 'loreal-professionnel',
  'l oreal professionnel': 'loreal-professionnel',

  // Hair
  'kerastase': 'kerastase',
  'kérastase': 'kerastase',
  'redken': 'redken',

  // Perfumaria
  'yves saint laurent': 'ysl',
  'ysl': 'ysl',
  'ysl beauty': 'ysl',

  'giorgio armani': 'giorgio-armani',
  'armani': 'giorgio-armani',
  'armani beauty': 'giorgio-armani',

  // Outros que costumam variar
  'avene': 'avene',
  'avène': 'avene',
  'eau thermale avene': 'avene',
  'eau thermale avène': 'avene',

  'nuxe': 'nuxe',
  'caudalie': 'caudalie',
  'bioderma': 'bioderma',
  'eucerin': 'eucerin',
  'cerave': 'cerave',
  'cetaphil': 'cetaphil',
  'isdin': 'isdin',
  'vichy': 'vichy',
  'svr': 'svr',
  'uriage': 'uriage',
  'klorane': 'klorane',
  'ducray': 'ducray',
  'noreva': 'noreva',
  'mustela': 'mustela',
  'biafine': 'biafine',
  'heliocare': 'heliocare',
  'roc': 'roc',

  // Maquilhagem mass-market
  'maybelline': 'maybelline',
  'maybelline new york': 'maybelline',
  'rimmel': 'rimmel',
  'rimmel london': 'rimmel',
  'nyx': 'nyx',
  'nyx professional makeup': 'nyx',

  // Outros
  'rituals': 'rituals',
  'rituals cosmetics': 'rituals',
  'chanel': 'chanel',
  'dior': 'dior',
  'parfums christian dior': 'dior',
  'versace': 'versace',
  'gianni versace': 'versace',
  'charlotte tilbury': 'charlotte-tilbury',
  'nars': 'nars',
  'nars cosmetics': 'nars',
};

// Palavras genéricas a remover do nome canónico — não distinguem
// produtos do mesmo tipo. Manter SPF, números, "+", "-" etc.
const GENERIC_TOKENS = new Set([
  'para', 'pour', 'for', 'with', 'avec',
  'homem', 'homens', 'mulher', 'mulheres', 'men', 'women', 'unisex', 'femme', 'femmes', 'homme', 'hommes',
  // Tipos de fragrância — manter se for distinguidor de variantes (e.g., EDT vs EDP)
  // mas remover wrappers como "para mulher"
  // (decisão: NÃO remover edt/edp, eles são distinguidores reais)

  // Wrappers comuns sem valor
  'a', 'o', 'de', 'da', 'do', 'das', 'dos', 'la', 'le', 'el',
  'and', 'e', 'or', 'ou',
]);

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeBrand(brand) {
  if (!brand) return '';
  let b = stripAccents(String(brand).toLowerCase())
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (BRAND_ALIASES[b]) return BRAND_ALIASES[b];
  // Tentar match sem hifens
  const noDash = b.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (BRAND_ALIASES[noDash]) return BRAND_ALIASES[noDash];

  // Default: espaços → hífens
  return b.replace(/\s+/g, '-');
}

/**
 * Versão "amigável" da marca para display (com case + acentos).
 * Usada quando criamos products novos no seed.
 */
function displayBrand(brand) {
  if (!brand) return null;
  const trimmed = String(brand).trim();
  // Mapping inverso simples para casos comuns
  const lower = stripAccents(trimmed.toLowerCase());
  const displayMap = {
    'la roche posay': 'La Roche-Posay',
    'la roche-posay': 'La Roche-Posay',
    'lrp': 'La Roche-Posay',
    'estee lauder': 'Estée Lauder',
    'estée lauder': 'Estée Lauder',
    'lancome': 'Lancôme',
    'lancôme': 'Lancôme',
    "l'oreal paris": "L'Oréal Paris",
    "l'oréal paris": "L'Oréal Paris",
    'loreal paris': "L'Oréal Paris",
    'kerastase': 'Kérastase',
    'kérastase': 'Kérastase',
    'yves saint laurent': 'Yves Saint Laurent',
    'ysl': 'Yves Saint Laurent',
    'avene': 'Avène',
    'avène': 'Avène',
    'maybelline': 'Maybelline',
    'maybelline new york': 'Maybelline',
    'giorgio armani': 'Giorgio Armani',
  };
  return displayMap[lower] || trimmed;
}

/**
 * Extrai volume_ml do nome do produto. Devolve null se não encontrar.
 */
function extractVolumeMl(name) {
  if (!name) return null;
  const m = stripAccents(String(name)).match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  const unit = m[2].toLowerCase();
  return unit === 'l' ? n * 1000 : n;
}

/**
 * Mapping de phrases multi-word para tokens canónicos.
 * Aplicado ANTES de tokenização para evitar divisões.
 */
const PHRASE_NORMALIZATION = [
  // Perfumaria: "Eau de Parfum" → "edp"
  [/\beau\s+de\s+parfum\b/gi, 'edp'],
  [/\beau\s+de\s+toilette\b/gi, 'edt'],
  [/\beau\s+fraiche\b/gi, 'fraiche'],
  [/\beau\s+de\s+cologne\b/gi, 'cologne'],

  // Skincare comum
  [/\bsoin\s+anti[- ]imperfections?\b/gi, 'anti-imperfeicoes'],
  [/\banti[- ]imperfections?\b/gi, 'anti-imperfeicoes'],
  [/\bcreme\s+protetor\s+de\s+dia\b/gi, 'creme-protetor-dia'],
  [/\bsoin\s+hydratant\b/gi, 'hidratante'],
  [/\bcreme\s+hidratante\b/gi, 'creme-hidratante'],
  [/\bagua\s+micelar\b/gi, 'agua-micelar'],
  [/\beau\s+micellaire\b/gi, 'agua-micelar'],

  // Hair
  [/\bshampoo?\b/gi, 'shampoo'],
  [/\bchampo?\b/gi, 'shampoo'],
  [/\bchampô\b/gi, 'shampoo'],

  // SPF normalization
  [/\bspf\s*(\d+)\s*\+?/gi, 'spf$1'],
  [/\bfps\s*(\d+)\s*\+?/gi, 'spf$1'],
];

/**
 * Nome canónico: remove marca, volume, palavras genéricas, normaliza separadores.
 * Mantém tokens distintivos (SPF, "+", "M", "Light", "Refill", etc.).
 */
function canonicalName(name, brand) {
  if (!name) return '';
  let n = stripAccents(String(name).toLowerCase());

  // Aplicar phrase normalizations PRIMEIRO (evita tokenizar incorrectamente)
  for (const [re, repl] of PHRASE_NORMALIZATION) {
    n = n.replace(re, repl);
  }

  // Remover volume (já foi extraído à parte)
  n = n.replace(/\b\d+(?:[.,]\d+)?\s*(ml|gr|g|kg|l)\b/gi, ' ');

  // Remover marca completa (palavras + aliases)
  const allBrandTokens = new Set();
  if (brand) {
    stripAccents(String(brand).toLowerCase())
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1)
      .forEach(w => allBrandTokens.add(w));
  }
  // Adicionar canonical brand aliases para apanhar quando aparece dentro do name
  const canonicalBrand = normalizeBrand(brand);
  if (canonicalBrand) {
    canonicalBrand.split('-').forEach(t => { if (t.length > 1) allBrandTokens.add(t); });
    // Também: se canonical é "ysl", adicionar ao set
    allBrandTokens.add(canonicalBrand);
  }
  // Aliases reversos: se brand é "ysl", procurar "yves saint laurent" no name
  Object.entries(BRAND_ALIASES).forEach(([alias, canonical]) => {
    if (canonical === canonicalBrand) {
      alias.split(/\s+/).filter(w => w.length > 1).forEach(w => allBrandTokens.add(w));
    }
  });

  for (const w of allBrandTokens) {
    n = n.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ' ');
  }

  // Reduzir pontuação a espaços, EXCEPTO + e -
  n = n.replace(/[^\w\s+-]/g, ' ');

  // Tokenize
  const tokens = n.split(/\s+/).filter(Boolean).filter(t => {
    if (GENERIC_TOKENS.has(t)) return false;
    if (t.length === 1 && !/[a-z+]/i.test(t)) return false;
    return true;
  });

  // Ordenar para idempotência (mesmo set de tokens em qualquer ordem = mesma fingerprint)
  tokens.sort();

  return tokens.join('-');
}

/**
 * Fingerprint canónico de um produto.
 * Devolve null se faltar brand ou name.
 *
 * IMPORTANTE: volume NÃO entra na fingerprint, porque queremos que
 * variantes de tamanho do mesmo produto colidam (são tratadas como
 * variants[] ao nível do store_product).
 */
function productFingerprint(product) {
  const brand = normalizeBrand(product.brand);
  const name = canonicalName(product.name, product.brand);
  if (!brand || !name) return null;
  return `${brand}|${name}`;
}

/**
 * Fingerprint mais estrita: inclui volume. Use quando quiseres
 * tratar variantes de volume como produtos DISTINTOS.
 * (Útil para preservar o EAN seed que é volume-específico.)
 */
function productFingerprintWithVolume(product) {
  const base = productFingerprint(product);
  if (!base) return null;
  const vol = extractVolumeMl(product.name);
  return vol ? `${base}|${vol}ml` : base;
}

module.exports = {
  productFingerprint,
  productFingerprintWithVolume,
  normalizeBrand,
  displayBrand,
  canonicalName,
  extractVolumeMl,
  stripAccents,
};
