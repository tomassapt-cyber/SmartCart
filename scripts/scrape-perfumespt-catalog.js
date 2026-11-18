#!/usr/bin/env node
'use strict';
/**
 * CosMath — recolha da Perfumes.pt (perfumes.pt, Iperfumes Lda; Magento)
 * ======================================================================
 * Ronda 10 de lojas candidatas (Desktop\duo\LOJAS-RONDA-10-2026-11-18.md): numa amostra de 40
 * fichas, já temos 53% dos produtos e um terço desses tem 1–3 lojas; no KuantoKusta aparece
 * em 11 de 95 produtos fracos, muitas vezes com o preço mais baixo.
 *
 * Cada ficha (…_p12345.html) tem um ProductGroup com um Product por tamanho (hasVariant), e
 * o EAN de cada tamanho está no sku. O endereço não traz o EAN, por isso a loja lê-se em
 * ROTAÇÃO com memória (.cache-lojas/perfumespt-memoria.json, guardada na cache do Actions):
 *   1. fichas nunca lidas (descoberta);
 *   2. fichas que vendem um produto que o site mostra, primeiro as lidas há mais tempo;
 *   3. as restantes só de REVER_OUTRAS_DIAS em REVER_OUTRAS_DIAS dias (o catálogo cresce).
 * Lê até ao orçamento de tempo. O feed leva as linhas lidas nos últimos DIAS_FEED dias de
 * produtos que o site já tem, cada uma com a SUA data de leitura (verified_at).
 *
 * Só ofertas em produtos existentes (scripts/integrate-perfumespt-catalog.js). Bot declarado
 * (UA do CosMath), robots.txt e Crawl-delay cumpridos (a loja pede 1 s; usamos 1,2 s), pára ao
 * primeiro 403/429/desafio (scripts/lib/fichas-existentes.js).
 *
 * Saída: data/catalog/perfumespt-full.json
 * Uso: node scripts/scrape-perfumespt-catalog.js [--orcamento-min=100] [--limite=N]
 *      (com --limite é um ensaio: o feed sai parcial e o integrador recusa-o)
 */
const fs = require('fs'), path = require('path');
const { pedir, locs, crawlDelay } = require('./lib/fichas-existentes');
const { regrasRobots, gtinValido, Paragem } = require('./lib/shopify-existentes');
const { UA_COSMATH } = require('./lib/leitura-alargada');
const { eMaquilhagem } = require('./lib/classify-category');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = 'https://www.perfumes.pt';
const INDICE = ORIGEM + '/sitemap.xml';
const MAPA_PRODUTOS = /\/sitemap_products_pt_\d+\.xml$/;
const FICHA = /^https:\/\/www\.perfumes\.pt\/pt\/.+_p\d+\.html$/;
const OUT = path.join(RAIZ, 'data', 'catalog', 'perfumespt-full.json');
const MEMORIA = path.join(RAIZ, '.cache-lojas', 'perfumespt-memoria.json');
const DIAS_FEED = 6;            // abaixo dos 7 dias das ofertas podres (dropRottenOffers)
const REVER_OUTRAS_DIAS = 30;   // fichas sem produtos nossos: voltar a ver de mês a mês
const PAUSA_MIN = 1200;
const MINIMO_FICHAS = 5000;     // a 18/11 eram 7 748
const dorme = ms => new Promise(r => setTimeout(r, ms));
const nucleo = e => String(e).replace(/^0+/, '');

const arg = n => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1];
const LIMITE = Number(arg('limite')) || 0;
const ORCAMENTO_MS = (Number(arg('orcamento-min')) || 100) * 60000;

/** EANs dos produtos que o site mostra (sem maquilhagem nem fora de âmbito). */
function eansVisiveis(seed) {
  const s = new Set();
  for (const p of seed.products || []) {
    if (!p.ean || !p.name || eMaquilhagem(p.name, p.category, p.brand) || isNonCosmetic(p.name)) continue;
    s.add(nucleo(p.ean));
  }
  return s;
}

/** Todos os Product com oferta do JSON-LD (também os tamanhos de um ProductGroup), e a marca da ficha. */
function produtosDaFicha(html) {
  const produtos = []; let marca = null;
  for (const m of String(html).matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let j; try { j = JSON.parse(m[1].trim()); } catch { continue; }
    const pilha = [j];
    while (pilha.length) {
      const x = pilha.pop();
      if (Array.isArray(x)) { pilha.push(...[...x].reverse()); continue; }   // ao contrário: sai pela ordem da página
      if (!x || typeof x !== 'object') continue;
      const tipos = [].concat(x['@type'] || []);
      if (!marca && x.brand && (tipos.includes('Product') || tipos.includes('ProductGroup'))) marca = String(x.brand.name || x.brand).trim() || null;
      if (tipos.includes('Product') && x.offers) produtos.push(x);
      for (const k of ['hasVariant', '@graph']) if (x[k]) pilha.push(x[k]);
    }
  }
  return { produtos, marca };
}

const VOLUME = /\b\d+(?:[.,]\d+)?\s*(?:ml|gr|g|kg|l)\b/gi;
/**
 * Linha do feed para um tamanho. O nome do tamanho é «<nome da ficha> - <cor> / <tamanho>» e o
 * nome da ficha já traz um volume («… EDT 50ml - Única / 100 ml»): o integrador tira o volume do
 * nome, por isso a linha leva o nome sem volumes + o tamanho deste Product.
 */
function linhaDoProduto(url, p, marca) {
  const ean = [p.gtin13, p.gtin, p.gtin14, p.gtin12, p.sku].map(v => String(v ?? '').trim())
    .find(v => gtinValido(v) && !/^0{4}/.test(v));   // «0000030065949» é código interno, não EAN
  if (!ean) return { motivo: 'sem_gtin' };
  const of = [].concat(p.offers || [])[0] || {};
  const preco = Math.round(Number(of.price ?? of.lowPrice) * 100) / 100;
  if (!(preco > 0) || (of.priceCurrency && of.priceCurrency !== 'EUR')) return { motivo: 'preco_invalido' };
  let nome = String(p.name || '').replace(/\s+/g, ' ').trim();
  const tamanho = String(p.size || '').trim();
  if (tamanho && VOLUME.test(tamanho)) { VOLUME.lastIndex = 0; nome = `${nome.split(' - ')[0].replace(VOLUME, '').replace(/\s+/g, ' ').trim()} ${tamanho}`; }
  VOLUME.lastIndex = 0;
  return { linha: { status: 'ok', ean, name: nome, brand: marca, price: preco, in_stock: /InStock|LimitedAvailability|OnlineOnly/i.test(String(of.availability || '')), url } };
}

/** Linhas de uma ficha (uma por tamanho com EAN e preço), sem EANs repetidos. */
function linhasDaFicha(url, html) {
  const { produtos, marca } = produtosDaFicha(html);
  if (!produtos.length) return { linhas: [], motivo: 'sem_jsonld' };
  const linhas = [], vistos = new Set(); let motivo = null;
  for (const p of produtos) {
    const r = linhaDoProduto(url, p, marca);
    if (!r.linha) { motivo = motivo || r.motivo; continue; }
    if (vistos.has(r.linha.ean)) continue;
    vistos.add(r.linha.ean); linhas.push(r.linha);
  }
  return { linhas, motivo: linhas.length ? null : (motivo || 'sem_gtin') };
}

/** Fichas a ler, por ordem: nunca lidas; as que vendem produtos nossos (mais antigas primeiro); as outras ao fim de um mês. */
function planear(urls, visiveis, memoria, agora = Date.now()) {
  const lidoEm = u => (memoria[u] && memoria[u].lido_em) || '';
  const grupo = u => {
    const m = memoria[u];
    if (!m || !m.lido_em) return 0;
    if ((m.eans || []).some(e => visiveis.has(nucleo(e)))) return 1;
    return agora - Date.parse(m.lido_em) > REVER_OUTRAS_DIAS * 864e5 ? 2 : 3;
  };
  return [...new Set(urls)].filter(u => FICHA.test(u) && grupo(u) < 3)
    .sort((a, b) => grupo(a) - grupo(b) || (lidoEm(a) < lidoEm(b) ? -1 : lidoEm(a) > lidoEm(b) ? 1 : 0));
}

/** O feed: as linhas lidas nos últimos DIAS_FEED dias de produtos que o site mostra, com a data de cada uma. */
function feedDaMemoria(memoria, visiveis, agora = Date.now()) {
  const linhas = [];
  for (const [url, m] of Object.entries(memoria)) {
    if (!m || !m.lido_em || !Array.isArray(m.linhas)) continue;
    if (agora - Date.parse(m.lido_em) > DIAS_FEED * 864e5) continue;
    for (const l of m.linhas) if (visiveis.has(nucleo(l.ean))) linhas.push({ ...l, status: 'ok', url, verified_at: m.lido_em });
  }
  return linhas;
}

function lerMemoria() { try { return JSON.parse(fs.readFileSync(MEMORIA, 'utf8')); } catch { return {}; } }
function gravar(ficheiro, obj) {
  fs.mkdirSync(path.dirname(ficheiro), { recursive: true });
  fs.writeFileSync(ficheiro + '.tmp', JSON.stringify(obj));   // temporário + renomear: um corte a meio não estraga
  fs.renameSync(ficheiro + '.tmp', ficheiro);
}

async function main() {
  const t0 = Date.now(), inicio = new Date().toISOString();
  const seed = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'seed-bundle.json'), 'utf8'));
  const visiveis = eansVisiveis(seed);
  const memoria = lerMemoria();

  const rob = await pedir(ORIGEM + '/robots.txt', null, { ua: UA_COSMATH });
  const regras = rob.estado === 200 ? regrasRobots(rob.corpo) : [];
  const atraso = rob.estado === 200 ? crawlDelay(rob.corpo) : null;
  const pausa = Math.max(PAUSA_MIN, atraso ? atraso * 1000 + 200 : 0);
  const urls = [];
  await dorme(pausa);
  const indice = await pedir(INDICE, regras, { ua: UA_COSMATH });
  if (indice.estado !== 200) throw new Error(`${INDICE} devolveu ${indice.estado}`);
  for (const m of locs(indice.corpo).filter(u => MAPA_PRODUTOS.test(u))) {
    await dorme(pausa);
    const x = await pedir(m, regras, { ua: UA_COSMATH });
    if (x.estado !== 200) throw new Error(`${m} devolveu ${x.estado}`);
    urls.push(...locs(x.corpo));
  }
  const fichas = new Set(urls.filter(u => FICHA.test(u)));
  if (!LIMITE && fichas.size < MINIMO_FICHAS) throw new Error(`só ${fichas.size} fichas no mapa (mínimo ${MINIMO_FICHAS}); não gravo`);
  let fila = planear([...fichas], visiveis, memoria);
  // ensaio (--limite): fichas espalhadas pelo mapa — as primeiras são produtos antigos com código interno
  if (LIMITE && fila.length > LIMITE) fila = Array.from({ length: LIMITE }, (_, i) => fila[Math.floor(i * fila.length / LIMITE)]);
  console.log(`🗺  mapa: ${fichas.size} fichas · a ler nesta corrida (até ao orçamento): ${fila.length} · memória: ${Object.keys(memoria).length} · pausa ${pausa} ms`);

  const contas = { ok: 0, linhas: 0, sem_jsonld: 0, sem_gtin: 0, preco_invalido: 0, retiradas: 0, falhas: 0 };
  let lidas = 0;
  const alvo = LIMITE || fila.length;
  try {
    for (const u of fila) {
      if (lidas >= alvo || Date.now() - t0 > ORCAMENTO_MS) break;
      await dorme(pausa);
      const r = await pedir(u, regras, { ua: UA_COSMATH });
      lidas++;
      const hoje = new Date().toISOString();
      if (r.estado === 404 || r.estado === 410) { contas.retiradas++; delete memoria[u]; continue; }
      if (r.estado !== 200) { contas.falhas++; continue; }
      const { linhas, motivo } = linhasDaFicha(u, r.corpo);
      if (!linhas.length) { contas[motivo]++; memoria[u] = { estado: motivo, lido_em: hoje, eans: [] }; continue; }
      contas.ok++; contas.linhas += linhas.length;
      memoria[u] = { estado: 'ok', lido_em: hoje, eans: linhas.map(l => l.ean),
        linhas: linhas.map(({ ean, name, brand, price, in_stock }) => ({ ean, name, brand, price, in_stock })) };
      if (lidas % 250 === 0) { console.log(`  fichas: ${lidas}/${alvo} · ${Math.round((Date.now() - t0) / 60000)} min`); gravar(MEMORIA, memoria); }
    }
  } catch (e) {
    gravar(MEMORIA, memoria);   // o que já se leu vale; o feed é que não sai
    throw e;
  }
  gravar(MEMORIA, memoria);
  if (contas.falhas > Math.max(20, lidas * 0.1)) throw new Error(`${contas.falhas} de ${lidas} fichas falharam; não gravo o feed`);

  const products = feedDaMemoria(memoria, visiveis);
  const feed = {
    scraped_at: inicio, completed_at: new Date().toISOString(), source: ORIGEM, in_progress: Boolean(LIMITE),
    rotation: { fichas_no_mapa: fichas.size, fila: fila.length, lidas_nesta_corrida: lidas, dias_feed: DIAS_FEED }, counts: contas, pause_ms: pausa, products,
  };
  gravar(OUT, feed);
  const nossas = Object.values(memoria).filter(m => (m.eans || []).some(e => visiveis.has(nucleo(e)))).length;
  console.log(`✓ ${lidas} fichas lidas (${contas.ok} com EAN e preço, ${contas.linhas} tamanhos · sem GTIN ${contas.sem_gtin} · sem JSON-LD ${contas.sem_jsonld} · retiradas ${contas.retiradas} · falhas ${contas.falhas}) · fichas com produtos nossos na memória: ${nossas} · feed com ${products.length} linhas dos últimos ${DIAS_FEED} dias · ${Math.round((Date.now() - t0) / 60000)} min`);
}

module.exports = { produtosDaFicha, linhaDoProduto, linhasDaFicha, planear, feedDaMemoria, eansVisiveis, FICHA, DIAS_FEED, REVER_OUTRAS_DIAS };
if (require.main === module) main().catch(e => { console.error(e instanceof Paragem ? '⛔ ' + e.message : '✗ ' + e.message); process.exit(1); });
