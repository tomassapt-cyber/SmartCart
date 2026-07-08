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
  'laboratorios svr': 'svr',
  'laboratorio svr': 'svr',
  'svr laboratoires': 'svr',
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

  // ── Typos / truncamentos / entidades vazadas do scraper (mesma marca) ──────
  'laboratoires svr': 'svr',              // ordem de palavras trocada no alias antigo
  'daveia': 'd-aveia',                    // apóstrofe perdida na extração
  'aderma': 'a-derma',                    // hífen perdido na extração
  'skin resisit': 'skin-resist',          // typo (easyfarma)
  'euceirn': 'eucerin',                   // typo (easyfarma)
  'etat': 'etat-pur',                     // "Etat Pur" truncado
  'lierac homme': 'lierac',               // "homme" é token genérico, strip inócuo
};

// ── LINHA → MARCA-MÃE ────────────────────────────────────────────────────────
// Alguns scrapers extraem o nome da LINHA como "marca" (ex.: "Pigmentbio",
// "Dercos") em vez do fabricante — isto fazia a guarda de marca do
// apply-cnp-merge recusar e o fingerprint divergir entre lojas.
//
// ⚠️ DIFERENÇA CRÍTICA vs BRAND_ALIASES: um alias de marca (ysl ↔ Yves Saint
// Laurent) é o MESMO emissor — pode ser removido do nome canónico. O nome de
// uma LINHA distingue PRODUTOS DIFERENTES da mesma marca (Sensibio ≠ Sébium ≠
// Hydrabio Gel Moussant) — remover o token da linha do nome colapsava linhas
// distintas no mesmo fingerprint ('bioderma|gel-moussant') e o dedup diário
// FUNDIA produtos diferentes num só card (bug grave detectado 2026-07-02).
// Por isso estas entradas: (1) normalizam a MARCA (Dercos→vichy) como antes;
// (2) NUNCA são removidas do nome; (3) se a "marca" da loja era a linha, o
// token da linha é INJETADO no nome canónico (senão "brand:Sébium, name:Gel
// Moussant" não colidia com "brand:Bioderma, name:Sébium Gel Moussant").
// Valor = token canónico a injetar (chave e valor sem acentos via lookup).
const LINE_ALIASES = {
  // Bioderma
  'sensibio': { brand: 'bioderma', token: 'sensibio' },
  'sebium': { brand: 'bioderma', token: 'sebium' },
  'atoderm': { brand: 'bioderma', token: 'atoderm' },
  'hydrabio': { brand: 'bioderma', token: 'hydrabio' },
  'photoderm': { brand: 'bioderma', token: 'photoderm' },
  'pigmentbio': { brand: 'bioderma', token: 'pigmentbio' },
  'cicabio': { brand: 'bioderma', token: 'cicabio' },
  'node': { brand: 'bioderma', token: 'node' },
  'abcderm': { brand: 'bioderma', token: 'abcderm' },
  'crealine': { brand: 'bioderma', token: 'crealine' },
  // Isdin
  'fotoprotector': { brand: 'isdin', token: 'fotoprotector' },
  'fotoprot': { brand: 'isdin', token: 'fotoprotector' },  // truncamento (byfarma)
  'fotoultra': { brand: 'isdin', token: 'fotoultra' },
  'ureadin': { brand: 'isdin', token: 'ureadin' },
  'nutratopic': { brand: 'isdin', token: 'nutratopic' },
  'lambdapil': { brand: 'isdin', token: 'lambdapil' },
  'isdinceutics': { brand: 'isdin', token: 'isdinceutics' },
  // Vichy
  'dercos': { brand: 'vichy', token: 'dercos' },
  'liftactiv': { brand: 'vichy', token: 'liftactiv' },
  'neovadiol': { brand: 'vichy', token: 'neovadiol' },
  'normaderm': { brand: 'vichy', token: 'normaderm' },
  'aqualia': { brand: 'vichy', token: 'aqualia' },
  'capital soleil': { brand: 'vichy', token: 'capital-soleil' },
  'mineral 89': { brand: 'vichy', token: 'mineral-89' },
  'purete thermale': { brand: 'vichy', token: 'purete-thermale' },
  // La Roche-Posay
  'effaclar': { brand: 'la-roche-posay', token: 'effaclar' },
  'anthelios': { brand: 'la-roche-posay', token: 'anthelios' },
  'cicaplast': { brand: 'la-roche-posay', token: 'cicaplast' },
  'toleriane': { brand: 'la-roche-posay', token: 'toleriane' },
  'lipikar': { brand: 'la-roche-posay', token: 'lipikar' },
  'pigmentclar': { brand: 'la-roche-posay', token: 'pigmentclar' },
  'rosaliac': { brand: 'la-roche-posay', token: 'rosaliac' },
  'kerium': { brand: 'la-roche-posay', token: 'kerium' },
  'redermic': { brand: 'la-roche-posay', token: 'redermic' },
  // Avène
  'cicalfate': { brand: 'avene', token: 'cicalfate' },
  'xeracalm': { brand: 'avene', token: 'xeracalm' },
  'hydrance': { brand: 'avene', token: 'hydrance' },
  'cleanance': { brand: 'avene', token: 'cleanance' },
  'antirougeurs': { brand: 'avene', token: 'antirougeurs' },
  'ystheal': { brand: 'avene', token: 'ystheal' },
  'physiolift': { brand: 'avene', token: 'physiolift' },
  'couvrance': { brand: 'avene', token: 'couvrance' },
  'dermabsolu': { brand: 'avene', token: 'dermabsolu' },
  // Uriage
  'barieuderm': { brand: 'uriage', token: 'bariederm' },
  'barierm': { brand: 'uriage', token: 'bariederm' },
  'bariederm': { brand: 'uriage', token: 'bariederm' },
  'hyseac': { brand: 'uriage', token: 'hyseac' },
  'xemose': { brand: 'uriage', token: 'xemose' },
  'roseliane': { brand: 'uriage', token: 'roseliane' },
  // Ducray
  'dexyane': { brand: 'ducray', token: 'dexyane' },
  'ictyane': { brand: 'ducray', token: 'ictyane' },
  'kelual': { brand: 'ducray', token: 'kelual' },
  'anaphase': { brand: 'ducray', token: 'anaphase' },
  'kertyol': { brand: 'ducray', token: 'kertyol' },
  'squanorm': { brand: 'ducray', token: 'squanorm' },
  'neoptide': { brand: 'ducray', token: 'neoptide' },
  'melascreen': { brand: 'ducray', token: 'melascreen' },
  // Klorane
  'polysianes': { brand: 'klorane', token: 'polysianes' },
  'polysianes psa': { brand: 'klorane', token: 'polysianes' },
  'klorane polysianes': { brand: 'klorane', token: 'polysianes' },
  // RoC / Leti
  'roc keops': { brand: 'roc', token: 'keops' },
  'letifem': { brand: 'leti', token: 'letifem' },
};

// ── Fabricantes/distribuidores GENÉRICOS ────────────────────────────────────
// Alguns catálogos (ex.: easyfarma, byfarma) usam o nome do FABRICANTE
// diversificado (dono de várias linhas distintas: Cantabria Labs → Heliocare,
// Endocare, Neoretin, BiRetix...; Pierre Fabre → Avène, Dexeryl, Elgydium...)
// como se fosse a "marca" do produto, em vez da linha real. Como um único
// fabricante cobre produtos DIFERENTES, não podemos mapear para uma linha
// fixa (over-merge). Em vez disso, tratamos estes valores como *wildcard* na
// guarda de marca do apply-cnp-merge: são ignorados na comparação, e só a(s)
// marca(s) específica(s) restante(s) têm de coincidir.
const GENERIC_BRAND_LABELS = new Set([
  'sem-marca',              // "Sem Marca" — nenhuma marca extraída
  'cantabria-labs', 'cantabria',
  'pierre-fabre',
  'arkopharma',
  'bausch-lomb',
  'hartmann',
  'medinfar',
  'nestle',
  'italfarmaco',
  'laboratorios-faes-farma',
  'coffret',                // "Coffret" (embalagem de oferta) — não é marca
  'protetor',               // "Protetor" (Solar) — palavra de tipo de produto, não marca
]);

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

  // Indicadores de TAMANHO — não distinguem o produto, só o volume (que já é
  // variante). Ex.: "Nivea Creme Familiar 250ml" = "Nivea Creme" em formato
  // maior → mesmo produto. Sem isto, ficavam cards separados por tamanho.
  'familiar', 'family', 'familial', 'grande', 'maxi',
  // Artefacto de abreviatura redundante (ex.: "Nivea Creme Cr" → Cr = Creme)
  'cr',
]);

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Alguns scrapers vazam entidades HTML por-decodificar no campo brand
// (ex.: "D&#x27;Aveia", "Roger &amp; Gallet") — decodificar antes de tudo o
// resto, senão "D&#x27;Aveia" e "D'Aveia" normalizam para valores diferentes.
function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&amp;/gi, '&')
    .replace(/&#x27;|&#39;|&#039;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function normalizeBrand(brand) {
  if (!brand) return '';
  let b = stripAccents(decodeHtmlEntities(String(brand)).toLowerCase())
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (BRAND_ALIASES[b]) return BRAND_ALIASES[b];
  if (LINE_ALIASES[b]) return LINE_ALIASES[b].brand;
  // Tentar match sem hifens
  const noDash = b.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (BRAND_ALIASES[noDash]) return BRAND_ALIASES[noDash];
  if (LINE_ALIASES[noDash]) return LINE_ALIASES[noDash].brand;

  // Default: espaços → hífens
  return b.replace(/\s+/g, '-');
}

// Se a "marca" vinda da loja é afinal uma LINHA, devolve o token canónico da
// linha (para injetar no nome canónico); senão null.
function lineTokenForBrand(brand) {
  if (!brand) return null;
  const b = stripAccents(decodeHtmlEntities(String(brand)).toLowerCase())
    .replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (LINE_ALIASES[b]) return LINE_ALIASES[b].token;
  const noDash = b.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (LINE_ALIASES[noDash]) return LINE_ALIASES[noDash].token;
  return null;
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
  // ───── Ruído de listagem: marcadores de PROMOÇÃO (mesmo produto, em promo) ─────
  // "X Preço Especial" / "Promo Pack X" = o mesmo produto X, só uma listagem
  // promocional. Removidos para não fragmentar (a promo aparece no preço/desconto).
  [/\b(pre[cç]o\s+especial|promo[cç][aã]o|promo\s+pack|em\s+promo[cç][aã]o|oferta\s+especial)\b/gi, ' '],
  // ───── Nome da LOJA vazado no fim do nome (artefacto de scrape) ─────
  // ex.: "... - Farmácia Barreiros", "... - Druni". Removido até ao fim.
  [/\s*[-–·(]\s*(farm[aá]cia(\s+\w+)?|druni|wells|atida|sweetcare|byfarma|easyfarma|barreiros|bairro\s+da\s+sa[uú]de)\b[^|]*$/gi, ' '],
  // ───── Perfumaria ─────
  [/\beau\s+de\s+parfum\b/gi, 'edp'],
  [/\beau\s+de\s+toilette\b/gi, 'edt'],
  [/\beau\s+fraiche\b/gi, 'fraiche'],
  [/\beau\s+de\s+cologne\b/gi, 'cologne'],
  [/\bcolonia\b/gi, 'cologne'],

  // ───── Skincare phrases ─────
  [/\bsoin\s+anti[- ]imperfections?\b/gi, 'anti-imperfeicoes'],
  [/\banti[- ]imperfections?\b/gi, 'anti-imperfeicoes'],
  [/\bcreme\s+protetor\s+de\s+dia\b/gi, 'creme-protetor-dia'],

  // ───── Micellar water (PT/ES/EN/FR) ─────
  [/\bsolu[cç][aã]o\s+micelar\b/gi, 'agua-micelar'],
  [/\bsoluci[oó]n\s+micelar\b/gi, 'agua-micelar'],
  [/\bagua\s+micelar\b/gi, 'agua-micelar'],
  [/\beau\s+micellaire\b/gi, 'agua-micelar'],
  [/\bmicellar\s+water\b/gi, 'agua-micelar'],

  // ───── Cream (PT/ES/EN/FR) ─────
  [/\bcr[eè]me\b/gi, 'creme'],
  [/\bcrema\b/gi, 'creme'],
  [/\bcream\b/gi, 'creme'],

  // ───── Soap/bar (PT/ES/EN/FR) — Bioderma Atoderm Pain etc ─────
  [/\bsabonete\b/gi, 'sabonete'],
  [/\bjab[oó]n\b/gi, 'sabonete'],
  [/\bsavon\b/gi, 'sabonete'],
  [/\bsoap\b/gi, 'sabonete'],
  [/\bpain\s+(dermatologique|dermatologico|dermatologic)\b/gi, 'sabonete'],

  // ───── Serum (PT/ES/EN/FR all map to 'serum') ─────
  [/\bs[eé]rum\b/gi, 'serum'],
  [/\bserum\b/gi, 'serum'],

  // ───── Deodorant (PT/ES/EN/FR) ─────
  [/\bdesodorizante\b/gi, 'deo'],
  [/\bdesodorante\b/gi, 'deo'],
  [/\bdeodorant\b/gi, 'deo'],
  [/\bd[eé]odorant\b/gi, 'deo'],

  // ───── Moisturizer (PT/ES/EN/FR) ─────
  [/\bhidratante\b/gi, 'hidratante'],
  [/\bsoin\s+hydratant\b/gi, 'hidratante'],
  [/\bhydratant\b/gi, 'hidratante'],
  [/\bmoisturi[sz]ing\b/gi, 'hidratante'],
  [/\bmoisturi[sz]er\b/gi, 'hidratante'],

  // ───── Cleansing (PT/ES/EN/FR) ─────
  [/\blimpeza\b/gi, 'limpeza'],
  [/\blimpieza\b/gi, 'limpeza'],
  [/\bcleans(ing|er)\b/gi, 'limpeza'],
  [/\bnettoyant\b/gi, 'limpeza'],

  // ───── Tonic/Toner (PT/ES/EN/FR) ─────
  [/\bt[oó]nico\b/gi, 'tonico'],
  [/\btoner\b/gi, 'tonico'],
  [/\btonique\b/gi, 'tonico'],

  // ───── Lotion (PT/ES/EN/FR) ─────
  [/\blo[cç][aã]o\b/gi, 'locao'],
  [/\bloci[oó]n\b/gi, 'locao'],
  [/\blotion\b/gi, 'locao'],

  // ───── Shampoo (PT/ES/EN/FR) ─────
  [/\bshampoo?\b/gi, 'shampoo'],
  [/\bchamp[oô]?\b/gi, 'shampoo'],
  [/\bchamp[uú]\b/gi, 'shampoo'],
  [/\bshampoing\b/gi, 'shampoo'],

  // ───── Conditioner (PT/ES/EN/FR) ─────
  [/\bcondicionador\b/gi, 'condicionador'],
  [/\bconditioner\b/gi, 'condicionador'],
  [/\bacondicionador\b/gi, 'condicionador'],
  [/\bapres[- ]shampoo?\b/gi, 'condicionador'],

  // ───── Oil (PT/ES/EN/FR) ─────
  [/\b[oó]leo\b/gi, 'oleo'],
  [/\baceite\b/gi, 'oleo'],
  [/\bhuile\b/gi, 'oleo'],
  [/\boil\b/gi, 'oleo'],

  // ───── Mask (PT/ES/EN/FR) ─────
  [/\bm[aá]scara\b/gi, 'mascara'],
  [/\bmasque\b/gi, 'mascara'],
  [/\bmask\b/gi, 'mascara'],

  // ───── Mist/Spray ─────
  [/\bbrume\b/gi, 'mist'],
  [/\bmist\b/gi, 'mist'],
  [/\bbruma\b/gi, 'mist'],

  // ───── Sunscreen (vamos manter spf como discriminator) ─────
  [/\bprotetor\s+solar\b/gi, 'solar'],
  [/\bprotector\s+solar\b/gi, 'solar'],
  [/\bsunscreen\b/gi, 'solar'],
  [/\b[eé]cran\s+solaire\b/gi, 'solar'],

  // ───── Anti-aging/wrinkle ─────
  [/\banti[- ]?idade\b/gi, 'anti-idade'],
  [/\banti[- ]?envelhecimento\b/gi, 'anti-idade'],
  [/\banti[- ]?aging\b/gi, 'anti-idade'],
  [/\banti[- ]?edad\b/gi, 'anti-idade'],
  [/\banti[- ]?ageing\b/gi, 'anti-idade'],
  [/\banti[- ]?[aâà]ge\b/gi, 'anti-idade'],
  [/\banti[- ]?wrinkle\b/gi, 'anti-rugas'],
  [/\banti[- ]?ar+ugas\b/gi, 'anti-rugas'],
  [/\banti[- ]?arrugas\b/gi, 'anti-rugas'],

  // ───── Body parts (remove — context noise) ─────
  // Manter "rosto" pode causar false negatives (e.g. "creme rosto" vs "creme" puro)
  // Decisão: remover sufixos genéricos de área quando aparecem isolados.

  // ───── SPF/FPS normalization ─────
  [/\bspf\s*(\d+)\s*\+?/gi, 'spf$1'],
  [/\bfps\s*(\d+)\s*\+?/gi, 'spf$1'],

  // ───── Sinónimos seguros (minerados de quase-gémeos mesma-marca+volume) ─────
  // Mesmo significado entre lojas/línguas → unificar p/ não fragmentar produtos.
  // (NÃO incluir shampoo/condicionador, creme/gel, cor/creme — são DISCRIMINADORES.)
  [/\bcorporal\b/gi, 'corpo'],          // corpo ↔ corporal (body)
  [/\bsoro\b/gi, 'serum'],              // soro (PT) ↔ serum
  [/\bfotoprotetor\b/gi, 'fotoprotector'], // PT ↔ ES
  [/\bexfoliante\b/gi, 'esfoliante'],   // ES ↔ PT
  [/\bl[aá]bios\b/gi, 'labial'],        // lábios ↔ labial (lip)
  [/\bnoturno\b/gi, 'noite'],           // creme noturno ↔ creme de noite
  [/\blavante\b/gi, 'limpeza'],         // gel lavante ↔ gel de limpeza
  [/\bligeiro\b/gi, 'leve'],            // ligeiro ↔ leve (textura leve)
  [/\bmascarilla\b/gi, 'mascara'],     // ES ↔ máscara
  [/\bmanteca\b/gi, 'manteiga'],       // ES manteca ↔ manteiga (corporal)
  [/\byeux\b/gi, 'olhos'],             // FR yeux ↔ olhos

  // ───── Cross-language qualifier normalisation (Bioderma-style) ─────
  // PT 'rico' ↔ EN 'rich' ↔ FR 'riche' = same variant descriptor
  [/\brico\b/gi, 'rich'],
  [/\briche\b/gi, 'rich'],
  // PT 'activo'/'ativo' ↔ EN 'active' ↔ FR 'actif' = same descriptor
  [/\bactivo\b/gi, 'active'],
  [/\bativo\b/gi, 'active'],
  [/\bactif\b/gi, 'active'],
  // PT 'invisível'(→invisivel após stripAccents) ↔ EN/FR 'invisible' = mesmo descritor
  // (ex.: Avène Ultra Fluido Invisível/Invisible SPF50 — mesmo SKU, lojas diferentes)
  [/\binvisible\b/gi, 'invisivel'],
  // Foaming gel / gel moussant — Bioderma écrit os dois lados em alguns SKUs
  [/\bfoaming\s+gel\b/gi, 'gel-moussant'],
  // "without color" descriptor — Photoderm s/Cor ↔ Photoderm sin color ↔ tinted-free
  [/\bs\/?\s*cor\b/gi, 'sem-cor'],
  [/\bsin\s+color\b/gi, 'sem-cor'],
  [/\bsans\s+couleur\b/gi, 'sem-cor'],
  // Pediátrico/pediatric/pediatrics
  [/\bpediatric(s)?\b/gi, 'pediatrico'],
  [/\bpediatrique\b/gi, 'pediatrico'],
];

// ───── Qualifier noise — palavras que descrevem mas não distinguem ─────
// Removidas DEPOIS do PHRASE_NORMALIZATION. Lista conservadora: só palavras
// que claramente são adjectivos descritivos sem valor de matching.
// NÃO incluir tipos de produto (serum, creme, oleo) — esses são discriminadores.
const QUALIFIER_NOISE = new Set([
  'actif', 'active', // já normalizadas mas defensive
  'foaming', 'foam',
  'fluid', 'fluide', 'fluido',
  'mousse', 'mousseux',
  'doux', 'doce', 'gentle',
  'puro', 'pure', 'pur',
  'fresh', 'fresco', 'frais',
]);

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

  // Remover marca completa (palavras + aliases).
  // EXCEÇÃO: se a "marca" da loja é uma LINHA (Sébium, Dercos…), o token da
  // linha distingue produtos — NÃO se remove; injeta-se no nome (em baixo).
  const lineToken = lineTokenForBrand(brand);
  const allBrandTokens = new Set();
  if (brand && !lineToken) {
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

  // Tokenize — separa também por hífen: a hifenização é arbitrária entre lojas
  // ("gel-creme" vs "gel creme", "anti-caspa" vs "anti caspa") e fragmentava o
  // mesmo produto em fingerprints diferentes. Split por hífen torna-os iguais.
  const tokens = n.split(/[\s-]+/).filter(Boolean).filter(t => {
    if (GENERIC_TOKENS.has(t)) return false;
    if (QUALIFIER_NOISE.has(t)) return false;
    if (t.length === 1 && !/[a-z+]/i.test(t)) return false;
    return true;
  });

  // Injetar o token da linha quando a "marca" da loja era a linha e o nome
  // não a repete (ex.: brand "Sébium" + name "Gel Moussant 200ml" tem de
  // colidir com brand "Bioderma" + name "Sébium Gel Moussant 200ml").
  if (lineToken) {
    for (const t of lineToken.split('-')) {
      if (t && !tokens.includes(t)) tokens.push(t);
    }
  }

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

/**
 * Token set de um nome (sem brand). Usado em fuzzy match.
 */
function nameTokenSet(name, brand) {
  const canon = canonicalName(name, brand);
  return new Set(canon.split('-').filter(Boolean));
}

/**
 * Jaccard similarity entre dois sets de tokens: |A ∩ B| / |A ∪ B|.
 * Devolve valor entre 0 e 1.
 */
function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const x of a) if (b.has(x)) intersect++;
  return intersect / (a.size + b.size - intersect);
}

/**
 * Tenta match fuzzy entre um produto candidato e uma lista de produtos.
 * Critérios:
 *  - Mesma marca canónica (obrigatório)
 *  - Pelo menos 1 token "principal" comum (>3 chars) — evita matches
 *    triviais entre dois produtos que partilham só "creme" ou "spf50"
 *  - Jaccard similarity >= threshold (default 0.65)
 *
 * Devolve o produto com maior similarity acima do threshold, ou null.
 */
function fuzzyMatch(candidate, productList, threshold = 0.65) {
  const candBrand = normalizeBrand(candidate.brand);
  if (!candBrand) return null;
  const candTokens = nameTokenSet(candidate.name, candidate.brand);
  if (candTokens.size === 0) return null;

  let bestMatch = null;
  let bestScore = threshold;
  for (const p of productList) {
    if (normalizeBrand(p.brand) !== candBrand) continue;
    const pTokens = nameTokenSet(p.name, p.brand);
    // Verificar overlap de tokens distintivos (length > 3, não SPF/spf)
    let hasDistinctive = false;
    for (const t of pTokens) {
      if (t.length > 3 && candTokens.has(t) && !/^spf\d+$/.test(t)) {
        hasDistinctive = true;
        break;
      }
    }
    if (!hasDistinctive) continue;

    const score = jaccard(candTokens, pTokens);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = p;
    }
  }
  return bestMatch ? { product: bestMatch, score: bestScore } : null;
}

/**
 * Fuzzy SEGURO para lojas de COMPARAÇÃO enrich-only (sem EAN): liga um produto
 * do catálogo a um produto EXISTENTE do seed da MESMA marca quando é claramente
 * o mesmo item com nome diferente. Guards apertados (validados 2026-07-05 —
 * abaixo disto apanha SKUs diferentes: gel≠creme, tripla-ação≠extra-fresca):
 *   • mesma marca canónica (a lista é já filtrada por marca pelo caller);
 *   • volume dentro de 6% (se ambos tiverem);
 *   • Jaccard dos tokens do nome >= threshold (default 0.85);
 *   • >=1 token distintivo partilhado (>4 chars, não spf/genérico).
 * Como a loja é enrich-only, o pior caso é 1 preço errado (recuperável), não
 * corromper a identidade de um produto. Devolve { product, score } ou null.
 */
function safeFuzzyMatch(candidate, sameBrandProducts, opts = {}) {
  const threshold = opts.threshold != null ? opts.threshold : 0.85;
  const cand = nameTokenSet(candidate.name, candidate.brand);
  if (cand.size < 2) return null;
  const cvol = extractVolumeMl(candidate.name);
  let best = null, bestScore = threshold;
  for (const p of sameBrandProducts) {
    const svol = extractVolumeMl(p.name);
    if (cvol && svol && Math.abs(cvol - svol) / Math.max(cvol, svol) > 0.06) continue;   // volume tem de bater
    const pt = nameTokenSet(p.name, p.brand);
    let distinctive = false;
    for (const t of cand) if (t.length > 4 && pt.has(t) && !/^spf\d*$/.test(t)) { distinctive = true; break; }
    if (!distinctive) continue;
    const score = jaccard(cand, pt);
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best ? { product: best, score: bestScore } : null;
}

// ── Palavras-RUÍDO para matching "solto" das lojas de COMPARAÇÃO ────────────
// Descritores genéricos que NUNCA distinguem produtos (conectores + redundância
// tipo cabelo/capilar). NÃO incluir discriminadores reais (rosto/corpo/pele,
// seco/oleoso, dia/noite, sky/high). Usado por looseMatchKey: dois nomes com o
// MESMO conjunto de tokens após remover estes são o mesmo produto (ex.: Pantene
// "Espuma Cabelo Pro V" ↔ "Espuma Capilar Pro-V"). Determinístico, sem fuzzy.
const NOISE_TOKENS = new Set([
  'para', 'com', 'e', 'de', 'da', 'do', 'em', 'no', 'na', 'nos', 'nas',
  'the', 'of', 'and', 'a', 'o',
  'cabelo', 'cabelos', 'capilar', 'pelo', 'pelos',
  'uso', 'tipo', 'todo', 'todos', 'toda', 'todas',
  'linha', 'profissional', 'professional', 'gama',
]);

/**
 * Chave de match SOLTO (mas seguro): tokens do nome canónico MENOS palavras-
 * ruído, ordenados. Dois produtos da mesma marca+volume com a mesma chave são
 * o mesmo item (só diferem em descritores redundantes). Devolve null se
 * ficarem < minTokens tokens distintivos (evita colidir nomes genéricos).
 */
function looseMatchKey(name, brand, minTokens = 2) {
  const toks = [...nameTokenSet(name, brand)].filter(t => !NOISE_TOKENS.has(t));
  if (toks.length < minTokens) return null;
  return toks.sort().join('-');
}

/**
 * Filtro de NÃO-cosmética (medicamentos, suplementos orais, fórmula infantil,
 * puericultura, dispositivos, pet). Usado pelas lojas em MODO COMPARAÇÃO para
 * não anexar preços a produtos fora do foco dermo/skincare/cabelo/corpo.
 *
 * REGRA-CHAVE: filtramos por FORMA FARMACÊUTICA (comprimidos/cápsulas/saquetas…)
 * e por FÓRMULA INFANTIL / PET, NUNCA por INGREDIENTE — "Vitamina C Sérum",
 * "Creme Colagénio" e "Leite de Limpeza/Corporal" são cosmética e TÊM de passar.
 * Stems SEM `\b` final (senão "comprimid\b" falha em "comprimidos" — foi o bug
 * que deixou passar suplementos e um pack de leite Aptamil com preço errado).
 */
/**
 * parsePriceEU — parse de preço à prova de formatos europeus.
 * parseFloat("7,48") devolve 7 (TRUNCA na vírgula!) — foi assim que a
 * mycosmetics ficou com 100% do catálogo com preços errados (JSON-LD do tema
 * emite vírgula decimal). Regras:
 *   "7,48"→7.48 · "1.234,56"→1234.56 · "1,234.56"→1234.56 · "7.48"→7.48 ·
 *   7.48→7.48 · "7,48 €"→7.48 · null→NaN
 */
function parsePriceEU(x) {
  if (typeof x === 'number') return x;
  let s = String(x == null ? '' : x).replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  const lastC = s.lastIndexOf(','), lastD = s.lastIndexOf('.');
  if (lastC > -1 && lastD > -1) {
    // ambos presentes: o ÚLTIMO é o decimal, o outro é separador de milhares
    if (lastC > lastD) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastC > -1) {
    // só vírgula: decimal se tiver 1-2 díg. à direita, senão milhares
    s = (s.length - lastC - 1) <= 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  return parseFloat(s);
}

const NON_COSMETIC = /\b(comprimid|c[áa]psula|dr[áa]geia|saqueta|past[ie]lha|gomas\b|xarope|ampola[s]? bebiv|p[óo] sol[úu]vel|suplement|medicament|antibi[óo]tic|fralda|chupeta|biber[oóã]o|papa infantil|cereais infant|term[óo]metro|tensi[óo]metro|nebuliz|inalad|ligadura|compressa esteril|penso r[áa]pid|piolho|repelent|carraç|ra[çc][ãa]o|(?:para )?(?:c[ãa]es|gatos)\b|animal de estim|veterin|aptamil|nutrib[ée]n|nidina|blemil|novalac|enfamil|nan \d|profutura|leite (?:de )?(?:transi|continua|crescimento|infantil|[123])\b|leite em p[óo])/i;
function isNonCosmetic(name) { return NON_COSMETIC.test(String(name || '')); }

module.exports = {
  parsePriceEU,
  NON_COSMETIC,
  isNonCosmetic,
  productFingerprint,
  productFingerprintWithVolume,
  normalizeBrand,
  displayBrand,
  canonicalName,
  extractVolumeMl,
  stripAccents,
  fuzzyMatch,
  safeFuzzyMatch,
  looseMatchKey,
  NOISE_TOKENS,
  nameTokenSet,
  jaccard,
  GENERIC_BRAND_LABELS,
  LINE_ALIASES,
  lineTokenForBrand,
};
