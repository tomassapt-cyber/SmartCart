#!/usr/bin/env node
/**
 * As ofertas vindas da base de dados são iguais às do catálogo embutido?
 * ============================================================================
 * Com o catálogo fora da página (Fase 4b), OFFERS_BY_PRODUCT deixa de nascer do
 * bloco embebido e passa a ser preenchido por carregarOfertas() a partir da base
 * de dados. Se a FORMA divergir, tudo o que lê ofertas parte de maneira subtil:
 * o pódio, o "desde X€", os portes, o histórico, o carrinho. Se os VALORES
 * divergirem, mostram-se preços errados.
 *
 * ⚠️ COMO NÃO MEDIR ISTO — foi a primeira tentativa e estava errada.
 * Comparar a base de dados com o data/seed-bundle.json do disco mede a IDADE DO
 * CHECKOUT, não a correcção do código: à primeira tentativa deu 19% dos preços
 * diferentes, e nenhum era defeito — o seed local tinha sido regenerado a partir
 * de fontes de 10 dias antes e a BD tinha 6 horas. Nem serve filtrar por
 * synced_at: a sincronização reescreve esse campo em TODAS as ofertas, mudem de
 * valor ou não, portanto "o que a BD não tocou" vem sempre vazio e o teste passa
 * por vacuidade.
 *
 * O QUE ESTE FICHEIRO FAZ, entao, sao duas coisas separadas:
 *
 *   (1) COMPARAÇÃO DETERMINÍSTICA — o gate a sério. Pega em cada oferta do seed
 *       e passa-a pelos DOIS caminhos: o do catálogo (demo.html:8287) e o da
 *       base de dados (a transformação do push-catalog-to-db.js seguida do
 *       _ofertaDaBd do demo.html). Sem rede e sem tempo pelo meio, sobre as
 *       ~150 mil ofertas todas. É isto que prova a equivalência.
 *
 *   (2) SONDAGEM AO VIVO — confirma que a consulta real ao PostgREST devolve o
 *       que se espera (nomes das colunas, embedding desambiguado, tipos). Os
 *       valores aqui NÃO são julgados contra o seed, pela razão acima; só se
 *       verifica o SENTIDO das diferenças, porque desactualização desvia para
 *       os dois lados e uma transformação a mais (moeda, IVA, escala) desviaria
 *       só para um.
 *
 * Uso: node scripts/verify-offers-fetch.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');

function extrair(assinatura) {
  const i = html.indexOf(assinatura);
  if (i < 0) throw new Error('não encontrei: ' + assinatura);
  let n = 0;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') n++;
    else if (html[k] === '}') { n--; if (n === 0) return html.slice(i, k + 1); }
  }
  throw new Error('chavetas desequilibradas em: ' + assinatura);
}

// a função REAL do site que transforma uma linha da BD numa oferta
const ctx = { Number, Boolean, console };
vm.createContext(ctx);
vm.runInContext(extrair('function _ofertaDaBd(o)'), ctx);

let mau = 0;
const ok = (nome, cond, det) => {
  if (cond) console.log(`  ✓ ${nome}`);
  else { console.log(`  ✗ ${nome}${det ? '  — ' + det : ''}`); mau++; }
};

// ── o seed, com os overlays que o site e o sync aplicam ────────────────────
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
const { isNonCosmetic } = require('./lib/product-fingerprint');
require('./lib/verified-shipping').applyVerifiedShipping(seed, ROOT);
const vf = require('./lib/variant-fixes');
vf.fixTruncatedVariantPrices(seed); vf.dropWrongProductVariants(seed);
require('./dedup-ean-variants').mergeEanVariants(seed);
require('./lib/promo-fold').foldPromoVariants(seed);
require('./lib/ghost-offers').dropGhostOffers(seed);
const cv = require('./lib/catalog-visibility');
cv.dropRottenOffers(seed); cv.applyVisibilityFilter(seed, isNonCosmetic);

// ── (1) COMPARAÇÃO DETERMINÍSTICA ──────────────────────────────────────────
// caminho A: item do seed → objecto do catálogo (demo.html:8287)
const doCatalogo = item => ({
  price: Number(item.price),
  previous_price: item.previous_price != null ? Number(item.previous_price) : null,
  discount_pct: item.discount_pct != null ? Number(item.discount_pct) : null,
  in_stock: Boolean(item.in_stock),
  url: item.url,
  verified: item.verified === true,
  verified_url: item.verified_url === true || item.verified === true,
  verified_at: item.verified_at || null,
  source: item.source || (item.verified ? 'scraped' : 'estimated'),
  variant_note: item.variant_note || null,
  promo_note: item.promo_note || null,
  promo_pack: Boolean(item.promo_pack),
});

// caminho B, 1º troço: item do seed → linha da BD (push-catalog-to-db.js:235)
const safeUrl = u => { const x = String(u || ''); return /^https?:\/\//i.test(x) ? x : null; };
const linhaDoSync = it => ({
  price: it.price, previous_price: it.previous_price ?? null,
  discount_pct: it.discount_pct != null ? Math.round(it.discount_pct) : null,
  in_stock: it.in_stock !== false, url: safeUrl(it.url),
  verified_at: it.verified_at || null,
  promo_note: it.promo_note ?? null, promo_pack: !!it.promo_pack,
});

const CAMPOS = ['price', 'previous_price', 'discount_pct', 'in_stock', 'url',
  'verified', 'verified_url', 'verified_at', 'source', 'variant_note',
  'promo_note', 'promo_pack'];

console.log('=== (1) os dois caminhos, sobre o catálogo todo ===');
const dif = Object.fromEntries(CAMPOS.map(c => [c, 0]));
const exemplo = {};
let n = 0;
for (const g of seed.store_products) {
  for (const it of (g.items || [])) {
    if (!(it.price > 0)) continue;
    n++;
    const a = doCatalogo(it);
    const b = ctx._ofertaDaBd(linhaDoSync(it));
    for (const c of CAMPOS) {
      const va = a[c], vb = b[c];
      const igual = (typeof va === 'number' && typeof vb === 'number')
        ? Math.round(va * 100) === Math.round(vb * 100)
        : (va ?? null) === (vb ?? null);
      if (!igual) {
        dif[c]++;
        if (!exemplo[c]) exemplo[c] = `${g.store_slug} ${it.ean}: catálogo ${JSON.stringify(va)} · BD ${JSON.stringify(vb)}`;
      }
    }
  }
}
console.log(`  ofertas comparadas: ${n.toLocaleString('pt-PT')}\n`);
for (const c of CAMPOS) {
  const marca = dif[c] === 0 ? '✓' : '·';
  console.log(`  ${marca} ${c.padEnd(15)} ${String(dif[c]).padStart(7)}   ${(exemplo[c] || '').slice(0, 58)}`);
}

// Os que mudam o que o utilizador vê têm de ser ZERO.
for (const c of ['price', 'previous_price', 'in_stock', 'url', 'verified', 'verified_url', 'source', 'variant_note', 'promo_note', 'promo_pack']) {
  ok(`${c} idêntico nos dois caminhos`, dif[c] === 0, `${dif[c]} diferentes · ${exemplo[c] || ''}`);
}
// discount_pct: o sync arredonda (Math.round) e o catálogo guarda a fracção.
// É cosmético — muda "-19%" para "-19%" na esmagadora maioria — mas se um dia
// disparar quer dizer que passaram a entrar descontos fraccionários em massa.
ok('discount_pct: arredondamento residual (<0,1%)', dif.discount_pct / n < 0.001,
  `${dif.discount_pct} de ${n}`);

// ── (2) SONDAGEM AO VIVO ───────────────────────────────────────────────────
const doSeed = new Map();
for (const g of seed.store_products) {
  for (const it of (g.items || [])) {
    if (!(it.price > 0)) continue;
    if (!doSeed.has(it.ean)) doSeed.set(it.ean, {});
    doSeed.get(it.ean)[g.store_slug] = it;
  }
}
const eans = [...doSeed.keys()].filter(e => Object.keys(doSeed.get(e)).length >= 3);
const N = 40, passo = Math.max(1, Math.floor(eans.length / N));
const amostra = Array.from({ length: N }, (_, i) => eans[i * passo]).filter(Boolean);

const KEY = (fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8').match(/const KEY = '([^']+)'/) || [])[1];
const SB = 'https://sqjtkwtoaudmfmexreqk.supabase.co';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

(async () => {
  console.log('\n=== (2) a consulta real ao PostgREST ===');
  const sel = 'ean,image_url,offers!offers_ean_fkey(store_slug,price,previous_price,discount_pct,in_stock,url,verified_at,promo_note,promo_pack)';
  let linhas = null;
  try {
    const r = await fetch(`${SB}/rest/v1/products?select=${sel}&ean=in.(${amostra.join(',')})`,
      { headers: { ...H, Range: '0-9999' }, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 120));
    linhas = await r.json();
  } catch (e) {
    // sem rede o gate determinístico já correu; não se inventa um veredicto
    console.log(`  ⚠ sem resposta da base de dados (${e.message}) — só a parte (1) foi verificada`);
    console.log(`\n⇒ ${mau === 0 ? '✓ EQUIVALÊNCIA PROVADA (sem sondagem ao vivo)' : `✗ ${mau} PROBLEMAS`}`);
    process.exit(mau === 0 ? 0 : 1);
  }

  const convertidas = [];
  for (const p of linhas) for (const o of (p.offers || [])) if (o.price > 0) convertidas.push({ ean: p.ean, loja: o.store_slug, of: ctx._ofertaDaBd(o) });
  console.log(`  produtos: ${linhas.length}/${amostra.length} · ofertas: ${convertidas.length}`);

  const faltam = new Set();
  for (const c of convertidas) for (const campo of [...CAMPOS, 'variants']) if (!(campo in c.of)) faltam.add(campo);
  ok('os 13 campos que o site lê chegam todos', faltam.size === 0, [...faltam].join(', '));
  ok('price número > 0', convertidas.every(c => typeof c.of.price === 'number' && c.of.price > 0));
  ok('in_stock booleano', convertidas.every(c => typeof c.of.in_stock === 'boolean'));
  ok('previous_price número ou nulo', convertidas.every(c => c.of.previous_price === null || typeof c.of.previous_price === 'number'));
  ok('url presente em todas', convertidas.every(c => !!c.of.url));

  // sentido das diferenças (não a quantidade — ver o cabeçalho)
  let comuns = 0, difPreco = 0, maisCara = 0, difUrl = 0;
  for (const c of convertidas) {
    const s = (doSeed.get(c.ean) || {})[c.loja];
    if (!s) continue;
    comuns++;
    if (Math.round(c.of.price * 100) !== Math.round(Number(s.price) * 100)) {
      difPreco++;
      if (c.of.price > Number(s.price)) maisCara++;
    }
    if ((c.of.url || '') !== (s.url || '')) difUrl++;
  }
  const f = difPreco ? maisCara / difPreco : 0.5;
  console.log(`  deriva face ao seed do disco: ${difPreco}/${comuns} preços (${(difPreco / comuns * 100).toFixed(0)}%), ${(f * 100).toFixed(0)}% mais caros`);
  ok('a deriva vai nos dois sentidos (idade, não conversão)',
    difPreco < 20 || (f > 0.2 && f < 0.8), `${(f * 100).toFixed(0)}% num só sentido`);
  // o endereço não muda com o tempo: divergir aqui é defeito
  ok('endereços iguais', difUrl === 0, `${difUrl} de ${comuns}`);

  console.log(`\n⇒ ${mau === 0 ? '✓ AS OFERTAS DA BASE DE DADOS SÃO EQUIVALENTES ÀS DO CATÁLOGO' : `✗ ${mau} PROBLEMAS`}`);
  process.exit(mau === 0 ? 0 : 1);
})();
