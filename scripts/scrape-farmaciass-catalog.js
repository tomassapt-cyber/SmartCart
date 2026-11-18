#!/usr/bin/env node
'use strict';
/**
 * CosMath — recolha da Farmácia Santos Salvador (farmaciass.pt; no KuantoKusta «FarmaciaSS.pt»)
 * ==============================================================================================
 * Ronda 10 de lojas candidatas (Desktop\duo\LOJAS-RONDA-10-2026-11-18.md). A loja publica no
 * próprio mapa do site o ficheiro de produtos que envia ao KuantoKusta (/kkfeedfarmaciass.xml,
 * ~5 700 produtos, ~5,7 MB): UM pedido por corrida, em vez de abrir fichas.
 *
 * Metade dos produtos traz EAN; todos trazem o CNP (<reference>, 7 dígitos). Só se juntam
 * ofertas a produtos que o catálogo já tem (scripts/integrate-farmaciass-catalog.js):
 *   · com EAN válido → esse EAN;
 *   · só com CNP → o EAN do ÚNICO produto nosso que outra loja publica com esse CNP
 *     (catálogos brutos em data/catalog), e com a marca a bater certo quando a loja a dá.
 *     CNP que aponta para vários produtos (código de linha) fica de fora.
 *
 * Bot declarado (UA do CosMath), robots.txt cumprido, pára em 403/429/desafio.
 * Saída: data/catalog/farmaciass-full.json
 * Uso: node scripts/scrape-farmaciass-catalog.js [--ensaio]   (--ensaio: feed parcial, o integrador recusa-o)
 */
const fs = require('fs'), path = require('path');
const { pedir } = require('./lib/fichas-existentes');
const { regrasRobots, gtinValido, Paragem } = require('./lib/shopify-existentes');
const { UA_COSMATH } = require('./lib/leitura-alargada');
const { normalizeBrand } = require('./lib/product-fingerprint');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = 'https://www.farmaciass.pt';
const FEED = ORIGEM + '/kkfeedfarmaciass.xml';
const SLUG = 'farmaciass';
const OUT = path.join(RAIZ, 'data', 'catalog', `${SLUG}-full.json`);
const MINIMO = 3000;   // a 18/11 eram 5 719
const ENSAIO = process.argv.includes('--ensaio');

const entidades = s => String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();
function campo(x, k) {
  const m = x.match(new RegExp(`<${k}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${k}>`));
  return m ? entidades(m[1]) : '';
}
/** «3,50» → 3.5; «1.234,50» → 1234.5; «12.9» → 12.9 */
function preco(s) {
  s = String(s || '').trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const v = Math.round(Number(s) * 100) / 100;
  return v > 0 ? v : null;
}

/** Produtos do ficheiro (formato do feed do KuantoKusta). */
function lerFeed(xml) {
  return (String(xml).match(/<product>[\s\S]*?<\/product>/g) || []).map(x => {
    const st = Number(campo(x, 'stock'));
    return { nome: campo(x, 'designation'), marca: campo(x, 'brand'), cnp: campo(x, 'reference'), ean: campo(x, 'ean'),
      preco: preco(campo(x, 'price')), em_stock: Number.isFinite(st) ? st > 0 : true, url: campo(x, 'product_url') };
  });
}

const chaveMarca = b => String(normalizeBrand(b) || b || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/^(laboratoires?|laboratorios?|labs?)\s+/, '').replace(/[^a-z0-9]/g, '');
const MARCA_GENERICA = /^(farmacia|farmaciasantossalvador|generico|outros?|diversos)?$/;
/** Sem marca (ou «Farmácia») não há prova contra; com marca, tem de ser a mesma (uma pode conter a outra). */
function marcaBate(marcaLoja, marcaProduto) {
  const a = chaveMarca(marcaLoja), b = chaveMarca(marcaProduto);
  if (MARCA_GENERICA.test(a) || !b) return true;
  return a === b || a.startsWith(b) || b.startsWith(a);
}

/** CNP → EANs de produtos do catálogo, pelos catálogos brutos das OUTRAS lojas que publicam os dois códigos. */
function indiceCnp(dirCatalogo, eansCatalogo) {
  const idx = new Map();
  const nosso = e => (eansCatalogo.has(e) ? e : eansCatalogo.has('0' + e) ? '0' + e : null);
  for (const f of fs.readdirSync(dirCatalogo).filter(f => /-(full|chunk-[\d-]+)\.json$/.test(f) && !f.startsWith(SLUG + '-'))) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(dirCatalogo, f), 'utf8')); } catch { continue; }
    for (const p of (j && j.products) || []) {
      const cnp = [p.cnp, p.sku].map(v => String(v ?? '').trim()).find(v => /^\d{7}$/.test(v));
      const ean = cnp && nosso(String(p.ean ?? '').trim());
      if (!ean) continue;
      if (!idx.has(cnp)) idx.set(cnp, new Set());
      idx.get(cnp).add(ean);
    }
  }
  return idx;
}

/** Linhas do feed para o integrador só-existentes. */
function linhas(itens, porEan, cnpIdx) {
  const out = [], usados = new Set();
  const contas = { ean: 0, cnp: 0, cnp_varios_produtos: 0, cnp_outra_marca: 0, sem_codigo_nosso: 0, repetido: 0, preco_invalido: 0, url_fora: 0 };
  const comEan = [], soCnp = [];
  for (const it of itens) (gtinValido(it.ean) ? comEan : soCnp).push(it);   // os com EAN primeiro: valem mais que o CNP
  for (const it of [...comEan, ...soCnp]) {
    if (!it.preco) { contas.preco_invalido++; continue; }
    if (!String(it.url).startsWith(ORIGEM + '/')) { contas.url_fora++; continue; }
    let ean = gtinValido(it.ean) ? it.ean : null, via = 'ean';
    if (!ean) {
      const s = /^\d{7}$/.test(it.cnp) ? cnpIdx.get(it.cnp) : null;
      if (!s) { contas.sem_codigo_nosso++; continue; }
      if (s.size !== 1) { contas.cnp_varios_produtos++; continue; }
      ean = [...s][0]; via = 'cnp';
      if (!gtinValido(ean)) { contas.sem_codigo_nosso++; continue; }   // o integrador recusa o feed inteiro com um GTIN inválido
      const p = porEan.get(ean);
      if (!marcaBate(it.marca, p && p.brand)) { contas.cnp_outra_marca++; continue; }
    }
    if (usados.has(ean)) { contas.repetido++; continue; }
    usados.add(ean); contas[via]++;
    out.push({ status: 'ok', ean, name: it.nome, brand: it.marca || null, price: it.preco, in_stock: it.em_stock, url: it.url, ...(via === 'cnp' ? { cnp: it.cnp } : {}) });
  }
  return { linhas: out, contas };
}

async function main() {
  const inicio = new Date().toISOString();
  const rob = await pedir(ORIGEM + '/robots.txt', null, { ua: UA_COSMATH });
  const regras = rob.estado === 200 ? regrasRobots(rob.corpo) : [];
  const r = await pedir(FEED, regras, { ua: UA_COSMATH });
  if (r.estado !== 200) throw new Error(`${FEED} devolveu ${r.estado}`);
  const itens = lerFeed(r.corpo);
  if (itens.length < MINIMO) throw new Error(`só ${itens.length} produtos no ficheiro (mínimo ${MINIMO}); não gravo`);
  const seed = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'seed-bundle.json'), 'utf8'));
  const porEan = new Map(seed.products.map(p => [String(p.ean), p]));
  const cnpIdx = indiceCnp(path.join(RAIZ, 'data', 'catalog'), new Set(porEan.keys()));
  const { linhas: products, contas } = linhas(itens, porEan, cnpIdx);
  const feed = { scraped_at: inicio, completed_at: new Date().toISOString(), source: FEED, in_progress: ENSAIO, feed_products: itens.length, cnp_index: cnpIdx.size, counts: contas, products };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT + '.tmp', JSON.stringify(feed)); fs.renameSync(OUT + '.tmp', OUT);
  console.log(`✓ ${itens.length} produtos no ficheiro → ${products.length} linhas (EAN ${contas.ean} · CNP ${contas.cnp}) · CNP de vários produtos ${contas.cnp_varios_produtos} · CNP de outra marca ${contas.cnp_outra_marca} · sem código nosso ${contas.sem_codigo_nosso} · repetidos ${contas.repetido} · índice CNP ${cnpIdx.size}${ENSAIO ? ' · ENSAIO (não se integra)' : ''}`);
}

module.exports = { lerFeed, preco, marcaBate, indiceCnp, linhas, FEED };
if (require.main === module) main().catch(e => { console.error(e instanceof Paragem ? '⛔ ' + e.message : '✗ ' + e.message); process.exit(1); });
