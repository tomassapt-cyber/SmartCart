/**
 * Classificador dermo por NOME (não por slug do URL).
 * ============================================================
 * Recupera produtos de skincare/cabelo/corpo que a categorização por slug
 * deixou em 'other'/null (ex.: wells — Vichy Neovadiol, ISDIN Fotoprotector,
 * Color Wow Dream Coat — sem keyword no slug mas claramente dermo no nome).
 *
 * Devolve 'skincare' | 'hair' | 'body' | null.
 * Foco DERMO: exclui maquilhagem, perfumaria, suplementos, medicamentos,
 * puericultura e acessórios — esses devolvem null (não recuperados).
 *
 * Conservador: exige um sinal POSITIVO dermo E ausência de sinal de exclusão.
 */

function stripAccents(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Exclusões fortes — se o nome bate aqui, NÃO é dermo-recuperável → null.
const EXCLUDE = new RegExp([
  // maquilhagem
  'batom', 'gloss', 'rimel', 'rimmel', 'mascara de pestana', 'mascara pestana',
  'eyeliner', 'delineador', 'lapis de olho', 'sombra', 'paleta', 'blush', 'bronzer',
  'corretor', 'concealer', 'base de rosto', 'foundation', 'po compacto', 'po solto',
  'verniz', 'esmalte', 'nail', 'unhas?', 'primer', 'iluminador', 'highlighter', 'kohl',
  // perfumaria
  'perfum', 'eau de parfum', 'eau de toilette', '\\bedt\\b', '\\bedp\\b', 'colonia',
  'fragranc', 'body mist', 'agua de colonia',
  // suplementos / medicamentos / interno
  'suplement', 'supplement', 'food supplement', 'capsula', 'comprimid', 'gomas',
  'ampola bebivel', '\\bshot\\b', 'micro shot',
  'vitamina [abcde]\\b', 'magnesio', 'colagenio', 'proteina', 'probiotico',
  'xarope', 'pastilha', 'medicament',
  // puericultura / higiene não-dermo / acessórios
  'fralda', 'chupeta', 'biberon', 'tetina', 'leite em po', 'papa\\b', 'boiao',
  'preservativ', 'teste de gravidez', 'penso', 'compressa', 'seringa', 'termometro',
  'escova de dente', 'pasta de dente', 'dentifric', 'fio dental', 'colutorio',
  'lentes? de contacto', 'soro fisiologico', 'algodao',
].join('|'), 'i');

// Sinais positivos por categoria dermo (testados DEPOIS das exclusões).
// ⚠️ SÓ \b À ESQUERDA, nunca à direita (corrigido a 2026-09-28). Estas listas
// são RADICAIS — "champ", "desodoriz", "hidratant", "condicion" — e com \b dos
// dois lados só casavam a palavra exacta: "Champô" ("champo" sem acento) não
// é "champ", "Desodorizante" não é "desodoriz". Resultado: 19.603 nomes dos
// catálogos recolhidos eram recusados como não-dermo — Effaclar Duo+M, Dercos,
// Klorane, desodorizantes Dove — e as integrações que criam produtos deitavam-
// -nos fora. O \b da esquerda continua a impedir casar a meio de outra palavra.
const HAIR = /\b(champ|shampoo|condicion|amaciador|capilar|cabelo|caspa|anti.?queda|leave.?in|hair|madeixa|oleo capilar|mascara capilar|serum capilar|spray capilar|styling|texturiz|alisad|caracol|frizz|keratin|queratin)/i;
const BODY = /\b(corpo|corporal|body|gel de banho|gel duche|sabonete|sabao|loca[oc]ao corporal|leite corporal|maos|pes\b|hidratante corporal|esfoliante corporal|deo|desodoriz|antitranspir|oleo corporal|manteiga corporal|autobronz|after sun|pos.?solar)/i;
const SKIN = /(\b(creme|crema|cream|serum|s[eé]rum|hidratant|rosto|facial|face|pele|solar|fotoprotector|protetor solar|sunscreen|suncreen|sun cream|limpeza|cleanser|micel|tonico|toner|olhos|contorno|antirrug|anti.?idade|anti.?aging|antimanch|peeling|esfoliant|mascara facial|mascara de rosto|\bmask\b|balsamo|baume|fluido|emulsao|bb cream|cc cream|matific|sebo|acne|imperfei|poros|nutritiv|reparador|calmante|barreira|atopic|atopi|eczema|psoriase|rosacea|patch|ampola)|\b(spf|fps)\s*\d)/i;

/**
 * @param {string} name nome do produto
 * @returns {'skincare'|'hair'|'body'|null}
 */
function classifyDermo(name) {
  const t = stripAccents(name).toLowerCase();
  if (!t.trim()) return null;
  if (EXCLUDE.test(t)) return null;
  if (HAIR.test(t)) return 'hair';
  if (BODY.test(t)) return 'body';
  if (SKIN.test(t)) return 'skincare';
  return null;
}

module.exports = { classifyDermo };
