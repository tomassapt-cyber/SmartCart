// Correções às VARIANTES de volume — bugs de extração dos scrapers.
//
// PORQUÊ ESTA LIB (2026-07-29): estas duas correções viviam inline no
// scripts/inject-seed-into-demo.js, ou seja só o SITE as aplicava. O
// scripts/push-catalog-to-db.js não, por isso a BD — e com ela o app.html —
// servia os preços ERRADOS que o site já corrige. Apanhado por uma auditoria
// independente ao que está em produção:
//   · 43 variantes com o preço de OUTRO produto (o chip de volume mostrava o
//     preço de um produto relacionado que o scraper apanhou por engano);
//   · variantes com o preço truncado ao inteiro (29 € em vez de 29,74 €) — o
//     app anunciava mais barato do que a loja cobra.
// Mesmo padrão do verified-shipping.js / catalog-visibility.js /
// name-translations.js: uma definição, dois consumidores.
//
// NÃO-destrutivo: muta o seed EM MEMÓRIA; o data/seed-bundle.json fica intacto.
// A lógica é a que estava no inject, movida SEM alterações — a prova é o
// conteúdo do seed injectado sair idêntico.

/**
 * Repõe preços de variante truncados ao inteiro.
 * Bug do scraper da Wells (e afins): a extração por DOM apanha às vezes o preço
 * sem decimais (7,98 € → 7). Como o cartão usa o preço da VARIANTE ao volume de
 * referência, isso mostra um preço mais baixo do que o real. O preço do item
 * (item.price) vem do JSON-LD e é fiável: numa oferta de UMA só variante, se o
 * preço da variante é um inteiro igual ao floor do item.price (não-inteiro),
 * repõe-se o item.price.
 */
function fixTruncatedVariantPrices(seedJson) {
  let fixed = 0;
  for (const sp of seedJson.store_products) {
    for (const it of sp.items) {
      if (!Array.isArray(it.variants) || it.variants.length !== 1 || !(it.price > 0)) continue;
      const v = it.variants[0];
      if (v.price != null && Number.isInteger(v.price) && !Number.isInteger(it.price) && Math.floor(it.price) === v.price) {
        v.price = it.price;
        if (it.previous_price) v.previous_price = it.previous_price;
        fixed++;
      }
    }
  }
  return { fixed };
}

/**
 * Remove variantes que são, na verdade, OUTRO produto.
 * Bug de scrapers (SweetCare/Druni/Wells): a extração de variantes por DOM às
 * vezes apanha um PRODUTO RELACIONADO como se fosse uma "variante" de volume.
 * Ex.: Bioderma Sensibio H2O (água micelar) trazia uma "variante 40ml" a 24€
 * que era o Sensibio AR BB Cream. Assinatura fiável e CONSERVADORA: a variante
 * intrusa tem um URL DIFERENTE da maioria E viola a monotonia de volume (volume
 * MENOR mas preço MAIOR que uma variante de volume MAIOR que partilha o
 * URL-maioria). Só assim se apaga — evita apanhar tamanhos legítimos (que
 * partilham o URL) ou promoções (que não têm URL discordante).
 */
function dropWrongProductVariants(seedJson) {
  let dropped = 0;
  for (const sp of seedJson.store_products) {
    for (const it of sp.items) {
      const vs = (it.variants || []).filter(v => v.url && v.volume_ml > 0 && v.price > 0);
      if (vs.length < 2) continue;
      const cnt = {};
      for (const v of vs) cnt[v.url] = (cnt[v.url] || 0) + 1;
      const mode = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      if (mode[1] < 2) continue;                       // sem URL-maioria clara
      const majVars = vs.filter(v => v.url === mode[0]);
      const toDrop = new Set();
      for (const v of vs) {
        if (v.url === mode[0]) continue;               // parte da maioria → mantém
        // URL discordante: apaga se um volume MAIOR da maioria custa MENOS.
        if (majVars.some(w => w.volume_ml > v.volume_ml && w.price < v.price * 0.95)) toDrop.add(v);
      }
      if (toDrop.size) {
        it.variants = it.variants.filter(v => !toDrop.has(v));
        dropped += toDrop.size;
      }
    }
  }
  return { dropped };
}

/**
 * Tamanhos de variante mal lidos (2026-10-19). O site compara as lojas ao
 * tamanho da ficha e só aceita a variante com o MESMO volume_ml — que tem de
 * estar sempre em ml ou g. Três erros de scraper partiam essa comparação
 * (apanhados pelo Codex a validar o SEO: o modal e o «desde» discordavam):
 *   1. LITROS/QUILOS sem converter: {volume_ml: 1, unit: 'kg'} é 1000 g. De 20
 *      para cima o número já vem em ml/g («1000 l» = 1000 ml) e só a unidade
 *      está errada. Acima de 10 000 não é um tamanho — escovas a «90000 l»,
 *      tons de sombra a «101000 l» — e a variante sai.
 *   2. «1 KG» LIDO COMO 1: a máscara Novex de 1 kg da Smart Beauty ficava
 *      {volume_ml: 1, unit: 'ml'}. Prova: o URL da PRÓPRIA variante diz «-1kg»,
 *      «-1-kg» ou «-1-5-kg». Intervalos («fraldas 7-11kg», «cão 2-10kg»),
 *      «até 8kg» e «+8kg» são o peso do bebé ou do animal e não contam.
 *   3. PACKS COM BRINDE: «SVR Sebiaclear 40ml + Oferta Gel 55ml» ficava com a
 *      variante de 55 ml, o tamanho do brinde. Numa oferta de UMA variante, se
 *      ela tem o tamanho que vem depois do «+ oferta» e não o primeiro tamanho
 *      do nome (o volume de referência do site), passa a ter o primeiro.
 * Nunca cria duas variantes do mesmo tamanho na mesma oferta: se o tamanho
 * certo já lá está, a variante fica como estava.
 */
const UNIDADE_GRANDE = /^(l|lt|litro|litros|kg)$/i;
// «1kg», «1-kg», «1-5-kg», «1,5l» no URL — sem ser intervalo, «até», «+» ou «>»
const TAMANHO_GRANDE_NO_URL = /(?<![a-z0-9])(?<!\d[-_.,])(?<!\d-a-)(?<!(?:ate|até|mais|max|min|de)[-_])(?<![>+])(\d+(?:[.,_-]\d)?)[-_]?(kg|l|lt|litro|litros)(?![a-z0-9])/g;
const BRINDE = /\+\s*(?:uma\s+|1\s+)?(?:oferta|gr[aá]tis|brinde|offer|gift|free)\b(.*)$/i;
const VOLUME = /(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i;

/** o primeiro tamanho de um texto, em ml/g — o mesmo cálculo do _volFromName do site */
function volumeDoTexto(texto) {
  const m = String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').match(VOLUME);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.')), u = m[2].toLowerCase();
  return { ml: (u === 'l' || u === 'kg') ? n * 1000 : n, unit: (u === 'kg' || u === 'g' || u === 'gr') ? 'g' : 'ml' };
}

function fixVariantSizes(seedJson) {
  const nomes = new Map((seedJson.products || []).map(p => [String(p.ean), p.name || '']));
  let litros = 0, kgNoUrl = 0, brindes = 0, removidas = 0;
  for (const sp of seedJson.store_products) {
    for (const it of sp.items) {
      if (!Array.isArray(it.variants) || !it.variants.length) continue;
      const ocupado = ml => it.variants.some(w => w.volume_ml === ml);

      // 1. litros/quilos
      const fora = new Set();
      for (const v of it.variants) {
        if (!UNIDADE_GRANDE.test(String(v.unit || '')) || !(v.volume_ml > 0)) continue;
        const pequena = /^kg$/i.test(v.unit) ? 'g' : 'ml';
        if (v.volume_ml > 10000) { fora.add(v); continue; }
        if (v.volume_ml >= 20) { v.unit = pequena; litros++; continue; }
        const certo = Math.round(v.volume_ml * 1000);
        if (ocupado(certo)) continue;
        v.volume_ml = certo; v.unit = pequena; litros++;
      }
      if (fora.size) { it.variants = it.variants.filter(v => !fora.has(v)); removidas += fora.size; }

      // 2. «1 kg» lido como 1 — prova no URL da própria variante
      for (const v of it.variants) {
        if (UNIDADE_GRANDE.test(String(v.unit || '')) || !(v.volume_ml >= 1 && v.volume_ml <= 5) || !v.url) continue;
        const url = String(v.url).toLowerCase().split(/[?#]/)[0];
        const m = [...url.matchAll(TAMANHO_GRANDE_NO_URL)]
          .find(x => parseFloat(x[1].replace(/[_-]/, '.').replace(',', '.')) === v.volume_ml);
        if (!m) continue;
        const certo = Math.round(v.volume_ml * 1000);
        if (ocupado(certo)) continue;
        v.volume_ml = certo; v.unit = m[2] === 'kg' ? 'g' : 'ml'; kgNoUrl++;
      }

      // 3. packs com brinde
      if (it.variants.length !== 1) continue;
      const nome = nomes.get(String(it.ean)) || '';
      const b = nome.match(BRINDE);
      if (!b) continue;
      const ref = volumeDoTexto(nome), doBrinde = volumeDoTexto(b[1]);
      const v = it.variants[0];
      if (!ref || !doBrinde || ref.ml === doBrinde.ml || v.volume_ml !== doBrinde.ml) continue;
      v.volume_ml = ref.ml; v.unit = ref.unit; brindes++;
    }
  }
  return { litros, kgNoUrl, brindes, removidas };
}

/**
 * Tamanhos que não batem com o preço (2026-11-06). A ficha passa a abrir no
 * tamanho de melhor €/L (#126), e um tamanho mal lido parece uma pechincha:
 *   1. VÍRGULA PERDIDA — «7,5 ml» lido como 75 (×10) ou 750 (×100). A variante
 *      10×/100× maior do que outro tamanho do MESMO produto (noutra variante,
 *      em qualquer loja, ou no nome) e que custa menos de 3× esse tamanho sai.
 *      Ex.: Cicaplast Lábios 7,5 ml com «75 ml» a 8,49 €; Si-Nails 4,5 → «45 ml».
 *   2. MESMO PREÇO, TAMANHOS DIFERENTES na mesma oferta — a loja (ou o leitor)
 *      não mudou o preço com o tamanho: fica o tamanho do nome, se lá estiver,
 *      ou o mais pequeno; saem os maiores com esse mesmo preço.
 *      Ex.: Wells, Volume Lift Shampoo 75 ml e 250 ml ambos a 2,40 €.
 *   3. OFERTA SÓ COM O TAMANHO ERRADO (apagá-lo deixava-a vazia): passa ao tamanho
 *      do nome quando o preço o confirma — vírgula perdida, ou um tamanho 3× maior
 *      do que o do nome ao preço do tamanho do nome (noutra loja).
 * Uma oferta nunca fica sem variantes por causa disto.
 */
/**
 * Fichas-família (2026-11-16, ponto 5 da auditoria): produtos DIFERENTES da mesma
 * gama entram na ficha como se fossem «tamanhos». Ex.: o Sensibio DS+ Creme 40 ml
 * com um «200 ml» que é o DS+ Gel Moussant; o Oleoban Bebé Creme com um champô e um
 * gel de limpeza; o Effaclar H Iso-Biome creme (40 ml) com a oferta do gel (200/390).
 * Vêm de páginas da loja casadas pelo nome (sem o tamanho) e o dropWrongProductVariants
 * não as apanha quando o preço não desmente o tamanho.
 *
 * O sinal é o TIPO de produto (creme, gel, espuma, óleo, sérum, fluido, leite/loção,
 * água/tónico, spray, bálsamo, máscara, champô, condicionador, sabonete, stick):
 *   1. VARIANTE de OUTRA página (url ≠ o da oferta) cujo endereço diz um tipo que o
 *      nome da ficha não tem → sai. Se o preço da oferta era o dela, passa ao mais
 *      barato das que ficam; se não fica nenhuma, a oferta sai.
 *   2. OFERTA INTEIRA, só com duas provas: o endereço diz outro tipo E nenhum dos
 *      seus tamanhos é o tamanho em que as outras lojas concordam (≥5 lojas, ≥80%).
 * Sinónimos que as lojas trocam entre si não contam como conflito: bálsamo =
 * condicionador (cabelo) = stick (lábios), água = spray (eau solaire), fluido =
 * leite/emulsão, gel = espuma, creme = bálsamo.
 */
const TIPOS = {
  creme: /\b(creme|cream|crema|cremoso|cr)\b/, gel: /\b(gel|gelee|geleia|jelly)\b/, espuma: /\b(espuma|mousse|moussant|foam|foaming|espumoso)\b/,
  oleo: /\b(oleo|oil|huile|aceite)\b/, serum: /\b(serum|soro)\b/, fluido: /\b(fluido|fluid|fluide|emulsao|emulsion)\b/,
  leite: /\b(leite|lait|milk|locao|lotion)\b/, agua: /\b(agua|water|eau|micelar|micellar|tonico|tonica|tonic|toner)\b/, spray: /\b(spray|bruma|mist)\b/,
  balsamo: /\b(balsamo|balm|baume|unguento)\b/, mascara: /\b(mascara|mask|masque)\b/, champo: /\b(champo|shampoo|champu)\b/,
  condic: /\b(condicionador|conditioner|amaciador|acondicionador)\b/, sabonete: /\b(sabonete|soap|savon)\b/, stick: /\b(stick|barra)\b/,
};
const SINONIMOS = [['balsamo', 'condic'], ['balsamo', 'stick'], ['agua', 'spray'], ['fluido', 'leite'], ['gel', 'espuma'], ['creme', 'balsamo']];
const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function tiposDe(texto) { const t = semAcento(texto); const s = new Set(); for (const [k, r] of Object.entries(TIPOS)) if (r.test(t)) s.add(k); return s; }
function tiposEmConflito(daFicha, doUrl) {
  if (!daFicha.size || !doUrl.size) return false;
  for (const a of daFicha) for (const b of doUrl) if (a === b || SINONIMOS.some(([x, y]) => (a === x && b === y) || (a === y && b === x))) return false;
  return true;
}
// «limpeza» é uma marca à parte: o creme de limpeza não é o creme hidratante da gama
// (com as abreviaturas e traduções dos endereços: «limp», «lavant», «limpiadora»,
// «douche», «desmaq»; a água micelar e a higiene íntima também são limpeza)
const LIMPEZA = /\b(limp\w*|lavant\w*|lavagem|cleans\w*|nettoy\w*|wash|duche|douche|banho|desmaq\w*|demaq\w*|micelar|micellar|higiene)\b/;
// Só o pedaço do endereço que é o produto (o com mais letras): as categorias do
// caminho («/beleza-e-higiene/desodorizantes/…») não dizem o que o produto é.
// Sem as palavras da marca: «Bio-Oil Loção Corporal» não é um óleo.
function marcasDoUrl(url, marca) {
  try {
    const partes = semAcento(decodeURIComponent(new URL(url).pathname)).split('/').filter(Boolean);
    // o último pedaço com letras a sério (o que vem depois é o id: «/…-100-ml/124404.html»)
    let t = [...partes].reverse().find(x => x.replace(/[^a-z]/g, '').length >= 8) || partes[partes.length - 1] || '';
    t = ' ' + t.replace(/\.html?$/, '').replace(/[-_.+]+/g, ' ') + ' ';
    t = t.split(/ (?:oferta|offer|gift|brinde|gratis|free) /)[0] + ' ';          // o brinde não é o produto
    t = t.replace(/ (?:eau therm\w*|agua termal) /g, ' ');                          // nome de gama, não água
    for (const w of semAcento(marca).split(/[^a-z0-9]+/).filter(x => x.length > 1)) t = t.replace(new RegExp(' ' + w + ' ', 'g'), ' ');
    return { tipos: tiposDe(t), limpeza: LIMPEZA.test(t) };
  } catch { return { tipos: new Set(), limpeza: false }; }
}
// limpeza num só sentido: a página é de limpeza e a ficha não (o creme de limpeza na
// ficha do creme hidratante); o contrário é só o nome curto da loja («gel moussant»)
// Devolve 'tipo' (tipos que não batem), 'limpeza' (só a marca de limpeza) ou null.
function emConflito(perfil, doUrl) {
  if (tiposEmConflito(perfil.tipos, doUrl.tipos)) return 'tipo';
  return perfil.tipos.size > 0 && doUrl.tipos.size > 0 && doUrl.limpeza && !perfil.limpeza ? 'limpeza' : null;
}

function dropFamilyVariants(seedJson) {
  const nomes = new Map((seedJson.products || []).map(p => [String(p.ean), p.name || '']));
  const marcas = new Map((seedJson.products || []).map(p => [String(p.ean), p.brand || '']));
  // o tamanho em que as lojas concordam (ofertas de UM só tamanho)
  const contagem = new Map();
  for (const sp of seedJson.store_products) for (const it of sp.items) {
    const vs = (it.variants || []).filter(v => v.volume_ml > 0);
    if (vs.length !== 1) continue;
    const m = contagem.get(it.ean) || contagem.set(it.ean, new Map()).get(it.ean);
    m.set(vs[0].volume_ml, (m.get(vs[0].volume_ml) || 0) + 1);
  }
  const consenso = ean => {
    const m = contagem.get(ean); if (!m) return null;
    let total = 0, melhor = null, n = 0;
    for (const [v, c] of m) { total += c; if (c > n) { n = c; melhor = v; } }
    return total >= 5 && n / total >= 0.8 ? melhor : null;
  };
  // o que a ficha é: o tipo do NOME; se o nome não o diz («Effaclar H Iso-Biome»), o
  // tipo em que concordam os endereços das ofertas (≥5 com tipo, ≥60% de acordo)
  const doUrlDe = new Map();
  for (const sp of seedJson.store_products) for (const it of sp.items) if (it.url) (doUrlDe.get(it.ean) || doUrlDe.set(it.ean, []).get(it.ean)).push(marcasDoUrl(it.url, marcas.get(String(it.ean))));
  const perfis = new Map();
  const perfilDe = ean => {
    if (perfis.has(ean)) return perfis.get(ean);
    const nome = ' ' + semAcento(nomes.get(String(ean))).replace(/[^a-z0-9]+/g, ' ') + ' ';
    const nomeLimpo = nome.replace(/ (?:eau therm\w*|agua termal) /g, ' ');
    const tipos = tiposDe(nomeLimpo);
    const urls = (doUrlDe.get(ean) || []).filter(m => m.tipos.size);
    let limpeza = LIMPEZA.test(nome);
    if (urls.length >= 5) {
      if (!tipos.size) {
        const n = {}; for (const m of urls) for (const k of m.tipos) n[k] = (n[k] || 0) + 1;
        for (const [k, c] of Object.entries(n)) if (c / urls.length >= 0.6) tipos.add(k);
      }
      if (!limpeza) limpeza = urls.filter(m => m.limpeza).length / urls.length >= 0.5;
    }
    const perfil = { tipos, limpeza };
    perfis.set(ean, perfil);
    return perfil;
  };
  let variantes = 0, ofertas = 0;
  for (const sp of seedJson.store_products) {
    const fora = new Set();
    for (const it of sp.items) {
      const perfil = perfilDe(it.ean);
      if (!perfil.tipos.size) continue;
      // 1. variantes de outra página com outro tipo
      const vs = it.variants || [];
      // (só o tipo: a marca «limpeza» é fraca de mais sem a prova do tamanho)
      const intrusas = vs.filter(v => v.url && v.url !== it.url && tiposEmConflito(perfil.tipos, marcasDoUrl(v.url, marcas.get(String(it.ean))).tipos));
      if (intrusas.length) {
        const ficam = vs.filter(v => !intrusas.includes(v));
        variantes += intrusas.length;
        if (!ficam.length) { fora.add(it); continue; }
        it.variants = ficam;
        if (intrusas.some(v => Math.abs(v.price - it.price) < 0.005)) {
          const precos = ficam.filter(v => v.price > 0 && v.in_stock !== false).map(v => v.price);
          const todos = ficam.filter(v => v.price > 0).map(v => v.price);
          const novo = precos.length ? Math.min(...precos) : todos.length ? Math.min(...todos) : null;
          if (novo) it.price = novo; else fora.add(it);
        }
      }
      // 2. a oferta inteira é outro produto da gama
      const c = consenso(it.ean);
      const tams = (it.variants || []).filter(v => v.volume_ml > 0).map(v => v.volume_ml);
      if (c && tams.length && !tams.some(t => Math.abs(t - c) / c <= 0.06)) {
        const k = emConflito(perfil, marcasDoUrl(it.url, marcas.get(String(it.ean))));
        // só a marca de limpeza: precisa de um tamanho bem longe (o creme de limpeza de
        // 200/390 ml na ficha do creme de 40 ml), não o mesmo produto noutro frasco
        if (k === 'tipo' || (k === 'limpeza' && tams.every(t => t >= 3 * c || t <= c / 3))) fora.add(it);
      }
    }
    if (fora.size) { sp.items = sp.items.filter(it => !fora.has(it)); ofertas += fora.size; }
  }
  return { variantes, ofertas };
}

function dropImplausibleSizes(seedJson) {
  // fichas-família primeiro: um tamanho de outro produto também desmentiria os outros
  const familia = dropFamilyVariants(seedJson);
  const volNome = new Map();
  for (const p of seedJson.products || []) { const v = volumeDoTexto(p.name); if (v) volNome.set(String(p.ean), v.ml); }
  // preço mais baixo por produto e tamanho, em todas as lojas
  const minPor = new Map();
  for (const sp of seedJson.store_products) for (const it of sp.items) for (const v of it.variants || []) {
    if (!(v.volume_ml > 0) || !(v.price > 0)) continue;
    const k = it.ean + '|' + v.volume_ml;
    if (!(minPor.get(k) <= v.price)) minPor.set(k, v.price);
  }
  const tamanhosDe = new Map();
  for (const k of minPor.keys()) { const [e, ml] = k.split('|'); (tamanhosDe.get(e) || tamanhosDe.set(e, new Set()).get(e)).add(+ml); }
  const fator = (a, b) => [10, 100].some(f => Math.abs(a / b - f) / f < 0.02);
  let virgula = 0, mesmoPreco = 0, corrigidos = 0;
  for (const sp of seedJson.store_products) {
    for (const it of sp.items) {
      const vs = (it.variants || []).filter(v => v.volume_ml > 0 && v.price > 0);
      if (!vs.length) continue;
      const ref = volNome.get(String(it.ean));
      const outros = tamanhosDe.get(String(it.ean)) || new Set();
      // 1. vírgula perdida
      const daVirgula = new Set();
      for (const v of vs) {
        const base = [...outros, ...(ref ? [ref] : [])].find(b => b < v.volume_ml && fator(v.volume_ml, b));
        if (base == null) continue;
        const pBase = minPor.get(it.ean + '|' + base) ?? (ref === base ? it.price : null);
        if (pBase > 0 && v.price < 3 * pBase) daVirgula.add(v);
      }
      // 2. mesmo preço em tamanhos diferentes
      const doPreco = new Set();
      const porPreco = new Map();
      for (const v of vs) if (!daVirgula.has(v)) { const k = Math.round(v.price * 100); (porPreco.get(k) || porPreco.set(k, []).get(k)).push(v); }
      for (const grupo of porPreco.values()) {
        const tams = [...new Set(grupo.map(v => v.volume_ml))];
        if (tams.length < 2 || Math.max(...tams) < 1.5 * Math.min(...tams)) continue;
        const fica = tams.includes(ref) ? ref : Math.min(...tams);
        for (const v of grupo) if (v.volume_ml !== fica) doPreco.add(v);
      }
      const fora = new Set([...daVirgula, ...doPreco]);
      if (fora.size && fora.size < it.variants.length) {
        it.variants = it.variants.filter(v => !fora.has(v));
        virgula += daVirgula.size; mesmoPreco += doPreco.size;
        continue;
      }
      // 3. a oferta só tem tamanhos errados (apagá-los deixava-a vazia): o tamanho do
      //    NOME manda, quando o preço o confirma — vírgula perdida (×10/×100), ou um
      //    tamanho 3× maior do que o do nome ao preço do tamanho do nome.
      if (!ref || it.variants.length !== 1) continue;
      const v = it.variants[0];
      if (!(v.volume_ml > 0) || v.volume_ml === ref) continue;
      const pRef = minPor.get(it.ean + '|' + ref);
      const confirma = daVirgula.has(v) || (v.volume_ml >= 3 * ref && pRef > 0 && v.price < 1.5 * pRef);
      if (confirma) { v.volume_ml = ref; corrigidos++; }
    }
  }
  return { virgula, mesmoPreco, corrigidos, familiaVariantes: familia.variantes, familiaOfertas: familia.ofertas };
}

module.exports = { fixVariantSizes, fixTruncatedVariantPrices, dropWrongProductVariants, dropImplausibleSizes, dropFamilyVariants, tiposDe, tiposEmConflito };
