/**
 * Código de barras renovado: o mesmo produto com dois EANs → um cartão só
 * ============================================================
 * PORQUÊ (auditoria 2026-10-02): as marcas trocam o EAN de produtos que não
 * mudam (Bioderma 3401… → 3701…, rebrands como "Phytoprogenium" → "Phyto
 * Suavidade"). As lojas atualizam a ritmos diferentes: umas listam o EAN
 * velho, outras o novo — e o site mostra DOIS cartões, cada um com metade das
 * lojas. Medido: ~320 cartões nesta situação; juntá-los soma ~1.700 lojas às
 * comparações (ex.: Avène Fluido Mineral SPF50+ 40 ml, 18 + 14 lojas → 32).
 *
 * EVIDÊNCIA: uma loja tem uma oferta nossa com EAN A no URL U, e o catálogo
 * fresco dessa loja diz que U é agora o EAN B (outro produto do seed). A loja
 * trocou o produto naquela ficha — às vezes porque o EAN foi renovado (mesmo
 * produto), às vezes porque o produto foi substituído (Bariésun SPF30 →
 * SPF50+, não é o mesmo). As regras separam os dois:
 *   • mesma marca canónica e mesmo volume (±3%) no nome dos dois;
 *   • os MESMOS números no nome, tirando o volume (SPF, %, nº de tom, 1º, 2x…);
 *   • as MESMAS palavras de tom/cor (Heliocare Color "Bronze" ≠ "Bege");
 *   • os mesmos volumes no nome, todos ("50 ml + Recarga 50 ml" ≠ "Recarga 50 ml";
 *     "Sérum 30 ml + Gel 150 ml" ≠ "Sérum 30 ml + Loção 200 ml");
 *   • a mesma forma, se os dois a disserem (champô ≠ condicionador);
 *   • o mesmo sabor (Meritene Neutro ≠ Café);
 *   • sem gamas diferentes da marca, uma de cada lado (Bioderma Sébium ≠ Sensibio):
 *     gama = palavra que abre o nome de ≥ 3 produtos da marca;
 *   • se os dois disserem o tipo (pele, cabelo, dia/noite, criança…), o mesmo
 *     (GHD Bodyguard "cabelo com coloração" ≠ "cabelo fino");
 *   • paridade de recarga/pack/kit/coffret/mini/duo e de "sem perfume";
 *   • Jaccard dos nomes ≥ 0,5;
 *   • nenhuma das ofertas na blocklist de EANs errados.
 *
 * PERSISTÊNCIA: depois de juntar, a oferta velha some (a loja fica com a do
 * EAN novo) e a evidência desaparece. Mas outra loja que ainda liste o EAN
 * velho faria o integrador recriar o cartão A. Por isso o produto que fica
 * guarda `eans_antigos`, e qualquer produto que volte a aparecer com um desses
 * EANs é logo absorvido (passo 1, sem precisar de evidência).
 */
const fs = require('fs');
const path = require('path');
const F = require('./product-fingerprint');
const { isBlockedOffer } = require('./store-item-merge');
const { decodeEntities } = require('./name-cleanup');

const FICHEIRO = { 'loja-farmacia': 'lojafarmacia', 'pharma-gdd': 'pharmagdd' };
const PARIDADE = /\b(recarga|refill|recharge|coffret|pack|kit|duo|trio|conjunto|set|mini|travel|viagem|amostra|tester)\b/i;
const SEM_PERFUME = /\b(sem perfume|sem fragrancia|sans parfum|fragrance[- ]free|unscented|sin perfume)\b/i;
const VOLUME_RE = /\d+(?:[.,]\d+)?\s*(?:ml|g|gr|grs|kg|l|cl|mg|un|unid|unidades|uds)\b/gi;
const TONS = new Set(['claro', 'clara', 'escuro', 'escura', 'medio', 'media', 'light', 'dark', 'medium', 'fair', 'bronze',
  'bege', 'beige', 'natural', 'golden', 'dourado', 'dourada', 'sand', 'areia', 'ivory', 'marfim', 'tan', 'caramel',
  'nude', 'rose', 'rosa', 'pink', 'coral', 'red', 'vermelho', 'preto', 'black', 'brown', 'castanho', 'blond', 'louro',
  'loiro', 'cinza', 'grey', 'gray', 'white', 'branco', 'clear', 'transparente', 'incolor', 'tinted', 'cor', 'color',
  'colour', 'teinte', 'teinté', 'tom', 'tone', 'shade', 'universal',
  // sabores (suplementos e nutrição clínica)
  'neutro', 'cafe', 'morango', 'baunilha', 'chocolate', 'banana', 'frutos', 'limao', 'laranja', 'ananas', 'pessego',
  'framboesa', 'cereja', 'coco', 'menta', 'caramelo']);
// forma do produto → chave comum
const FORMAS = [
  ['champo', /\b(champos?|shampoos?|champus?)\b/], ['condicionador', /\b(condicionador\w*|conditioner|apres-shampo\w*|balsamo-apos)\b/],
  ['mascara', /\b(mascaras?|masks?|masque)\b/], ['creme', /\b(cremes?|creams?|creme)\b/], ['gel', /\b(gel|geis|gels)\b/],
  ['oleo', /\b(oleos?|oils?|huile)\b/], ['serum', /\b(serums?|serum)\b/], ['locao', /\b(locao|locoes|lotion)\b/],
  ['spray', /\b(spray|bruma|mist)\b/], ['leite', /\b(leite|milk|lait)\b/], ['balsamo', /\b(balsamos?|balm|baume)\b/],
  ['espuma', /\b(espuma|foam|mousse)\b/], ['agua', /\b(agua|water|eau)\b/], ['tonico', /\b(tonicos?|toner|tonique)\b/],
  ['stick', /\b(stick|batom)\b/], ['po', /\b(po|powder|poudre)\b/], ['fluido', /\b(fluidos?|fluid|fluide)\b/],
];
const core = e => String(e || '').replace(/^0+/, '');
const eanReal = e => /^\d{8,14}$/.test(String(e || ''));
const normUrl = u => String(u || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
const texto = s => decodeEntities(String(s || ''));
const semAcentos = s => texto(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// tipo de pele/cabelo/uso → chave comum às línguas que as lojas usam
const TIPOS = [
  ['oleosa', /\b(oleos[oa]s?|oily|grasse?s?|grasa)\b/], ['seca', /\b(secos?|secas?|dry|seche|sensible|muito-seca)\b/],
  ['mista', /\b(mist[oa]s?|combination|mixte)\b/], ['sensivel', /\b(sensiveis|sensivel|sensitive|sensibles?)\b/],
  ['atopica', /\b(atopic[oa]s?|atopique)\b/], ['acne', /\b(acne|acneic[oa]|imperfeic\w*|blemish)\b/],
  ['fino', /\b(finos?|finas?|fine|fins)\b/], ['grosso', /\b(grossos?|espessos?|thick)\b/],
  ['pintado', /\b(colorac\w*|pintados?|colou?red|colores)\b/], ['caracol', /\b(caracois|cacheados?|curly|curls?|rizado)\b/],
  ['crianca', /\b(crianc\w*|infantil|kids?|child\w*|enfants?|junior|ninos)\b/], ['bebe', /\b(bebes?|baby)\b/],
  ['dia', /\b(dia|day|jour)\b/], ['noite', /\b(noite|night|nuit|noche)\b/],
  ['homem', /\b(homem|men|homme|hombre)\b/], ['mulher', /\b(mulher|women|femme|woman)\b/],
  ['rugas', /\b(anti-?rugas|rugas|wrinkles?|rides)\b/], ['fadiga', /\b(anti-?fadiga|fadiga|fatigue)\b/],
];
const chaves = (lista, nome) => { const t = semAcentos(nome); return lista.filter(([, re]) => re.test(t)).map(([k]) => k); };
// todos os volumes do nome, em ml, ordenados
const volumes = nome => (texto(nome).match(VOLUME_RE) || []).map(v => F.extractVolumeMl(v)).filter(Boolean).sort((x, y) => x - y);
const mesmosVolumes = (a, b) => a.length === b.length && a.length > 0 && a.every((v, i) => Math.abs(v - b[i]) / Math.max(v, b[i]) <= 0.03);
const tipos = nome => chaves(TIPOS, nome).join('|');
const tons = nome => [...new Set(semAcentos(nome).split(/[^a-z]+/).filter(w => TONS.has(w)))].sort().join('|');
const numeros = nome => (semAcentos(nome).replace(VOLUME_RE, ' ').match(/\d+(?:[.,]\d+)?/g) || [])
  .map(n => String(parseFloat(n.replace(',', '.')))).sort().join('|');

// palavras que abrem o nome de ≥ 3 produtos da marca (a gama: Sébium, Sensibio…)
const palavras = (nome, marca) => {
  const m = new Set(semAcentos(marca).split(/[^a-z0-9]+/).filter(Boolean));
  return semAcentos(nome).replace(VOLUME_RE, ' ').split(/[^a-z0-9+]+/).filter(w => w.length >= 3 && !m.has(w));
};
function criarGamas(seed) {
  const conta = new Map();
  for (const p of seed.products) {
    const b = F.normalizeBrand(p.brand); const w = palavras(texto(p.name), p.brand || '')[0];
    if (!b || !w) continue;
    const k = b + '|' + w; conta.set(k, (conta.get(k) || 0) + 1);
  }
  return (marca, w) => (conta.get(marca + '|' + w) || 0) >= 3;
}

function mesmoProduto(a, b, eGama) {
  const marca = F.normalizeBrand(a.brand);
  if (!marca || F.normalizeBrand(b.brand) !== marca) return false;
  if (!mesmosVolumes(volumes(a.name), volumes(b.name))) return false;
  if (numeros(a.name) !== numeros(b.name) || tons(a.name) !== tons(b.name)) return false;
  const ta = tipos(a.name), tb = tipos(b.name);
  if (ta && tb && ta !== tb) return false;
  const fa = chaves(FORMAS, a.name), fb = chaves(FORMAS, b.name);
  if (fa.length && fb.length && !fa.some(f => fb.includes(f))) return false;
  if (PARIDADE.test(semAcentos(a.name)) !== PARIDADE.test(semAcentos(b.name))) return false;
  if (SEM_PERFUME.test(semAcentos(a.name)) !== SEM_PERFUME.test(semAcentos(b.name))) return false;
  if (eGama) {
    const wa = new Set(palavras(texto(a.name), a.brand || '')), wb = new Set(palavras(texto(b.name), b.brand || ''));
    const soA = [...wa].some(w => !wb.has(w) && eGama(marca, w)), soB = [...wb].some(w => !wa.has(w) && eGama(marca, w));
    if (soA && soB) return false;
  }
  return F.jaccard(F.nameTokenSet(texto(a.name), a.brand), F.nameTokenSet(texto(b.name), b.brand)) >= 0.5;
}

// junta `de` em `para`: as ofertas mudam de EAN (numa loja com as duas fica a
// mais recente), `para` herda os EANs antigos e a imagem se não tiver
function fundir(seed, pares) {
  const remap = new Map();
  for (const [de, para] of pares) {
    remap.set(de.ean, para.ean);
    const antigos = new Set([...(para.eans_antigos || []), de.ean, ...(de.eans_antigos || [])]);
    antigos.delete(para.ean);
    para.eans_antigos = [...antigos].sort();
    if (!para.image_url && de.image_url) para.image_url = de.image_url;
  }
  for (const sp of seed.store_products) {
    const porEan = new Map();
    const novos = [];
    for (const it of sp.items) {
      const ean = remap.get(it.ean) || it.ean;
      const ja = porEan.get(ean);
      if (ja == null) { porEan.set(ean, novos.length); novos.push(ean === it.ean ? it : { ...it, ean }); continue; }
      if ((it.verified_at || '') > (novos[ja].verified_at || '')) novos[ja] = { ...it, ean };
    }
    sp.items = novos;
  }
  seed.products = seed.products.filter(p => !remap.has(p.ean));
}

function lerCatalogos(seed, dir) {
  const catalogos = [];
  for (const sp of seed.store_products) {
    const f = path.join(dir, `${FICHEIRO[sp.store_slug] || sp.store_slug}-full.json`);
    if (!fs.existsSync(f)) continue;
    let cat; try { cat = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    if (cat.in_progress === true || !Array.isArray(cat.products)) continue;
    const eanPorUrl = new Map();
    for (const ep of cat.products) if (ep && ep.url && eanReal(ep.ean)) eanPorUrl.set(normUrl(ep.url), String(ep.ean));
    catalogos.push([sp.store_slug, eanPorUrl]);
  }
  return catalogos;
}

// pares (A = produto da nossa oferta, B = produto do EAN que a loja dá agora a esse
// URL), com as lojas que o atestam — mais lojas primeiro
function paresComEvidencia(seed, catalogos) {
  const vivos = new Map(seed.products.map(p => [core(p.ean), p]));
  const spPorLoja = new Map(seed.store_products.map(sp => [sp.store_slug, sp]));
  const pares = new Map();
  for (const [loja, eanPorUrl] of catalogos) {
    for (const it of spPorLoja.get(loja).items) {
      const b = eanPorUrl.get(normUrl(it.url));
      if (!b || core(b) === core(it.ean)) continue;
      const A = vivos.get(core(it.ean)), B = vivos.get(core(b));
      if (!A || !B || A === B) continue;
      if (isBlockedOffer(loja, b) || isBlockedOffer(loja, it.ean)) continue;
      const k = A.ean + '|' + B.ean;
      (pares.get(k) || pares.set(k, { a: A, b: B, lojas: [] }).get(k)).lojas.push(loja);
    }
  }
  return [...pares.values()].sort((x, y) => y.lojas.length - x.lojas.length);
}

function juntarEansRenovados(seed, opts = {}) {
  const dir = opts.catalogDir || path.join(__dirname, '..', '..', 'data', 'catalog');
  const agora = opts.agora || Date.now();
  const porEan = new Map(seed.products.map(p => [core(p.ean), p]));

  // nº de lojas com oferta fresca e em stock — decide qual dos dois fica
  const lojas = new Map();
  for (const sp of seed.store_products) for (const it of sp.items) {
    if (it.in_stock === false || !(it.price > 0) || (agora - new Date(it.verified_at || 0)) / 864e5 > 7) continue;
    lojas.set(it.ean, (lojas.get(it.ean) || 0) + 1);
  }

  // 1) EANs antigos já conhecidos: um cartão que renasceu com um deles volta ao seu
  const persistentes = [];
  const envolvidos = new Set();
  for (const p of seed.products) for (const a of p.eans_antigos || []) {
    const velho = porEan.get(core(a));
    if (velho && velho !== p && !envolvidos.has(velho.ean) && !envolvidos.has(p.ean)) {
      persistentes.push([velho, p]); envolvidos.add(velho.ean); envolvidos.add(p.ean);
    }
  }
  if (persistentes.length) fundir(seed, persistentes);

  // 2) evidência nova: o URL de uma oferta nossa passou a ter outro EAN no catálogo
  //    da loja. Cada produto entra numa junção por volta; repete até estabilizar
  //    (A→B numa volta, C→B na seguinte).
  const catalogos = lerCatalogos(seed, dir);
  const eGama = criarGamas(seed);
  const novas = [];
  for (let volta = 0; volta < 6; volta++) {
    const daVolta = [];
    const usados = new Set();
    for (const { a, b, lojas: ev } of paresComEvidencia(seed, catalogos)) {
      if (usados.has(a.ean) || usados.has(b.ean) || !mesmoProduto(a, b, eGama)) continue;
      // fica o que tem mais lojas; empate → o EAN novo (o que a loja usa agora)
      const [de, para] = (lojas.get(a.ean) || 0) > (lojas.get(b.ean) || 0) ? [b, a] : [a, b];
      daVolta.push([de, para, ev]);
      usados.add(a.ean); usados.add(b.ean);
    }
    if (!daVolta.length) break;
    fundir(seed, daVolta);
    for (const [de, para] of daVolta) lojas.set(para.ean, (lojas.get(para.ean) || 0) + (lojas.get(de.ean) || 0));
    novas.push(...daVolta);
  }
  return { persistentes: persistentes.length, novas: novas.length, fusoes: novas };
}

module.exports = { juntarEansRenovados, mesmoProduto };
