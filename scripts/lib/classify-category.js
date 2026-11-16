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
const CUIDADO = /cieiro|protetor labial|hidratante labial|reparador labial|balsamo labial|cuidado labial|lip balm|fortalecedor de unhas|tratamento de unhas|cuticulas|unhas e cuticulas|protective lipstick|sun lipstick|(?:spf|fps) ?\d+ lipstick|lipstick (?:spf|fps)|diopti|corretor de (?:olhos|rugas|manchas|papos)|lip active|sos frio|glycerin lip/i;
// «batom hidratante» é cuidado, a não ser que traga sinal de cor (Le Phyto Rouge, acetinado, gloss…)
const BATOM_CUIDADO = /\b(?:baton|batom|stick) (?:\w+ )?(?:hidrat\w*|reparad\w*|nutrit\w*|protet\w*)/i;
const COR_LABIOS = /\b(rouge|cremoso|acetinado|matte|mate|longa duracao|duradoura|gloss|stain|lipstick|colou?r|tom|shade|brilho|lapis)\b/i;
// Maquilhagem com a categoria da loja ERRADA (2026-11-16): ~2 800 produtos com
// «skincare» continuavam no site (sombras, delineadores, batons «Rouge», bases
// «Teint», vernizes, pincéis…). Reconhece-se pelo TIPO de produto no nome, nunca
// pela palavra sozinha: «corretor de rugas», «sérum iluminador», «contorno de
// olhos», «máscara capilar», «Palette» (coloração) e «verniz para fungos» são
// cuidado. As exceções gerais estão em NAO_MAQ; as de cada família ao lado.
const MAQ_TIPO = new RegExp('\\b(' + [
  // olhos
  'eye ?shadows?', 'shadow stick', 'sombras? (?:de olhos|liquida|individual|em stick|cintilante|mono|em creme|em po)', 'stylo sombra',
  'paleta (?:de sombras|de olhos|de maquilhagem|de contorno|de blush)', 'palette d.?ombres', 'ombres? a paupieres', 'fards? a paupieres', 'luxury palette', 'better than palette', 'shade & shadow',
  'eye ?liner', 'delineador\\w*', 'kajal', 'khol', 'kohl', 'rimel',
  'mascara (?:de|para (?:as )?)(?:pestanas|cilios|sobrancelhas)', '(?:lash|volume|lengthening|waterproof|curl\\w*|brow) mascara', 'mascara (?:max|volume|lash)',
  'pestanas (?:falsas|postic\\w*)', 'cilios postic\\w*', 'false lashes', 'faked (?:volume|dramatic|ultra)', 'modelador de pestanas', 'cola de pestanas',
  '(?:gel|lapis|pomada|caneta|marcador|fixador|po|sombra|styler|tinta) (?:de |para (?:as )?|fixador de )?sobrancelhas', 'sobrancelhas lapis',
  'brow (?:gel|pencil|pen|styler|stylist|liner|pomade|glue|tamer|artist|insert|lift)', 'eye ?brow (?:pencil|sculptor|stylist|pen)', 'brow g',
  'lapis (?:de |para (?:os )?)?(?:olhos|labios|sobrancelhas|labial|contorno|delineador)', 'lapis olhos', 'crayon khol', 'afia-?lapis', 'apara-?lapis',
  // lábios
  'lipsticks?', 'batons?', 'lip ?liner', 'lip pencil', 'lip (?:colou?r|stain|glaze|lacquer|plump\\w*|ink)', '(?:matte|velvet) lip cream', 'lip cream matte','liquid lip\\w*', 'tinta (?:labial|para labios)', 'tinte para labios',
  '(?:skin|lip|cheek|eye|juicy lasting|sheer) tint', 'lip ?(?:&|and) ?cheek', 'lip idole', 'rouge (?:drama|cream|glaze|fondant|velvet|shine|allure|pur|volupte|in love)', 'absolu rouge', 'joli rouge', 'le phyto rouge', 'phyto-lip twist', 'balmy gloss', 'gloss (?:obsessed|labial)', 'lifter gloss', 'brilho (?:de )?labios',
  // pele
  'base (?:de maquilhagem|de maquillaje|fluida|liquida|compacta|em po|mineral|hidratante|com cor|matificante|lifting|cremosa|de cobertura|24 horas|brightening|teint|complexion|even better|mat & protect|pele)',
  'fond de teint', 'foundation', 'founwear', 'teint (?:idole|miracle|couture|naturel|universel)', 'eau de teint', 'phyto[ -]teint', 'phyto-hydra teint', 'skin illusion',
  'cushion (?:base|foundation|#|\\d)', '(?:red|pink|all cover) cushion', 'concealer',
  'corretor (?:de olheiras|liquido|hidratante|hd|de cobertura|camouflage|serum de cobertura)', 'camouflage', 'eraser', 'silky blur',
  'iluminador (?:de olheiras|em po|liquido|stick|compacto)', 'highlighter (?:stick|facial)', 'creamy highlighting', 'highlighting balm', 'strobing',
  'bronzer', 'bronzing (?:powder|cream|stick)', 'po (?:bronzeador|matificante|facial|translucido|de acabamento|iluminador|de sol)', '(?:compact|pressed|loose|setting|airbrush|translucent|finishing|mattifying|bronzing) powder', 'meteorites',
  'blush (?:em|liquido|compacto|stick|cream|mousse|creme|po|de rosto|affair|crush|accord)', 'liquid blush', 'baked blush', 'joli blush', 'mousse blush',
  'contour(?:ing)? (?:stick|kit|palette|powder)', 'kit de contorno', 'contorno (?:&|e) iluminador', 'wonder stick',
  'setting spray', 'fixing (?:spray|bruma|mist)', '(?:spray|bruma) fixador\\w*', 'fixador de maquilhagem', 'makeup fixing', 'fix make ?up', 'make ?up (?:cool )?fixer', 'fix and matte', 'primer', 'glitter',
  // pincéis e esponjas
  'pinceis', 'pincel', 'makeup brush', '(?:powder|blender|eyeshadow|foundation|kabuki|contour) brush', 'esponja (?:de )?(?:maquilhagem|blender|de base|aplicadora)', 'beauty blender', 'makeup sponge',
  // unhas (verniz de cor)
  'verniz', 'vernizes', 'esmaltes?', 'nail (?:lacquer|polish|colou?rs?)', 'gel polish', 'gel fusion', 'hybrid gel', 'top coat', 'base coat', 'unhas (?:artificiais|falsas|de gel)', 'gel tips', 'nail tips', 'press ?(?:&|and)? ?(?:on|go)',
  // maquilhagem dita
  'maquilhagem (?:facial|para (?:os? )?(?:olhos|labios|rosto)|de olhos|completa|de cobertura|cobertura|waterproof)', 'maquillaje', 'maquillage', 'cure make up', 'sleek makeup', 'stay-in-place makeup',
  // mais nomes vistos a 16/11
  'sombra (?:para (?:os )?olhos|olhos|em bastao)', 'sombra olhos', '(?:eye|eyeshadow|blush|contour|face|highlight\\w*) palette', '(?:powder|cream|liquid|stick) blush',
  'po fixador', 'toleriane teint', 'flexilift teint', 'dermablend', '(?:aura|fit \\w+) cushion', 'lash (?:lengthener|extender)', 'mascara (?:vinyl|wonder|high impact)',
].join('|') + ')\\b', 'i');
// cuidado, limpeza e tratamento — nunca maquilhagem, mesmo com uma palavra acima
const NAO_MAQ = /\b(desmaquilh\w*|demaquill\w*|removedor|remover|melter|limpeza|limpador|cleans\w*|micelar|acetona|esfoliante|peeling|lip (?:mask|care|balm|scrub)|bye bye makeup|fung\w*|antifung\w*|micose|tratamento|fortalec\w*|endurec\w*|reforco|nail (?:envy|shield)|cuticul\w*|silicium|roidas|quebradas|filmogel|dental|dentifric\w*|sensodyne|regenerate|tesoura|corta-?unhas|coloracao|tinta de cabelo|cabelos? grisalhos|champo|shampoo|capilar|hair|escova de dentes|caes|gatos|(?:hello,? )?good stuff|eye (?:&|and) lip cream|exfoliante|patch\w*|diopti|pensos?|serum de labios|lip serum)\b/i;
// «cuidado com cor»: BB/CC, cremes e séruns com cor, protetores solares com cor. Ficam
// no site por agora (cremes de farmácia muito comparados: o BB da Bioderma em 44 lojas);
// a decisão é do Tomás — pôr ESCONDER_CUIDADO_COM_COR a true esconde-os. As marcas só de
// maquilhagem (MARCAS_MAQ) e as bases a sério (BASE_A_SERIO) escondem-se sempre.
const ESCONDER_CUIDADO_COM_COR = false;
const CUIDADO_COM_COR = /\b(bb ?(?:cream|creme)|cc\+? ?(?:cream|creme)|(?:skin|sheer) tint|tinted (?:moisturi[sz]er|skin protector|oleo-serum|serum)|(?:hidratante|creme|serum|oleo-serum|fluido|protetor solar \w*) com cor|soin perfecteur de teint|tinted)\b/i;
const BASE_A_SERIO = /\b(base (?:de maquilhagem|fluida|liquida|compacta|em po)|foundation|fond de teint|maquillaje|maquillage|maquilhagem facial)\b/i;
// protetor solar em pó com pincel, óleo corporal com brilhos, batom de proteção solar
const SOL_OU_CORPO = /\b(fps\d*|spf\d*|uv|solar|sun|protetor|protective|oleo|corpo|corporal|body|banho)\b/i;
// sérum de pestanas/sobrancelhas é tratamento
const SERUM_PELOS = /\b(serum|soro|booster|crescimento|growth|peptide)\b.*\b(pestanas|sobrancelhas|cilios|lash\w*|brow\w*|cils)\b|\b(pestanas|sobrancelhas|cilios|lash\w*|brow\w*|cils)\b.*\b(serum|soro|booster|crescimento|growth|peptide)\b/i;
// verniz/esmalte de tratamento ou dos dentes
// (o verniz amargo é para não roer as unhas; Betalfatrus e Oliprox são de farmácia)
const UNHA_CUIDADO = /\b(fung\w*|tratamento|fortalec\w*|endurec\w*|silicium|protetor|reforco|cuticul\w*|fortificante|dent\w*|branqueador|amargo|anti-?estrias|estrias|betalfatrus|oliprox|unhas (?:fracas|frageis|quebradicas))\b/i;
// nomes da Notino: «Marca Olhos …» e «Marca Lábios …» são as secções de maquilhagem
// (o cuidado chama-se «Cuidados com os olhos/lábios»). Só quando o nome começa pela
// própria marca: «SISLEY Olhos Phyto Khol», não «Colírio iVision para olhos secos».
const notinoOlhosLabios = (t, brand) => { const m = sa(brand).trim(); return m.length > 1 && (t.startsWith(m + ' olhos ') || t.startsWith(m + ' labios ')); };
const NOTINO_CUIDADO = /\b(patch\w*|pads?|eye mask|mascara de olhos|creme|gel de olhos|contorno|bals\w*|hidra-?balsamo|oleo de labios|esfoliante|lip balm|treatment|tratamento|hidrat\w*|reparad\w*|protet\w*|nutrit\w*|cuidado)\b/;
// marcas só de maquilhagem (medido a 16/11: o resto delas é limpeza ou cuidado, que NAO_MAQ e CUIDADO apanham)
const MARCAS_MAQ = new Set([
  'essence', 'catrice', 'maybelline', 'maybelline new york', 'flormar', 'nyx', 'nyx professional makeup', 'nyx professional make up',
  'bourjois', 'bell', 'bell hypoallergenic', 'hypoallergenic', 'eyecare', 'eye care', 'mb milano', 'max factor', 'rimmel', 'rimmel london',
  'wet n wild', 'sleek', 'urban decay', 'morphe', 'sigma beauty', 'clio', 'rom nd', 'romand', 'fwee', 'benefit',
  'mia laurens', 'mia cosmetics', 'magic studio', 'nars', 'nars cosmetics', 'mac cosmetics', 'mac', 'l a girl', 'la girl',
  'kiko', 'kiko milano', 'too faced', 'anastasia beverly hills', 'huda beauty', 'fenty beauty', 'makeup revolution', 'inocos',
]);
const marcaNorm = b => sa(b).replace(/&/g, ' ').replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();

function maqPorContexto(name, brand, category) {
  const t = sa(name);
  if (category === 'hair' || category === 'perfume' || NAO_MAQ.test(t) || SERUM_PELOS.test(t)) return false;
  if (CABELO_PRO.test(sa(brand))) return false;
  if (!ESCONDER_CUIDADO_COM_COR && CUIDADO_COM_COR.test(t) && !BASE_A_SERIO.test(t)) return MARCAS_MAQ.has(marcaNorm(brand));
  const tipo = t.match(MAQ_TIPO);
  if (tipo) {
    const k = tipo[1];
    if (/^(verniz|vernizes|esmaltes?)$/.test(k) && UNHA_CUIDADO.test(t)) return false;
    if (/^(pincel|pinceis|glitter|lipsticks?|batons?|bronzer|primer)$/.test(k) && SOL_OU_CORPO.test(t)) return false;
    return true;
  }
  if (notinoOlhosLabios(t, brand) && !NOTINO_CUIDADO.test(t)) return true;
  return MARCAS_MAQ.has(marcaNorm(brand));
}

function eMaquilhagem(name, category, brand) {
  const t = sa(name);
  if (CUIDADO.test(t) || (BATOM_CUIDADO.test(t) && !COR_LABIOS.test(t))) return false;
  if (fixCategory(name, null, brand) === 'makeup' || MAQ_FORTE.test(t)) return true;
  if (category === 'makeup' && MAQ_NOME.test(t) && !CABELO_PRO.test(sa(brand)) && fixCategory(name, null, brand) !== 'hair') return true;
  return maqPorContexto(name, brand, fixCategory(name, category, brand));
}

module.exports = { fixCategory, eMaquilhagem, maqPorContexto };

