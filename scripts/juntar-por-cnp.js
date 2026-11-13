#!/usr/bin/env node
/**
 * CosMath — juntar ofertas pelo CNP «seguro» (2026-11-13, ordem de trabalho da auditoria)
 * ======================================================================================
 * Muitas farmácias publicam só o CNP (7 dígitos), sem EAN. Os integradores casam-nas
 * pelo CNP só através de ofertas de OUTRAS lojas no seed com o mesmo URL, e o
 * apply-cnp-merge só resgata fichas sintéticas; o resto ficava de fora (auditoria de
 * 06/11: ~5 700 ofertas em produtos que já temos, 25/25 certas na amostra).
 *
 * Este passo corre depois das lojas e junta essas ofertas ao produto do EAN certo:
 *   • dicionário CNP → EAN «seguro»: o par aparece em 2+ lojas e NENHUMA loja dá
 *     outro EAN para o mesmo CNP (o CNP às vezes é código de linha);
 *   • a marca do produto tem de estar no nome ou na marca da loja;
 *   • tamanho: o do nome da loja e o do produto não podem diferir mais de 6%;
 *   • preço: no máximo 3× fora do intervalo das outras lojas para esse produto;
 *   • nenhum sinal de produto diferente (sinalDeProdutoDiferente: quantidades, SPF,
 *     tom…), marcas sem conflito e sem variantes opostas (suave/média/dura);
 *   • só produtos de cosmética que o site mostra (sem maquilhagem);
 *   • nunca toca numa oferta que a loja já tem nesse produto (é do integrador dela),
 *     exceto as que este passo criou (source = juntar-por-cnp), que refresca;
 *   • salta a página se o endereço já está noutra ficha da mesma loja;
 *   • ignora as lojas bloqueadas e em espera.
 * Só acrescenta/atualiza ofertas; não cria nem renomeia produtos.
 *
 * Uso: node scripts/juntar-por-cnp.js [--dry-run] [--inject]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { normalizeBrand, extractVolumeMl, sinalDeProdutoDiferente, isNonCosmetic, canonicalName } = require('./lib/product-fingerprint');
const { eMaquilhagem } = require('./lib/classify-category');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const FONTE = 'juntar-por-cnp';
const SLUG = { lojafarmacia: 'loja-farmacia', pharmagdd: 'pharma-gdd' };
const ler = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const isCnp = s => /^\d{7}$/.test(String(s || '').trim());
const gtin = e => { const s = String(e || '').trim(); return /^\d{8,14}$/.test(s) ? s : null; };
const semZeros = e => String(e).replace(/^0+/, '');

/** CNP → EAN só quando 2+ lojas dão o mesmo par e nenhuma o contradiz. */
function dicionarioSeguro(catalogos) {
  const pares = new Map();   // cnp → Map(ean sem zeros → Set(lojas))
  for (const [loja, produtos] of catalogos) for (const p of produtos) {
    const e = gtin(p.ean), c = String(p.cnp || '').trim();
    if (!e || !isCnp(c)) continue;
    const m = pares.get(c) || pares.set(c, new Map()).get(c);
    const k = semZeros(e);
    (m.get(k) || m.set(k, new Set()).get(k)).add(loja);
  }
  const seguro = new Map();
  for (const [c, m] of pares) if (m.size === 1) { const [[e, lojas]] = [...m]; if (lojas.size >= 2) seguro.set(c, e); }
  return seguro;
}

function marcaBate(produto, item) {
  const b = normalizeBrand(produto.brand || '');
  if (!b) return true;
  const alvo = normalizeBrand(item.brand || '') + ' ' + normalizeBrand(item.name || '');
  return alvo.includes(b) || String(item.name || '').toLowerCase().includes(String(produto.brand).toLowerCase());
}
// marcas conhecidas dos dois lados e diferentes → é outro produto (Aposan ≠ Farline)
function marcasEmConflito(produto, item) {
  const a = normalizeBrand(produto.brand || ''), b = normalizeBrand(item.brand || '');
  return Boolean(a && b && a !== b && !a.includes(b) && !b.includes(a));
}
// variantes opostas no nome (escova média ≠ suave)
const OPOSTOS = /\b(extra[ -]?suave|ultra[ -]?soft|suave|soft|media|medio|medium|dura|duro|hard)\b/gi;
function variantesOpostas(produto, item) {
  const tira = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const a = new Set((tira(produto.name).match(OPOSTOS) || []).map(x => x.replace(/[ -]/g, ''))), b = new Set((tira(item.name).match(OPOSTOS) || []).map(x => x.replace(/[ -]/g, '')));
  return a.size > 0 && b.size > 0 && ![...a].some(x => b.has(x));
}
// pelo menos metade das palavras do nome mais curto no outro (sem marca nem ruído):
// «BOW Perfume Betty» ≠ «BOW Eau de Parfum Nancy»; «Avène Solar» é vago demais
function nomesBatem(produto, item) {
  const pal = n => new Set(canonicalName(n || '', produto.brand).split('-').filter(x => x.length > 1));
  const a = pal(item.name), b = pal(produto.name);
  let comuns = 0; for (const x of a) if (b.has(x)) comuns++;
  return comuns > 0 && comuns / Math.min(a.size, b.size) >= 0.5;
}
function tamanhoBate(produto, item) {
  const a = extractVolumeMl(item.name || ''), b = extractVolumeMl(produto.name || '');
  return !(a && b && Math.abs(a - b) / Math.max(a, b) > 0.06);
}

/**
 * Junta no `seed` (alterado no lugar) as ofertas CNP-only das lojas.
 * catalogos: Map(slug → produtos crus). Devolve contas por loja.
 */
function juntar(seed, catalogos, { ignorar = new Set() } = {}) {
  const dic = dicionarioSeguro(catalogos);
  const porEan = new Map();
  for (const p of seed.products) porEan.set(semZeros(p.ean), p);
  const faixa = new Map();   // ean → {min,max} dos preços atuais
  for (const g of seed.store_products) for (const it of g.items) if (it.price > 0) {
    const f = faixa.get(it.ean) || faixa.set(it.ean, { min: it.price, max: it.price }).get(it.ean);
    if (it.price < f.min) f.min = it.price; if (it.price > f.max) f.max = it.price;
  }
  const contas = {};
  for (const [loja, produtos] of catalogos) {
    if (ignorar.has(loja)) continue;
    let sp = seed.store_products.find(g => g.store_slug === loja);
    if (!sp) continue;   // loja sem ofertas no seed: não é este passo que a cria
    const itemByEan = {}; for (const it of sp.items) itemByEan[it.ean] = it;
    const urlsDaLoja = new Map(); for (const it of sp.items) if (it.url) urlsDaLoja.set(String(it.url).split('#')[0], it.ean);
    const c = contas[loja] = { candidatos: 0, novas: 0, atualizadas: 0, marca: 0, diferente: 0, tamanho: 0, preco: 0, ja_tem: 0, url_noutra: 0 };
    const addedCounter = { value: 0 }, updatedCounter = { value: 0 };
    for (const item of produtos) {
      if (item.status && item.status !== 'ok') continue;
      if (gtin(item.ean) && porEan.has(semZeros(item.ean))) continue;   // tem EAN de um produto nosso: é do integrador
      const cnp = String(item.cnp || '').trim();
      const e = isCnp(cnp) && dic.get(cnp);
      const alvo = e && porEan.get(e);
      if (!alvo) continue;
      if (isNonCosmetic(alvo.name || '') || eMaquilhagem(alvo.name, alvo.category, alvo.brand)) continue;   // o site não o mostra
      c.candidatos++;
      const existente = itemByEan[alvo.ean];
      if (existente && existente.source !== FONTE) { c.ja_tem++; continue; }
      const url = String(item.url || '').split('#')[0];
      const outra = url && urlsDaLoja.get(url);
      if (outra && outra !== alvo.ean) { c.url_noutra++; continue; }
      if (!marcaBate(alvo, item) || marcasEmConflito(alvo, item)) { c.marca++; continue; }
      if (sinalDeProdutoDiferente({ name: item.name, brand: item.brand || alvo.brand }, { name: alvo.name, brand: alvo.brand }) || variantesOpostas(alvo, item) || !nomesBatem(alvo, item)) { c.diferente++; continue; }
      if (!tamanhoBate(alvo, item)) { c.tamanho++; continue; }
      const f = faixa.get(alvo.ean);
      if (f && item.price > 0 && (item.price > f.max * 3 || item.price < f.min / 3)) { c.preco++; continue; }
      const r = upsertStoreItem({ storeSp: sp, itemByEan, addedCounter, updatedCounter }, alvo.ean,
        { name: item.name, price: item.price, url: item.url, in_stock: item.in_stock, variants: [], previous_price: item.previous_price || null, scraped_at: item.scraped_at }, item.scraped_at);
      const it = itemByEan[alvo.ean];
      if (it && (r.action === 'added' || it.source === FONTE)) { it.source = FONTE; it.cnp = cnp; }
      if (r.action === 'added') { c.novas++; if (url) urlsDaLoja.set(url, alvo.ean); }
      else if (r.action === 'merged') c.atualizadas++;
    }
  }
  return { contas, dicionario: dic.size };
}

module.exports = { dicionarioSeguro, juntar, FONTE };

if (require.main === module) {
  const args = new Set(process.argv.slice(2));
  const seed = ler(SEED);
  if (!seed) { console.error('✗ sem', SEED, '— correr bash scripts/ci/seed.sh unpack'); process.exit(1); }
  const catalogos = new Map();
  for (const f of fs.readdirSync(CATALOG_DIR).filter(f => f.endsWith('-full.json'))) {
    const d = ler(path.join(CATALOG_DIR, f));
    if (d && Array.isArray(d.products) && !d.in_progress) catalogos.set(SLUG[f.replace('-full.json', '')] || f.replace('-full.json', ''), d.products.map(p => ({ ...p, scraped_at: p.scraped_at || d.scraped_at })));
  }
  const bloq = (ler(path.join(ROOT, 'data', 'lojas-bloqueadas.json')) || {}).lojas || {};
  const espera = (ler(path.join(ROOT, 'data', 'lojas-so-pc.json')) || {}).em_espera || {};
  const { contas, dicionario } = juntar(seed, catalogos, { ignorar: new Set([...Object.keys(bloq), ...Object.keys(espera)]) });
  const tot = k => Object.values(contas).reduce((t, c) => t + c[k], 0);
  console.log(`🔗 juntar pelo CNP seguro: dicionário ${dicionario} CNPs · ${tot('novas')} ofertas novas · ${tot('atualizadas')} atualizadas · recusadas: marca ${tot('marca')}, outro produto ${tot('diferente')}, tamanho ${tot('tamanho')}, preço ${tot('preco')}, URL noutra ficha ${tot('url_noutra')} · a loja já tinha ${tot('ja_tem')}`);
  for (const [l, c] of Object.entries(contas).filter(([, c]) => c.novas + c.atualizadas).sort((a, b) => b[1].novas - a[1].novas).slice(0, 25)) console.log(`   ${l.padEnd(22)} +${c.novas} novas · ${c.atualizadas} atualizadas`);
  if (args.has('--dry-run')) { console.log('🧪 --dry-run: nada gravado.'); process.exit(0); }
  fs.writeFileSync(SEED, JSON.stringify(seed), 'utf8');
  if (args.has('--inject')) {
    const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
  }
}
