'use strict';
/**
 * Possíveis fichas duplicadas — o mesmo produto em duas fichas (2026-10-22).
 *
 * Chave: marca + tamanho + palavras do nome, sem a marca e sem palavras vazias.
 * Os NÚMEROS contam (SPF 30 ≠ SPF 50, 10% ≠ 25%, tom 11 ≠ 12), e as letras
 * soltas também (Vitamina C ≠ Vitamina D).
 *
 * PORQUÊ: o monitor de frescura usava a impressão digital (productFingerprint),
 * que deita fora tamanhos e números — contava 760 «grupos», quase todos
 * tamanhos diferentes do mesmo produto (Cicaplast 15 ml e 40 ml), que NÃO são
 * duplicados. Com esta chave eram 166 a 22/10, e 120 deles tinham a mesma loja
 * nas duas fichas: quase sempre produtos diferentes (tons, aromas, packs) — por
 * omissão ficam de fora.
 */

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&#\d+;|&[a-z]+;/g, ' ');
const VAZIAS = new Set('de da do das dos e com para por em a o as os the and for with of ml g gr un unid unidades unidade x'.split(' '));

/** «50ml», «200g», «15ml*2» (packs NxM); '' sem tamanho no nome */
function tamanhoDoNome(nome) {
  const t = norm(nome);
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|g|gr|kg)\b/);
  if (!m) return '';
  let v = parseFloat(m[1].replace(',', '.'));
  const u = m[2];
  if (u === 'l' || u === 'kg') v *= 1000;
  const mult = t.match(/\b(\d+)\s*x\s*\d|\bx\s*(\d+)\b|\b(\d+)\s*x\b/);
  return `${Math.round(v)}${u.startsWith('g') || u === 'kg' ? 'g' : 'ml'}${mult ? '*' + (mult[1] || mult[2] || mult[3]) : ''}`;
}

/** as palavras do nome que distinguem o produto (sem marca, tamanho e vazias) */
function palavrasDoNome(nome, marca) {
  const daMarca = new Set(norm(marca).split(/[^a-z0-9]+/).filter(Boolean));
  return [...new Set(norm(nome).replace(/(\d+(?:[.,]\d+)?)\s*(ml|l|g|gr|kg)\b/g, ' ').split(/[^a-z0-9]+/)
    .filter(t => t && !VAZIAS.has(t) && !daMarca.has(t)))].sort();
}

/** chave de duplicado de uma ficha, ou null (sem marca, ou nome curto demais) */
function chaveDuplicado(p) {
  const marca = norm(p && p.brand).replace(/[^a-z0-9]/g, '');
  const palavras = palavrasDoNome(p && p.name, p && p.brand);
  if (!marca || palavras.length < 2) return null;   // nomes curtos dão falsos pares
  return `${marca}|${tamanhoDoNome(p.name)}|${palavras.join(' ')}`;
}

/** a chave estável de um grupo: os EANs por ordem */
const chaveGrupo = eans => [...eans].map(String).sort().join('|');

/**
 * Grupos de 2+ fichas com a mesma chave, entre as fichas com alguma oferta em
 * stock. Por omissão sem os grupos em que uma loja tem oferta em duas fichas.
 * → [{ chave, grupo, eans: [...], lojaComum }]
 */
function gruposDuplicados(seed, { comLojaComum = false } = {}) {
  const lojas = new Map();
  for (const sp of seed.store_products || []) for (const it of sp.items || []) {
    if (it.in_stock === false || !(it.price > 0)) continue;
    const e = String(it.ean);
    (lojas.get(e) || lojas.set(e, new Set()).get(e)).add(sp.store_slug);
  }
  const porChave = new Map();
  for (const p of seed.products || []) {
    const e = String(p.ean);
    if (!lojas.has(e)) continue;
    const k = chaveDuplicado(p);
    if (k) (porChave.get(k) || porChave.set(k, []).get(k)).push(e);
  }
  const out = [];
  for (const [chave, eans] of porChave) {
    if (eans.length < 2) continue;
    const soma = eans.reduce((a, e) => a + lojas.get(e).size, 0);
    const todas = new Set(eans.flatMap(e => [...lojas.get(e)]));
    const lojaComum = soma > todas.size;
    if (lojaComum && !comLojaComum) continue;
    out.push({ chave, grupo: chaveGrupo(eans), eans, lojaComum });
  }
  return out;
}

module.exports = { tamanhoDoNome, palavrasDoNome, chaveDuplicado, chaveGrupo, gruposDuplicados };
