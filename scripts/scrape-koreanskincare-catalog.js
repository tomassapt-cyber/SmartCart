#!/usr/bin/env node
'use strict';
/**
 * CosMath — recolha da Korean Skincare (koreanskincare.pt; Korean Skincare, Veldhoven, Países Baixos)
 * ==================================================================================================
 * Ronda 11 de lojas (25/11/2026, pedida pelo Tomás): Shopify, ~3 900 fichas, EAN em 97% das
 * variantes. Numa amostra de 250 fichas, já temos 33% dos produtos e 65% desses têm 1–3 lojas.
 * Envia de armazéns na Europa (sem alfândega). Não está no KuantoKusta.
 *
 * O /products.json em bloco responde 429 ao nosso robô, por isso cada produto lê-se no seu
 * /products/<handle>.js (~5 KB: EAN, preço, preço riscado e stock de cada variante), um de
 * cada vez, com pausa. Para caber no tempo, lê-se em ROTAÇÃO com memória
 * (.cache-lojas/koreanskincare-memoria.json, guardada na cache do Actions):
 *   1. fichas nunca lidas (descoberta);
 *   2. fichas que vendem um produto que o site mostra, primeiro as lidas há mais tempo;
 *   3. as restantes só de REVER_OUTRAS_DIAS em REVER_OUTRAS_DIAS dias.
 * Lê até ao orçamento de tempo. O feed leva as linhas lidas nos últimos DIAS_FEED dias de
 * produtos que o site já tem, cada uma com a SUA data de leitura (verified_at): o integrador
 * substitui as ofertas da loja pelas do feed, por isso o feed tem de trazer o conjunto todo.
 *
 * Só ofertas em produtos existentes (scripts/integrate-koreanskincare-catalog.js). Robô do
 * CosMath, robots.txt cumprido. Num 403/429/desafio pára de ler, guarda a memória e o feed
 * sai do que já foi lido (cada linha com a data verdadeira; sem leituras novas, falha).
 *
 * Saída: data/catalog/koreanskincare-full.json
 * Uso: node scripts/scrape-koreanskincare-catalog.js [--orcamento-min=100] [--limite=N]
 *      (com --limite é um ensaio: o feed sai parcial e o integrador recusa-o)
 */
const fs = require('fs'), path = require('path');
const { pedir, locs } = require('./lib/fichas-existentes');
const { regrasRobots, gtinValido, Paragem } = require('./lib/shopify-existentes');
const { UA_COSMATH } = require('./lib/identidade');
const { eMaquilhagem } = require('./lib/classify-category');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = 'https://koreanskincare.pt';
const MAPA_PRODUTOS = /\/sitemap_products_\d+\.xml(\?|$)/;
const FICHA = /^https:\/\/koreanskincare\.pt\/products\/[^/?#.]+$/;   // handles da Shopify não têm pontos
const OUT = path.join(RAIZ, 'data', 'catalog', 'koreanskincare-full.json');
const MEMORIA = path.join(RAIZ, '.cache-lojas', 'koreanskincare-memoria.json');
const DIAS_FEED = 6;            // abaixo dos 7 dias das ofertas podres (dropRottenOffers)
const REVER_OUTRAS_DIAS = 30;   // fichas sem produtos nossos: voltar a ver de mês a mês
const PAUSA_MS = 2000;          // a amostra de 25/11 leu 250 fichas a 2 s sem um 429
const MINIMO_FICHAS = 3000;     // a 25/11 eram 3 924
const LOJA_COMO_MARCA = /^korean skincare$/i;   // produtos sem marca vêm com o nome da loja
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

/** Linhas de um produto (o .js da Shopify): uma por variante com EAN válido e preço, sem EANs repetidos. */
function linhasDoJs(url, j) {
  const vs = Array.isArray(j && j.variants) ? j.variants : [];
  if (!vs.length) return { linhas: [], motivo: 'sem_variantes' };
  const marca = String(j.vendor || '').trim();
  const linhas = [], vistos = new Set(); let motivo = null;
  for (const v of vs) {
    const ean = String(v.barcode == null ? '' : v.barcode).trim();
    if (!gtinValido(ean) || /^0{4}/.test(ean)) { motivo = motivo || 'sem_gtin'; continue; }
    const preco = Number(v.price) / 100, riscado = Number(v.compare_at_price) / 100;
    if (!(preco > 0)) { motivo = motivo || 'preco_invalido'; continue; }
    if (vistos.has(ean)) continue;
    vistos.add(ean);
    const variante = vs.length > 1 && v.title && !/^default title$/i.test(v.title) ? ` - ${v.title}` : '';
    const linha = {
      ean, name: `${String(j.title || '').replace(/\s+/g, ' ').trim()}${variante}`,
      brand: marca && !LOJA_COMO_MARCA.test(marca) ? marca : null,
      price: Math.round(preco * 100) / 100, in_stock: v.available === true,
      url: vs.length > 1 ? `${url}?variant=${v.id}` : url,
    };
    if (riscado > preco) linha.previous_price = Math.round(riscado * 100) / 100;
    linhas.push(linha);
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
  for (const m of Object.values(memoria)) {
    if (!m || !m.lido_em || !Array.isArray(m.linhas)) continue;
    if (agora - Date.parse(m.lido_em) > DIAS_FEED * 864e5) continue;
    for (const l of m.linhas) if (visiveis.has(nucleo(l.ean))) linhas.push({ ...l, status: 'ok', verified_at: m.lido_em });
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
  await dorme(PAUSA_MS);
  const indice = await pedir(ORIGEM + '/sitemap.xml', regras, { ua: UA_COSMATH });
  if (indice.estado !== 200) throw new Error(`sitemap.xml devolveu ${indice.estado}`);
  const urls = [];
  for (const m of locs(indice.corpo).filter(u => MAPA_PRODUTOS.test(u))) {
    await dorme(PAUSA_MS);
    const x = await pedir(m, regras, { ua: UA_COSMATH });
    if (x.estado !== 200) throw new Error(`${m} devolveu ${x.estado}`);
    urls.push(...locs(x.corpo).map(u => u.split('?')[0]));
  }
  const fichas = new Set(urls.filter(u => FICHA.test(u)));
  if (!LIMITE && fichas.size < MINIMO_FICHAS) throw new Error(`só ${fichas.size} fichas no mapa (mínimo ${MINIMO_FICHAS}); não gravo`);
  // a memória só guarda o que ainda está no mapa
  for (const u of Object.keys(memoria)) if (!fichas.has(u)) delete memoria[u];
  let fila = planear([...fichas], visiveis, memoria);
  // ensaio (--limite): fichas espalhadas pelo mapa
  if (LIMITE && fila.length > LIMITE) fila = Array.from({ length: LIMITE }, (_, i) => fila[Math.floor(i * fila.length / LIMITE)]);
  console.log(`🗺  mapa: ${fichas.size} fichas · a ler nesta corrida (até ao orçamento de ${Math.round(ORCAMENTO_MS / 60000)} min): ${fila.length} · memória: ${Object.keys(memoria).length} · pausa ${PAUSA_MS} ms`);

  const contas = { ok: 0, linhas: 0, sem_variantes: 0, sem_gtin: 0, preco_invalido: 0, retiradas: 0, falhas: 0 };
  let lidas = 0, parou = null;
  try {
    for (const u of fila) {
      if (Date.now() - t0 > ORCAMENTO_MS) break;
      await dorme(PAUSA_MS);
      const r = await pedir(`${u}.js`, regras, { ua: UA_COSMATH });
      lidas++;
      const agora = new Date().toISOString();
      if (r.estado === 404 || r.estado === 410) { contas.retiradas++; delete memoria[u]; continue; }
      if (r.estado !== 200) { contas.falhas++; continue; }
      let j; try { j = JSON.parse(r.corpo); } catch { contas.falhas++; continue; }
      const { linhas, motivo } = linhasDoJs(u, j);
      if (!linhas.length) { contas[motivo]++; memoria[u] = { estado: motivo, lido_em: agora, eans: [] }; continue; }
      contas.ok++; contas.linhas += linhas.length;
      memoria[u] = { estado: 'ok', lido_em: agora, eans: linhas.map(l => l.ean), linhas };
      if (lidas % 200 === 0) { console.log(`  fichas: ${lidas}/${fila.length} · ${Math.round((Date.now() - t0) / 60000)} min`); gravar(MEMORIA, memoria); }
    }
  } catch (e) {
    if (!(e instanceof Paragem)) { gravar(MEMORIA, memoria); throw e; }
    parou = e.message;   // 403/429/desafio: não insistir; o que já se leu vale
    console.log(`⛔ parou de ler: ${parou}`);
  }
  gravar(MEMORIA, memoria);
  if (parou && !lidas) throw new Error(`a loja recusou logo o primeiro pedido (${parou}); não gravo o feed`);
  if (contas.falhas > Math.max(20, lidas * 0.1)) throw new Error(`${contas.falhas} de ${lidas} fichas falharam; não gravo o feed`);

  const products = feedDaMemoria(memoria, visiveis);
  const feed = {
    scraped_at: inicio, completed_at: new Date().toISOString(), source: ORIGEM, in_progress: Boolean(LIMITE),
    rotation: { fichas_no_mapa: fichas.size, fila: fila.length, lidas_nesta_corrida: lidas, dias_feed: DIAS_FEED, parou },
    counts: contas, pause_ms: PAUSA_MS, products,
  };
  gravar(OUT, feed);
  const nossas = Object.values(memoria).filter(m => (m.eans || []).some(e => visiveis.has(nucleo(e)))).length;
  console.log(`✓ ${lidas} fichas lidas (${contas.ok} com EAN e preço, ${contas.linhas} variantes · sem GTIN ${contas.sem_gtin} · retiradas ${contas.retiradas} · falhas ${contas.falhas}) · fichas com produtos nossos na memória: ${nossas} · feed com ${products.length} linhas dos últimos ${DIAS_FEED} dias · ${Math.round((Date.now() - t0) / 60000)} min`);
}

module.exports = { linhasDoJs, planear, feedDaMemoria, eansVisiveis, FICHA, MAPA_PRODUTOS, DIAS_FEED, REVER_OUTRAS_DIAS };
if (require.main === module) main().catch(e => { console.error(e instanceof Paragem ? '⛔ ' + e.message : '✗ ' + e.message); process.exit(1); });
