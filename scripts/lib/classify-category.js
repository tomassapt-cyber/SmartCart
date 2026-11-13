// Correção de categoria por sinal FORTE no nome (2026-07-24).
//
// A categoria de origem vem da loja (slug/breadcrumb) e é, na maioria, boa —
// por isso é a BASE. Esta função só a SUBSTITUI quando o nome traz um sinal
// inequívoco de outra categoria (ex.: "Body Scrub" mal arrumado em skincare,
// "Eau de Toilette" em skincare, "Lip Gloss" em skincare, "Hair Serum" em
// skincare). Política deliberada:
//   • só PROMOVE para makeup/perfume/hair/body (sinais que não deixam dúvidas);
//   • NUNCA força skincare — o "solar corporal" (Body Milk SPF) fica como a loja
//     o classificou, evitando a guerra SPF-vs-corporal que dava falsos positivos;
//   • sem sinal forte → devolve a categoria da loja intacta.
// Auditada sobre o seed vivo: ~2 mil correções, todas validadas por amostragem.

const { linhaDoPerfume } = require('./perfumes-selecao');

const sa = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// "blush" NÃO entra sozinho: é nome de flanker de perfume ("Good Girl Blush"),
// de body lotion ("Dylan Blush Pink") e de acessórios ("pincel para blush") —
// só conta como maquilhagem quando vem colado ao tipo de produto (blush em pó/
// creme/líquido) ou é "blush de rosto".
const MAKEUP = /\b(batom|batons|lip ?gloss|gloss labial|rimel|rimmel|mascara de pestanas?|eyeliner|delineador de olhos|lapis de olhos?|lapis de labios|sombra de olhos|paleta de sombras|blush (?:em po|em creme|liquido|compacto|de rosto)|corretor de olheiras|concealer|base de maquilhagem|foundation|po compacto|po solto|verniz de unhas|esmalte de unhas|nail polish|iluminador facial|highlighter facial|lip ?liner|labial liquido)\b/i;
const PERFUME = /\b(eau de parfum|eau de toilette|eau de cologne|edt|edp|extrait de parfum|agua de colonia|body mist)\b/i;
const SEM_PERF = /sem perfume|com perfume|perfumad|nao perfumad|desodoriz/i;
const HAIR = /\b(champo|champos|shampoo|condicionador|acondicionador|amaciador|anti.?caspa|caspa|anti.?queda|leave.?in|oleo capilar|mascara capilar|serum capilar|hair serum|spray capilar|frizz|keratin|queratin|coloracao capilar|tinta para cabelo|laca de cabelo|mousse capilar)\b/i;
const BODY = /\b(gel de banho|gel de duche|gel duche|sabonete|leite corporal|loca[oc]ao corporal|hidratante corporal|esfoliante corporal|body scrub|body lotion|body cream|body milk|body butter|oleo corporal|manteiga corporal|creme de maos|hand cream|creme de pes|creme corporal|desodoriz|antitranspir|autobronz|higiene intima|corporal|body wash)\b/i;
const FACE = /\bfacial|rosto|face\b/i;

// Devolve a categoria corrigida (ou a atual, se não houver sinal forte).
// brand (opcional, 2026-11-06): um perfume da seleção (data/perfumes-selecao.json:
// marca + linha + palavra de fragrância) é perfume mesmo sem «Eau de…» no nome —
// «Terre d'Hermès Parfum Recarga», «Happy Heart parfum spray» ficavam em skincare.
function fixCategory(name, current, brand) {
  const t = sa(name);
  if (MAKEUP.test(t)) return 'makeup';
  if (PERFUME.test(t) && !SEM_PERF.test(t)) return 'perfume';
  if (linhaDoPerfume({ name, brand })) return 'perfume';
  if (HAIR.test(t)) return 'hair';
  if (BODY.test(t) && !FACE.test(t)) return 'body';
  // «makeup» da loja só fica se o nome o confirmar (2026-11-13): suplementos, sprays
  // nasais e óleos capilares vinham com essa categoria
  if (current === 'makeup' && !(MAQ_NOME.test(t) && !CABELO_PRO.test(sa(brand)))) return null;
  return current || null;
}

// Maquilhagem FORA do site (decisão do Tomás, 2026-11-13): «não quero nada de
// maquilhagem, apenas produtos de cosmética e perfumes» — tons e acabamentos
// comparam mal e enchem o catálogo de fichas com uma só loja.
// É maquilhagem: sinal forte no nome (MAKEUP, o mesmo do fixCategory), ou a
// categoria «makeup» da loja CONFIRMADA por uma palavra de maquilhagem no nome
// (a categoria sozinha erra: «Bêlisina Forte Ampolas» vinha como makeup).
// O cuidado dos lábios e das unhas é cosmética, não maquilhagem.
const MAQ_NOME = /\b(rouge|blush|bronzer|primer|pincel|pinceis|esponjas?|puff|sobrancelhas?|brow|lip ?gloss|gloss|tint|liptint|lapis|sombras?|eyeshadow|paleta|palette|iluminador|highlighter|corretor|corrector|concealer|base|bases|foundation|teint|po compacto|po solto|powder|delineador|eyeliner|mascara|rimel|lash|verniz|batom|lipstick|labios|maquilhagem|make-?up)\b/i;
// marcas de cabelo profissional: «gloss», «color» e afins são produtos capilares
const CABELO_PRO = /\b(redken|kerastase|l'?oreal professionnel|wella|schwarzkopf|matrix|joico|davines|olaplex)\b/i;
// sinais fortes que o MAKEUP do fixCategory não tem (só usados aqui)
const MAQ_FORTE = /\b(base (?:compacta|fluida|liquida|em po)|fond de teint|couvrance)\b/i;
const CUIDADO = /cieiro|protetor labial|hidratante labial|reparador labial|balsamo labial|cuidado labial|lip balm|fortalecedor de unhas|tratamento de unhas|cuticulas|unhas e cuticulas/i;
function eMaquilhagem(name, category, brand) {
  const t = sa(name);
  if (CUIDADO.test(t)) return false;
  if (fixCategory(name, null, brand) === 'makeup' || MAQ_FORTE.test(t)) return true;
  return category === 'makeup' && MAQ_NOME.test(t) && !CABELO_PRO.test(sa(brand)) && fixCategory(name, null, brand) !== 'hair';
}

module.exports = { fixCategory, eMaquilhagem };
