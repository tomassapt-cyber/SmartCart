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
function fixCategory(name, current) {
  const t = sa(name);
  if (MAKEUP.test(t)) return 'makeup';
  if (PERFUME.test(t) && !SEM_PERF.test(t)) return 'perfume';
  if (HAIR.test(t)) return 'hair';
  if (BODY.test(t) && !FACE.test(t)) return 'body';
  return current || null;
}

module.exports = { fixCategory };
