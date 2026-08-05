#!/usr/bin/env node
/**
 * Índice de pesquisa — Fase 4a do aligeiramento da página.
 * ============================================================================
 * O QUE É: um ficheiro com o mínimo que a página precisa para PESQUISAR,
 * FILTRAR e ORDENAR os 50 mil produtos sem ter o catálogo inteiro em memória.
 * Não traz ofertas nenhumas — essas vêm à peça, da base de dados, quando a
 * pessoa abre um produto.
 *
 * NESTA FASE SÓ SE GERA E COMPARA. A página continua a levar o catálogo todo;
 * nada lê este ficheiro ainda. É de propósito: primeiro prova-se que os números
 * batem certo com os que o site calcula hoje, e só depois se troca a fonte.
 *
 * O QUE LEVA, e porquê cada campo (levantamento de 126 funcionalidades):
 *   ean          — o scanner, a prateleira, a rotina, o carrinho e o clique em
 *                  qualquer cartão funcionam todos por EAN. Sem isto o scanner
 *                  passa a responder "ainda não temos este produto".
 *   nome, marca  — a pesquisa e as sugestões enquanto se escreve.
 *   categoria    — o site pesquisa em nome+marca+CATEGORIA (demo.html:8421).
 *                  Sem ela, procurar "perfume" deixa de devolver o que devolve.
 *   nº de lojas  — é o que domina a ordenação "Popular", que é a ORDEM POR
 *                  DEFEITO de todo o catálogo e de toda a pesquisa.
 *   min/max      — as abas "Preço ↑", "Preço ↓" e "Maior poupança" ordenam
 *                  sobre o conjunto filtrado INTEIRO (milhares de produtos),
 *                  não sobre os 8 que se mostram. Sem estes dois números essas
 *                  abas tinham de desaparecer.
 *   promoção     — o filtro "Em promoção".
 *
 * ⚠️ A FÓRMULA DOS PREÇOS É A DO SITE, não a da base de dados. O site mostra o
 * preço AO VOLUME DE REFERÊNCIA (products.min_price da BD é o preço de montra e
 * dá números diferentes). Misturá-los daria uma lista visivelmente mal ordenada
 * — foi um bug real no /app.html, com 59 em 60 cartões a mostrar o preço errado.
 *
 * Uso:
 *   node scripts/build-search-index.js [--out=<ficheiro>] [--quiet]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const QUIET = !!args.quiet;

// ── as mesmas contas que o cliente faz (demo.html) ──────────────────────────
// Réplica deliberada e comentada. O verificador (scripts/verify-search-index.js)
// extrai as funções REAIS do demo.html e compara campo a campo — se estas
// divergirem, o verificador acusa.

/** volume escrito no nome do produto, em ml/g (demo.html: _volFromName) */
function volDoNome(nome) {
  if (!nome) return null;
  const m = String(nome).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.')), u = m[2].toLowerCase();
  return (u === 'l' || u === 'kg') ? n * 1000 : n;
}

/** o volume a que se compara este produto (demo.html: refVolumeFor) */
function volumeDeReferencia(nome, ofertas) {
  const doNome = volDoNome(nome);
  if (doNome) return doNome;
  const contagem = {};
  for (const o of ofertas) {
    if (!o.in_stock) continue;
    for (const v of (o.variants || [])) {
      if (v.price > 0 && v.volume_ml) contagem[v.volume_ml] = (contagem[v.volume_ml] || 0) + 1;
    }
  }
  const top = Object.entries(contagem).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  return top ? Number(top[0]) : null;
}

/**
 * Preço desta oferta ao volume de referência (demo.html:8627, offerPriceAtVol).
 *
 * ⚠️ SEM verificar in_stock da variante. Esta versão tinha um
 * `&& x.in_stock !== false` a mais, copiado de scripts/build-homepage-data.js
 * — que tem uma réplica DIFERENTE da do site. Uma condição a mais e os preços
 * mudavam nos dois sentidos (53,37 → 29,99 num caso, 11,99 → 13,45 noutro).
 * Quando houver duas versões da mesma conta no repositório, a que vale é a do
 * demo.html: é ela que faz o que o utilizador vê.
 */
function precoAoVolume(oferta, volRef) {
  if (!volRef || !oferta.variants || !oferta.variants.length) return oferta.price;
  const v = oferta.variants.find(x => x.volume_ml === volRef && x.price > 0);
  return v ? v.price : null;
}

/** a oferta é "real" ou é estimativa? (demo.html: hasRealData) */
function temDadosReais(oferta) {
  return oferta.verified === true
    || /scraped|canonical/i.test(oferta.source || '')
    || (oferta.variants && oferta.variants.some(v => v.price > 0));
}

/** texto pesquisável — nome + marca + categoria (demo.html:8421, _snorm) */
function textoPesquisavel(nome, marca, categoria) {
  return ((nome || '') + ' ' + (marca || '') + ' ' + (categoria || ''))
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}


/**
 * O bloco de arranque: o mínimo para a primeira vista, sem rede.
 * Recebe o índice já construído (tem tudo o que é preciso).
 */
function construirArranque(indice, seed) {
  // ── popularidade, com a MESMA fórmula do cliente (demo.html) ──────────────
  // POPULARITY_SCORE[ean] = storeCount*1000 + min(savings,50)*5 - bestPrice*0.01
  const pop = [];
  for (let i = 0; i < indice.n; i++) {
    const lojas = indice.s[i];
    if (!lojas) continue;
    const min = indice.mn[i] < 0 ? null : indice.mn[i] / 100;
    const max = indice.mx[i] < 0 ? null : indice.mx[i] / 100;
    const poupanca = (min != null && max != null) ? +(max - min).toFixed(2) : 0;
    pop.push({
      i,
      score: lojas * 1000 + Math.min(poupanca, 50) * 5 - (min ?? 9999) * 0.01,
      lojas, min, max, poupanca,
    });
  }
  pop.sort((a, b) => b.score - a.score);

  // ── HIGHLIGHTS: as etiquetas Viral/Novo/Bestseller (demo.html ~8140) ──────
  const porLojas = [...pop].sort((a, b) =>
    b.lojas - a.lojas || (a.min ?? 9999) - (b.min ?? 9999));
  const porMisto = [...pop].sort((a, b) =>
    (b.lojas * 20 - (b.min ?? 9999)) - (a.lojas * 20 - (a.min ?? 9999)));
  const porPoupanca = pop.filter(x => x.lojas > 1).sort((a, b) => b.poupanca - a.poupanca);
  const ean = x => indice.e[x.i];
  const highlights = {
    newReleases: porLojas.slice(0, 4).map(ean),
    bestSellers: porMisto.slice(0, 4).map(ean),
    tiktok: porPoupanca.slice(0, 4).map(ean),
  };

  // ── contagens (hoje custam varrer os 58 mil no arranque) ──────────────────
  const porCategoria = {};
  for (let i = 0; i < indice.n; i++) {
    const c = indice.cats[indice.c[i]] || '';
    if (c) porCategoria[c] = (porCategoria[c] || 0) + 1;
  }
  const porMarca = {};
  for (let i = 0; i < indice.n; i++) {
    const m = indice.brands[indice.b[i]] || '';
    if (m) porMarca[m] = (porMarca[m] || 0) + 1;
  }
  const marcasTop = Object.entries(porMarca)
    .sort((a, b) => b[1] - a[1]).slice(0, 40)
    .map(([nome, n]) => ({ nome, n }));

  // ── os ~150 mais populares, com o que o cartão precisa ────────────────────
  // 150 e nao 8: a ordem final e calculada no CLIENTE (baralhamento por epoca),
  // por isso manda-se um superconjunto largo o suficiente para cobrir qualquer
  // ordem que ele produza nas primeiras paginas.
  const imgPorEan = new Map();
  for (const p of (seed.products || [])) if (p.image_url) imgPorEan.set(p.ean, p.image_url);
  const primeiros = pop.slice(0, 150).map(x => ({
    ean: indice.e[x.i],
    nome: indice.nm[x.i],
    marca: indice.brands[indice.b[x.i]] || null,
    cat: indice.cats[indice.c[x.i]] || null,
    lojas: x.lojas,
    min: x.min,
    max: x.max,
    promo: indice.pr[x.i] === 1,
    img: imgPorEan.get(indice.e[x.i]) || null,
  }));

  // As lojas: nome, endereço e portes. Sem elas o cartão não sabe dizer
  // "@ Farmácia X" nem calcular o custo total com envio.
  const lojas = (seed.stores || []).map(s => ({
    slug: s.slug,
    nome: s.name,
    url: s.base_url,
    gratis: s.free_shipping_threshold ?? null,
    portes: s.shipping_zones || null,
  }));

  return {
    v: 1,
    lojas,
    totais: { produtos: indice.n, marcas: indice.brands.length },
    categorias: porCategoria,
    marcas: marcasTop,
    highlights,
    primeiros,
  };
}

// ── construção ──────────────────────────────────────────────────────────────
function construirIndice(seed) {
  // Ofertas por EAN, só as VISÍVEIS (o site esconde estimativas por omissão).
  //
  // ⚠️ UMA OFERTA POR LOJA, A ÚLTIMA. O site guarda-as em
  // OFFERS_BY_PRODUCT[ean][store_slug] — um objecto indexado pela loja — logo,
  // quando a MESMA loja tem duas ofertas para o mesmo produto, fica só a
  // última. Acontece a sério: a atida tem o 3282770201949 a 31,99 e a 49,99.
  // A primeira versão disto guardava as duas numa lista e dava 62 produtos com
  // nº de lojas e preços diferentes dos que o site mostra. Foi o verificador
  // que apanhou — é exactamente para isto que ele existe.
  const porEan = new Map();
  for (const sp of seed.store_products) {
    for (const it of (sp.items || [])) {
      if (!temDadosReais(it)) continue;         // HIDE_ESTIMATES = true (o default)
      if (!porEan.has(it.ean)) porEan.set(it.ean, new Map());
      porEan.get(it.ean).set(sp.store_slug, it);   // a última da loja ganha
    }
  }

  const marcas = [], iMarca = new Map();
  const cats = [], iCat = new Map();
  const idx = (lista, mapa, v) => {
    const k = v || '';
    if (!mapa.has(k)) { mapa.set(k, lista.length); lista.push(k); }
    return mapa.get(k);
  };

  const e = [], nm = [], b = [], c = [], s = [], mn = [], mx = [], pr = [];
  let semOfertas = 0;

  for (const p of seed.products) {
    const ofertas = [...(porEan.get(p.ean) || new Map()).values()].filter(o => o.in_stock);
    const volRef = volumeDeReferencia(p.name, ofertas);

    let precos = ofertas.map(o => precoAoVolume(o, volRef)).filter(v => v != null);
    if (precos.length === 0) precos = ofertas.map(o => o.price).filter(v => v != null);

    const min = precos.length ? Math.min(...precos) : null;
    const max = precos.length ? Math.max(...precos) : null;
    if (!precos.length) semOfertas++;

    // "tem promoção": alguma oferta visível com preço anterior mais alto
    const promo = ofertas.some(o => o.previous_price != null && o.previous_price > o.price) ? 1 : 0;

    e.push(p.ean);
    nm.push(p.name || '');
    b.push(idx(marcas, iMarca, p.brand));
    c.push(idx(cats, iCat, p.category));
    s.push(ofertas.length);
    // preços em CÊNTIMOS (inteiros ocupam menos do que decimais no JSON)
    mn.push(min == null ? -1 : Math.round(min * 100));
    mx.push(max == null ? -1 : Math.round(max * 100));
    pr.push(promo);
  }

  return {
    indice: { v: 1, n: e.length, brands: marcas, cats, e, nm, b, c, s, mn, mx, pr },
    semOfertas,
  };
}

if (require.main === module) {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
  const { isNonCosmetic } = require('./lib/product-fingerprint');

  // MESMA cadeia e MESMA ordem do inject — senão o índice fala de um catálogo
  // que não é o que a página mostra.
  require('./lib/verified-shipping').applyVerifiedShipping(seed, ROOT);
  const vf = require('./lib/variant-fixes');
  vf.fixTruncatedVariantPrices(seed);
  vf.dropWrongProductVariants(seed);
  require('./dedup-ean-variants').mergeEanVariants(seed);
  require('./lib/promo-fold').foldPromoVariants(seed);
  require('./lib/ghost-offers').dropGhostOffers(seed);
  const cv = require('./lib/catalog-visibility');
  cv.dropRottenOffers(seed);
  cv.applyVisibilityFilter(seed, isNonCosmetic);
  require('./lib/name-cleanup').applyNameCleanup(seed);

  const { indice, semOfertas } = construirIndice(seed);

  const buf = Buffer.from(JSON.stringify(indice), 'utf8');
  const versao = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
  const OUT_DIR = path.join(ROOT, 'data', 'idx');
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const nome = `search-${versao}.json`;
  fs.writeFileSync(path.join(OUT_DIR, nome), buf);
  fs.writeFileSync(path.join(OUT_DIR, 'versao.txt'), versao);

  // bloco de arranque: vai para data/, e o inject mete-o dentro do #hp-data
  const arranque = construirArranque(indice, seed);
  fs.writeFileSync(path.join(ROOT, 'data', 'startup-block.json'), JSON.stringify(arranque));
  if (!QUIET) {
    const g = zlib.gzipSync(Buffer.from(JSON.stringify(arranque)), { level: 6 }).length;
    console.log(`🚀 bloco de arranque: ${(g / 1024).toFixed(0)} KB gz · ${arranque.lojas.length} lojas · ${arranque.primeiros.length} produtos · ${Object.keys(arranque.categorias).length} categorias · ${arranque.marcas.length} marcas`);
  }

  if (!QUIET) {
    const gz = zlib.gzipSync(buf, { level: 6 }).length;
    const comTexto = zlib.gzipSync(Buffer.from(JSON.stringify({ e: indice.e, nm: indice.nm, b: indice.b, c: indice.c, brands: indice.brands, cats: indice.cats })), { level: 6 }).length;
    console.log(`🔎 índice de pesquisa: data/idx/${nome}`);
    console.log(`   ${indice.n} produtos · ${indice.brands.length} marcas · ${indice.cats.length} categorias`);
    console.log(`   ${(buf.length / 1048576).toFixed(2)} MB → ${(gz / 1048576).toFixed(2)} MB comprimido`);
    console.log(`     texto (ean+nome+marca+categoria): ${(comTexto / 1024).toFixed(0)} KB gz`);
    console.log(`     números (lojas+min+max+promo):    ${((gz - comTexto) / 1024).toFixed(0)} KB gz`);
    console.log(`   produtos sem preço visível: ${semOfertas}`);
    console.log(`   página hoje: 8,59 MB gz  →  com o índice: ~${((190 * 1024 + gz) / 1048576).toFixed(2)} MB`);
  }
}

module.exports = { construirIndice, construirArranque, textoPesquisavel, volumeDeReferencia, precoAoVolume, temDadosReais };
