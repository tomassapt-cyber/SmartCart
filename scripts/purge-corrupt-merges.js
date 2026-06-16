#!/usr/bin/env node
/**
 * SmartCart — Purga de produtos "corrompidos por over-merge legado"
 * =================================================================
 *
 * Origem do problema: quando o fuzzy matching ainda estava ATIVO, vários
 * produtos reais diferentes (marcas distintas) foram fundidos sob um único
 * EAN. O fuzzy foi desligado (parou merges novos) mas as ofertas erradas
 * ficaram congeladas no seed. Ex.: EAN 42398110 "Men Creme Fresh" junta
 * Nivea Creme + Barral DermaProtect + serums.
 *
 * Estratégia (escolha do utilizador): PURGAR estes produtos do seed. Como o
 * fuzzy está desligado, o próximo scrape diário recria-os CORRETOS e separados
 * (Barral pelo EAN real, Nivea Creme pelo fingerprint), sem voltar a fundir.
 *
 * Deteção (ESTRITA, alta precisão p/ não apagar produtos legítimos):
 *   Um produto é "corrompido" se os URLs das suas ofertas revelam ≥2 MARCAS
 *   bem-conhecidas DISTINTAS (famílias diferentes), e o produto NÃO é um
 *   kit/pack/conjunto (que legitimamente junta marcas).
 *
 * Uso:
 *   node scripts/purge-corrupt-merges.js              # dry-run (lista, não apaga)
 *   node scripts/purge-corrupt-merges.js --apply      # apaga do seed
 */
const fs = require('fs');
const path = require('path');
const SEED = path.join(__dirname, '..', 'data', 'seed-bundle.json');
const APPLY = process.argv.includes('--apply');

// Marcas dermo-cosmética bem-conhecidas. Mesma FAMÍLIA = mesmo valor canónico
// (evita falsos positivos entre marcas da mesma empresa: Garnier/L'Oréal).
const BRAND_PATTERNS = [
  ['nivea', /\bnivea\b/],
  ['barral', /\bbarral\b/],
  ['kiehls', /\bkiehl/],
  ['clinique', /\bclinique\b/],
  ['dermagius', /\bdermagius\b/],
  ['vichy', /\bvichy\b/],
  ['avene', /\bav[eè]ne\b/],
  ['uriage', /\buriage\b/],
  ['laroche', /\b(la-?roche|roche-?posay)\b/],
  ['caudalie', /\bcaudalie\b/],
  ['eucerin', /\beucerin\b/],
  ['bioderma', /\bbioderma\b/],
  ['cerave', /\bcerave\b/],
  ['cetaphil', /\bcetaphil\b/],
  ['mustela', /\bmustela\b/],
  ['isdin', /\bisdin\b/],
  ['sebamed', /\bsebamed\b/],
  ['weleda', /\bweleda\b/],
  ['loreal', /\b(garnier|l-?or[ée]al|loreal)\b/],   // Garnier + L'Oréal = mesma família
  ['neutrogena', /\bneutrogena\b/],
  ['dove', /\bdove\b/],
  ['aderma', /\b(a-?derma)\b/],
  ['ducray', /\bducray\b/],
  ['klorane', /\bklorane\b/],
  ['phyto', /\bphyto\b/],
  ['furterer', /\b(rene-?furterer|furterer)\b/],
  ['svr', /\bsvr\b/],
  ['filorga', /\bfilorga\b/],
  ['nuxe', /\bnuxe\b/],
  ['embryolisse', /\bembryolisse\b/],
  ['lierac', /\blierac\b/],
  ['sesderma', /\bsesderma\b/],
  ['martiderm', /\bmartiderm\b/],
  ['endocare', /\bendocare\b/],
  ['heliocare', /\bheliocare\b/],
  ['ahava', /\bahava\b/],
  ['elancyl', /\belancyl\b/],
  ['somatoline', /\bsomatoline\b/],
  ['leti', /\bleti(?:at|sr|cure)?\b/],
  ['topicrem', /\btopicrem\b/],
  ['olaplex', /\bolaplex\b/],
];

function brandsIn(text) {
  const t = (text || '').toLowerCase().replace(/[+_]/g, ' ');
  const out = new Set();
  for (const [name, re] of BRAND_PATTERNS) if (re.test(t)) out.add(name);
  return out;
}
// Kit/bundle legítimo: junta marcas de propósito → NÃO é corrupção.
// Apanha palavras-chave E nomes que juntam 2 produtos com " + " ou "miniatura".
const isKit = (name) => /\b(kit|pack|conjunto|coffret|trio|duo|set|bundle|presente|oferta|miniatura|mini\b)/i.test(name || '') || /\s\+\s/.test(name || '');

const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
// índice ean -> [offers]
const offersByEan = {};
for (const g of seed.store_products) for (const it of g.items) {
  (offersByEan[it.ean] ||= []).push({ store: g.store_slug, url: it.url || '', price: it.price });
}

const corrupt = [];
for (const p of seed.products) {
  if (isKit(p.name)) continue;
  // Sinal de corrupção vem dos URLs das OFERTAS (o campo brand do produto é
  // pouco fiável). O nome do produto serve só para detetar conflito directo.
  const nameBrands = brandsIn(p.name || '');
  const offers = offersByEan[p.ean] || [];
  const offerBrands = new Set();
  for (const o of offers) for (const b of brandsIn(o.url)) offerBrands.add(b);
  const disjoint = [...offerBrands].some(b => !nameBrands.has(b)) && [...nameBrands].some(b => !offerBrands.has(b));
  // CORRUPTO se: (a) os URLs das ofertas revelam ≥2 marcas distintas, OU
  //             (b) as ofertas apontam p/ marca diferente da do NOME do produto.
  const isCorrupt = offerBrands.size >= 2 || (offerBrands.size >= 1 && nameBrands.size >= 1 && disjoint);
  if (isCorrupt) {
    corrupt.push({ ean: p.ean, name: p.name, brand: p.brand, brands: [...new Set([...nameBrands, ...offerBrands])], offers });
  }
}

console.log(`\n${corrupt.length} produtos com ≥2 marcas distintas (candidatos a corrupção):\n`);
for (const c of corrupt) {
  console.log(`■ [${c.ean}] ${c.name}  (brand: ${c.brand || '—'})  marcas: {${c.brands.join(', ')}}`);
  for (const o of c.offers) console.log(`    ${o.store.padEnd(18)} ${String(o.price).padStart(7)}  ${o.url}`);
  console.log('');
}

if (!APPLY) {
  console.log('🧪 dry-run: nada apagado. Revê a lista acima; corre com --apply para purgar.');
  process.exit(0);
}

const eansToPurge = new Set(corrupt.map(c => c.ean));
const beforeP = seed.products.length;
seed.products = seed.products.filter(p => !eansToPurge.has(p.ean));
let removedItems = 0;
for (const g of seed.store_products) {
  const b = g.items.length;
  g.items = g.items.filter(it => !eansToPurge.has(it.ean));
  removedItems += b - g.items.length;
}
fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
console.log(`✔ Purgados ${beforeP - seed.products.length} produtos + ${removedItems} ofertas. seed gravado.`);
console.log('  Corre inject-seed-into-demo.js. O próximo scrape diário recria-os corretos.');
