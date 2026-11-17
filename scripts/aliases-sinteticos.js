#!/usr/bin/env node
/**
 * CosMath — juntar as fichas sem EAN às fichas com EAN do mesmo produto
 * (2026-11-16, ponto 6 da ordem de trabalho da auditoria de 06/11)
 * ==========================================================================
 * A SweetCare e a Wells não publicam o EAN: cada produto delas fica numa ficha com
 * um código inventado (sweetcare-…, wells-…) e quase sempre com uma só loja — ~17
 * mil fichas visíveis assim. Muitas são produtos que já comparamos com o EAN.
 *
 * Este passo gera data/product-aliases-auto.json (código inventado → EAN). A fusão
 * faz-se na PUBLICAÇÃO, pelo mesmo mecanismo dos aliases manuais
 * (scripts/dedup-ean-variants.js → lerAliases): o integrador da loja pode voltar a
 * criar a ficha com o código dela em cada corrida, sem estragar nada. Os aliases
 * manuais (data/product-aliases.json) mandam sobre estes.
 *
 * Só junta com TODAS as provas:
 *   • a mesma marca e um tamanho em comum (±6%, do nome ou das ofertas);
 *   • nomes parecidos (palavras sem a marca: Jaccard ≥ 0,7) e o melhor candidato
 *     com folga sobre o segundo (≥ 0,15);
 *   • nada que diga «outro produto»: sinalDeProdutoDiferente (quantidades, SPF…),
 *     variantes opostas, tipo em conflito (creme ≠ gel…), limpeza ≠ tratamento,
 *     e as palavras de versão/tom iguais dos dois lados (Plus, Light, Noite,
 *     Homem, Bebé, Duo, Recarga, Claro/Médio/Escuro…);
 *   • nomes curtos ou vagos (menos de 3 palavras) só com as palavras todas iguais;
 *   • a loja da ficha sem EAN não vende já o produto com EAN noutra página, e não
 *     há duas fichas da mesma loja a cair no mesmo produto.
 * Só cosmética que o site mostra (sem maquilhagem nem não-cosméticos).
 *
 * Uso: node scripts/aliases-sinteticos.js [--dry-run] [--amostra=N]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { eMaquilhagem } = require('./lib/classify-category');
const { isNonCosmetic, normalizeBrand, canonicalName, sinalDeProdutoDiferente, extractVolumeMl } = require('./lib/product-fingerprint');
const { tiposDe, tiposEmConflito } = require('./lib/variant-fixes');
const { variantesOpostas } = require('./juntar-por-cnp');

const ROOT = path.resolve(__dirname, '..');
const SAIDA = path.join(ROOT, 'data', 'product-aliases-auto.json');
const LIMIAR = 0.7, FOLGA = 0.15;
const eanReal = e => /^\d{8,14}$/.test(String(e || ''));
const sa = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const LIMPEZA = /\b(limp\w*|lavant\w*|cleans\w*|wash|duche|douche|banho|desmaq\w*|micelar|micellar)\b/;
// palavras que fazem de um produto OUTRO produto da mesma linha, já com os sinónimos juntos
const VERSAO = [
  [/\bplus\b|(?<!\d)\+(?=\s|$)/, 'plus'],   // «SPF 50+» não é a versão Plus
  // 2026-11-17: estas três estavam por engano dentro do comentário acima e nunca contavam
  [/\b(light|lite|leger|ligeir[oa])\b/, 'light'], [/\bultra\b/, 'ultra'], [/\b(intens\w*)\b/, 'intens'],
  [/\bforte\b/, 'forte'], [/\bextra\b/, 'extra'], [/\b(rich|riche|ric[oa])\b/, 'rico'], [/\bmax\b/, 'max'], [/\bpro\b/, 'pro'],
  [/\b(men|homme|homem|for men)\b/, 'homem'], [/\b(kids?|bebe|baby|infantil|crianc\w*|pediatric\w*)\b/, 'bebe'], [/\bteen\b/, 'teen'],
  [/\b(noite|night|nuit|noturn\w*|nocturn\w*|midnight)\b/, 'noite'], [/\b(dia|day|jour|diurn\w*)\b/, 'dia'],
  [/\b(tecido|sheet|tissu)\b/, 'tecido'],   // máscara em tecido ≠ máscara em creme
  [/\b(mini|travel|viagem)\b/, 'mini'], [/\b(recarga|refill|recharge)\b/, 'recarga'], [/\b(trio|pack|coffret|kit|set|conjunto|duo pack|\d+ ?x ?\d+ ?ml)\b/, 'pack'],   // («Effaclar Duo» é o nome do produto)
  [/\b(claro|clair|light shade|fair|porcelan\w*)\b/, 'tom-claro'], [/\b(medio|medium|moyen)\b/, 'tom-medio'], [/\b(escuro|dark|fonce|deep)\b/, 'tom-escuro'],
  [/\b(bronze|dourado|dore|golden|tan)\b/, 'tom-bronze'], [/\b(nude|natural|beige|bege|sand|areia)\b/, 'tom-natural'],
];
// aromas e sabores: o desodorizante Citrus não é o de Romã (com as traduções juntas)
const AROMAS = [
  ['citrus', /\b(citrus|citric\w*|citrin\w*)\b/], ['limao', /\b(limao|lemon|citron|limon)\b/], ['laranja', /\b(laranja|orange|naranja)\b/],
  ['toranja', /\b(toranja|grapefruit|pamplemousse|pomelo)\b/], ['lima', /\b(lima|lime)\b/], ['roma', /\b(roma|pomegranate|grenade|granada)\b/],
  ['lavanda', /\b(lavanda|lavender|lavande|alfazema)\b/], ['rosa', /\b(rosa|rose|roses)\b/], ['coco', /\b(coco|coconut)\b/],
  ['baunilha', /\b(baunilha|vanilla|vanille|vainilla)\b/], ['menta', /\b(menta|mint|hortela|peppermint)\b/], ['morango', /\b(morango|strawberry|fraise|fresa)\b/],
  ['framboesa', /\b(framboesa|raspberry|framboise)\b/], ['cereja', /\b(cereja|cherry|cerise)\b/], ['mel', /\b(mel|honey|miel)\b/],
  ['aloe', /\b(aloe|aloes|aloé)\b/], ['argao', /\b(argao|argan)\b/], ['amendoa', /\b(amendoa|almond|amande|almendra)\b/],
  ['karite', /\b(karite|shea)\b/], ['verbena', /\b(verbena|verveine)\b/], ['jasmim', /\b(jasmim|jasmine|jasmin)\b/], ['figo', /\b(figo|fig|figue)\b/],
  ['cha', /\b(cha|tea|the)\b/], ['pepino', /\b(pepino|cucumber|concombre)\b/], ['melancia', /\b(melancia|watermelon|pasteque)\b/],
  ['maracuja', /\b(maracuja|passion\w*)\b/], ['manga', /\b(manga|mango)\b/], ['abacate', /\b(abacate|avocado|avocat)\b/], ['bambu', /\b(bambu|bamboo)\b/],
  ['algodao', /\b(algodao|cotton|coton)\b/], ['oceano', /\b(oceano|ocean|marine|mar)\b/], ['frutos', /\b(frutos vermelhos|red fruits|berries|berry)\b/],
  ['pera', /\b(pera|pear|poire)\b/], ['maca', /\b(maca|apple|pomme)\b/], ['camomila', /\b(camomila|chamomile|camomille|manzanilla)\b/],
];
function aromas(nome) { const t = sa(nome); const s = new Set(); for (const [k, r] of AROMAS) if (r.test(t)) s.add(k); return s; }
// o fator de proteção conta como versão: «com FPS 30» não é a versão sem
const SPF = /\b(?:spf|fps|ip|fp)\s*\+?\s*(\d{1,2})\b/;
function versoes(nome) {
  const t = sa(nome); const s = new Set();
  for (const [r, k] of VERSAO) if (r.test(t)) s.add(k);
  for (const a of aromas(nome)) s.add('aroma-' + a);
  const f = t.match(SPF); if (f) s.add('spf-' + f[1]);
  return s;
}
const mesmas = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
// Nomes traduzidos (2026-11-16): a SweetCare e a Wells escrevem muitas vezes em inglês
// ou espanhol o que as outras lojas escrevem em português. O canonicalName já traduz
// algumas palavras (cream → creme, moisturizing → hidratante); estas vêm dos pares de
// palavras mais frequentes entre fichas da mesma marca e tamanho que quase batiam.
const VOCAB = {};
for (const [canon, lista] of Object.entries({
  corpo: 'body corporal corps cuerpo', olhos: 'eye eyes yeux ojos olho contorno contour', cabelo: 'hair capilar cabelos cheveux cabello',
  solar: 'sun solaire fotoprotector fotoprotetor sunscreen', rosto: 'face facial visage cara', intens: 'intensive intensivo intensiva intense intenso',
  vitamina: 'vitamin vitamine', banho: 'shower duche douche bath bano', leite: 'locao lotion lait milk leche', hidratante: 'moisture moisturizing moisturising moisturizer moisturiser hydrating hydra hydratant hydratante hidratacao hidratacion hydration',
  limpeza: 'desmaquilhante limpiador limpador cleanser cleansing nettoyant demaquillant', maos: 'hand hands mains manos', pes: 'foot feet pieds pies', labios: 'lip lips levres',
  ampola: 'ampoule ampolla ampoules ampolas', argao: 'argan', desodorizante: 'antitranspirante antiperspirant deo desodorante deodorant', protecao: 'protection proteccion protetor protector protect',
  purificante: 'purifying purifiant', antirrugas: 'rugas wrinkle wrinkles antiwrinkle antiarrugas rides', antiqueda: 'queda loss caida chute hairloss',
  antimanchas: 'manchas spots taches antitaches', anticaspa: 'caspa dandruff antipelliculaire', calmante: 'apaziguante soothing calming apaisant',
  refirmante: 'firming reafirmante raffermissant firmeza', dia: 'day jour diurno daily diario', noite: 'night noche nuit noturno nocturno',
  nutritivo: 'nourishing nutritiva nourrissant nutrition nutri', recarga: 'refill recharge', reparador: 'repair reparadora reparacao reparation repairing',
  concentrado: 'concentrate concentre', hialuronico: 'hyaluron hyaluronic hyaluronique hialuronica', niacinamida: 'niacinamide', controlo: 'control controle',
  emulsao: 'emulsion', micelar: 'micellar micellaire', rico: 'rica rich riche', shampoo: 'shampooing champu', condicionador: 'amaciador conditioner acondicionador',
  esfoliante: 'exfoliante exfoliating scrub peeling gommage', mascara: 'mask masque mascarilla', oleo: 'oil huile aceite', serum: 'soro',
}) ) for (const w of lista.split(' ')) VOCAB[w] = canon;
// palavras que não distinguem produtos
const VAZIAS = new Set('anti em com con with the and for para de du des la le el pele skin peau piel cuidado cuidados care soin'.split(' '));
const palavras = (nome, marca) => new Set(canonicalName(nome || '', marca).split('-')
  .filter(x => x.length > 1 && !/^\d+$/.test(x))
  .map(x => VOCAB[x] || x)
  .filter(x => !VAZIAS.has(x)));

function gerar(seed) {
  const ofertas = new Map();
  for (const g of seed.store_products) for (const it of g.items) (ofertas.get(it.ean) || ofertas.set(it.ean, []).get(it.ean)).push([g.store_slug, it]);
  const tamanhos = p => {
    const s = new Set(); const v = extractVolumeMl(p.name || ''); if (v) s.add(v);
    for (const [, it] of ofertas.get(p.ean) || []) for (const x of it.variants || []) if (x.volume_ml > 0) s.add(x.volume_ml);
    return s;
  };
  const visivel = p => p.name && !eMaquilhagem(p.name, p.category, p.brand) && !isNonCosmetic(p.name);
  const porMarca = new Map();
  for (const p of seed.products) {
    if (!eanReal(p.ean) || !visivel(p)) continue;
    const b = normalizeBrand(p.brand || ''); if (!b) continue;
    (porMarca.get(b) || porMarca.set(b, []).get(b)).push({ p, tam: tamanhos(p), pal: palavras(p.name, p.brand) });
  }
  const motivos = {}; const conta = k => { motivos[k] = (motivos[k] || 0) + 1; };
  const pares = [];
  for (const s of seed.products) {
    if (eanReal(s.ean) || !visivel(s)) continue;
    const b = normalizeBrand(s.brand || ''); if (!b) { conta('sem marca'); continue; }
    const ts = tamanhos(s); if (!ts.size) { conta('sem tamanho'); continue; }
    const A = palavras(s.name, s.brand);
    let melhor = null, segundo = 0;
    for (const c of porMarca.get(b) || []) {
      if (![...ts].some(t => [...c.tam].some(u => Math.abs(t - u) / Math.max(t, u) <= 0.06))) continue;
      let comuns = 0; for (const x of A) if (c.pal.has(x)) comuns++;
      const j = comuns / ((A.size + c.pal.size - comuns) || 1);
      if (!melhor || j > melhor.j) { segundo = melhor ? melhor.j : segundo; melhor = { ...c, j }; } else if (j > segundo) segundo = j;
    }
    if (!melhor) { conta('sem candidato'); continue; }
    if (melhor.j < LIMIAR) { conta('nome pouco parecido'); continue; }
    if (melhor.j - segundo < FOLGA) { conta('dois candidatos'); continue; }
    const p = melhor.p;
    if (Math.min(A.size, melhor.pal.size) < 3 && melhor.j < 1) { conta('nome curto'); continue; }
    if (sinalDeProdutoDiferente({ name: s.name, brand: s.brand }, { name: p.name, brand: p.brand }) || variantesOpostas(p, s)) { conta('outro produto'); continue; }
    if (tiposEmConflito(tiposDe(s.name), tiposDe(p.name))) { conta('tipo'); continue; }
    if (LIMPEZA.test(sa(s.name)) !== LIMPEZA.test(sa(p.name)) && tiposDe(s.name).size && tiposDe(p.name).size) { conta('limpeza'); continue; }
    if (!mesmas(versoes(s.name), versoes(p.name))) { conta('versão/tom'); continue; }
    const ls = new Map((ofertas.get(s.ean) || []).map(([l, it]) => [l, it.url]));
    const lp = new Map((ofertas.get(p.ean) || []).map(([l, it]) => [l, it.url]));
    if ([...ls].some(([l, u]) => lp.has(l) && lp.get(l) !== u)) { conta('a loja já tem o produto noutra página'); continue; }
    pares.push({ s, p, j: melhor.j, lojas: [...ls.keys()] });
  }
  // duas fichas da mesma loja no mesmo produto: ambíguo, fica de fora
  const n = new Map(); for (const x of pares) for (const l of x.lojas) n.set(x.p.ean + '|' + l, (n.get(x.p.ean + '|' + l) || 0) + 1);
  const finais = pares.filter(x => !x.lojas.some(l => n.get(x.p.ean + '|' + l) > 1));
  motivos['duas fichas da mesma loja'] = pares.length - finais.length;
  return { finais, motivos };
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  let seed;
  try { seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8')); }
  catch { console.error('✗ sem data/seed-bundle.json — correr bash scripts/ci/seed.sh unpack'); process.exit(1); }
  // os pares manuais mandam: os códigos que lá estão não entram aqui
  const manuais = new Set();
  try { for (const [k, d] of Object.entries(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'product-aliases.json'), 'utf8')))) if (!k.startsWith('_')) { manuais.add(k); for (const a of d.aliases || []) manuais.add(String(a)); } } catch { /* sem manuais */ }
  const { finais, motivos } = gerar(seed);
  const usar = finais.filter(x => !manuais.has(x.s.ean));
  const out = { _comment: 'Gerado por scripts/aliases-sinteticos.js — fichas sem EAN (código de loja) que são o mesmo produto que uma ficha com EAN. Aplicado na publicação por scripts/dedup-ean-variants.js, depois dos aliases manuais (data/product-aliases.json), que mandam. Não editar à mão: corrigir as regras ou acrescentar um par manual.', _gerado: new Date().toISOString().slice(0, 10) };
  for (const x of usar.sort((a, b) => String(a.p.ean).localeCompare(String(b.p.ean)))) {
    const e = out[x.p.ean] || (out[x.p.ean] = { aliases: [], reason: [] });
    e.aliases.push(x.s.ean); e.reason.push(`${x.s.name} ⇄ ${x.p.name} (${x.j.toFixed(2)})`);
  }
  console.log(`🔗 fichas sem EAN juntas a fichas com EAN: ${usar.length} (SweetCare ${usar.filter(x => x.s.ean.startsWith('sweetcare-')).length}, Wells ${usar.filter(x => x.s.ean.startsWith('wells-')).length})`);
  console.log('   recusadas:', Object.entries(motivos).map(([k, v]) => `${k} ${v}`).join(' · '));
  if (args.amostra) {
    const a = [...usar]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    for (const x of a.slice(0, Number(args.amostra))) console.log(`   ${x.j.toFixed(2)} | ${x.s.name.slice(0, 48)} ⇄ ${x.p.name.slice(0, 56)}`);
  }
  if (args['dry-run']) return;
  fs.writeFileSync(SAIDA, JSON.stringify(out, null, 1) + '\n');
}

module.exports = { gerar, versoes, palavras, mesmas, LIMPEZA, sa };
if (require.main === module) main();
