#!/usr/bin/env node
/**
 * CosMath — juntar fichas do mesmo produto pelo NOME, quando não há CNP (2026-11-17)
 * ==========================================================================
 * A auditoria de 17/11 (Desktop\duo\AUDITORIA-PRODUTOS-2026-11-17.md) encontrou ~1 170
 * fichas com 1–3 lojas que são o mesmo produto que outra ficha nossa com mais lojas:
 * outro código de barras (embalagem nova) ou o código inventado de uma loja sem EAN,
 * mas sem CNP que o prove (perfumarias, Shopify, SweetCare/Wells…). Ex.: «Eucerin
 * UreaRepair Creme Pés 10% 100 ml» (27 lojas) ⇄ «Creme Eucerin Pés Urea Repair 10%
 * Ureia 100ml» (2 lojas).
 *
 * Sem o CNP a provar, as regras são mais apertadas do que no scripts/aliases-cnp.js:
 *   • só se junta a ficha PEQUENA (1–3 lojas) à de mais lojas, e só se esta lhe
 *     acrescentar lojas;
 *   • a mesma marca e o mesmo tamanho (±6%, do nome; se o nome não diz, do endereço
 *     das ofertas);
 *   • nomes muito parecidos (as mesmas regras de palavras e abreviaturas do #149:
 *     ≥ 0,6), e o melhor candidato com folga sobre o segundo (≥ 0,15);
 *   • nada que diga «outro produto» (as mesmas provas do #149): números, variantes
 *     opostas, com/sem cor, tipo, limpeza ≠ tratamento, versões/tons/FPS, aromas
 *     diferentes dos dois lados, e nenhuma loja a vender os dois em páginas diferentes.
 *
 * Gera data/product-aliases-nome.json. Aplicado na publicação por lerAliases, depois
 * dos manuais, dos sintéticos e dos do CNP, que mandam.
 *
 * Uso: node scripts/aliases-nome.js [--dry-run] [--amostra=N]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { eMaquilhagem } = require('./lib/classify-category');
const { isNonCosmetic, normalizeBrand, sinalDeProdutoDiferente, extractVolumeMl } = require('./lib/product-fingerprint');
const { tiposDe, tiposEmConflito } = require('./lib/variant-fixes');
const { variantesOpostas } = require('./juntar-por-cnp');
const { versoes, mesmas, sa } = require('./aliases-sinteticos');
const { palavrasCnp, parecenca, COR, LIMPEZA_CNP } = require('./aliases-cnp');

const ROOT = path.resolve(__dirname, '..');
const SAIDA = path.join(ROOT, 'data', 'product-aliases-nome.json');
const LIMIAR = 0.6, FOLGA = 0.15, MAX_LOJAS_PEQUENA = 3;
const chaveMarca = b => String(normalizeBrand(b) || b || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&#?\w+;/g, '').replace(/^(laboratoires?|laboratorios?|labs?)\s+/, '').replace(/[^a-z0-9]/g, '');

function gerar(seed) {
  const ofertas = new Map();
  for (const g of seed.store_products) for (const it of g.items) (ofertas.get(it.ean) || ofertas.set(it.ean, []).get(it.ean)).push([g.store_slug, it]);
  const visivel = p => p && p.name && !eMaquilhagem(p.name, p.category, p.brand) && !isNonCosmetic(p.name);
  const lojas = e => new Set((ofertas.get(e) || []).map(([l]) => l));
  // tamanho: do nome; se o nome não diz, o mais frequente nos endereços das ofertas
  const tamanho = p => {
    const v = extractVolumeMl(p.name || ''); if (v) return v;
    const c = new Map();
    for (const [, it] of ofertas.get(p.ean) || []) { const m = sa(it.url || '').match(/[-_/](\d{2,4})-?(ml|g|gr)\b/); if (m) c.set(+m[1], (c.get(+m[1]) || 0) + 1); }
    const top = [...c].sort((a, b) => b[1] - a[1])[0]; return top ? top[0] : 0;
  };
  const fichas = [];
  for (const p of seed.products) {
    if (!visivel(p)) continue;
    const marca = chaveMarca(p.brand); if (!marca) continue;
    const ml = tamanho(p); if (!ml) continue;
    const ls = lojas(p.ean); if (!ls.size) continue;
    fichas.push({ p, marca, ml, lojas: ls, pal: palavrasCnp(p.name, p.brand) });
  }
  const porMarca = new Map();
  for (const f of fichas) (porMarca.get(f.marca) || porMarca.set(f.marca, []).get(f.marca)).push(f);
  const motivos = {}; const conta = k => { motivos[k] = (motivos[k] || 0) + 1; };

  // Tipos, mais apertado do que com o CNP: «White in Milk Sérum» ≠ «White in Milk Toner»
  // (o «Milk» da linha dava «leite» aos dois e escondia a diferença).
  const ESSENCIA = /\b(essence|essencia|esencia)\b/;
  const tipos = n => { const s = tiposDe(n); if (ESSENCIA.test(sa(n))) s.add('essencia'); return s; };
  const bate = (x, y) => x === y || (x !== 'essencia' && y !== 'essencia' && !tiposEmConflito(new Set([x]), new Set([y])));
  const cobre = (A, B) => [...A].every(x => [...B].some(y => bate(x, y)));
  // há em A uma palavra com 4+ letras que não bate com nenhuma de B (início comum ≥ 3 letras conta)
  const sobram = (A, B) => [...A].some(x => x.length >= 4 && ![...B].some(y => x === y || (Math.min(x.length, y.length) >= 3 && (x.startsWith(y) || y.startsWith(x)))));
  // o canonicalName tira «fresh», «pure», «gentle»… por serem descritivas; sem CNP a provar
  // contam («Astera Fresh Sérum» ≠ «Astera Sérum Calmante»)
  const QUALIF = /\b(fresh|frais|fresco|pure|pur|puro|gentle|doux)\b/g;
  const comQualif = f => f._q || (f._q = new Set([...f.pal, ...(sa(f.p.name).match(QUALIF) || [])]));
  // perfumes: a concentração e o formato são produtos diferentes (body spray ≠ eau de parfum)
  const PERF = [['edp', /\b(edp|eau de parfum)\b/], ['edt', /\b(edt|eau de toilette)\b/], ['edc', /\b(edc|eau de cologne|colonia|cologne)\b/],
    ['extrait', /\b(extrait|elixir)\b/], ['corpo', /\b(body (spray|mist|lotion)|bruma corporal|body milk)\b/], ['barba', /\b(after ?shave|apos barba|pos barba)\b/],
    ['deo', /\b(deo|desodori\w*|deodorant)\b/]];
  const perf = n => new Set(PERF.filter(([, r]) => r.test(sa(n))).map(([k]) => k));
  function recusa(a, b, j) {
    const na = String(a.p.name).replace(/\bH20\b/gi, 'H2O'), nb = String(b.p.name).replace(/\bH20\b/gi, 'H2O');
    if (sinalDeProdutoDiferente({ name: na, brand: a.p.brand }, { name: nb, brand: b.p.brand }) || variantesOpostas({ name: na }, { name: nb })) return 'outro produto';
    if (COR.test(sa(na)) !== COR.test(sa(nb))) return 'versão/tom';
    const ta = tipos(na), tb = tipos(nb);
    if (ta.size && tb.size && !(cobre(ta, tb) && cobre(tb, ta))) return 'tipo';
    if ((ta.size > 0) !== (tb.size > 0) && j < 0.75) return 'tipo só de um lado';
    // cada lado com uma palavra que o outro não tem («Concentrate Serum» ⇄ «Contour Serum»):
    // só com nomes bem parecidos
    if (j < 0.75 && sobram(comQualif(a), comQualif(b)) && sobram(comQualif(b), comQualif(a))) return 'palavras diferentes dos dois lados';
    const pa = perf(na), pb = perf(nb);
    if ((pa.size || pb.size) && !mesmas(pa, pb)) return 'perfume: concentração/formato';
    if (LIMPEZA_CNP.test(sa(na)) !== LIMPEZA_CNP.test(sa(nb)) && tiposDe(na).size && tiposDe(nb).size) return 'limpeza';
    const va = versoes(na), vb = versoes(nb);
    const base = v => new Set([...v].filter(x => !x.startsWith('aroma-'))), aro = v => new Set([...v].filter(x => x.startsWith('aroma-')));
    if (!mesmas(base(va), base(vb))) return 'versão/tom';
    if (!mesmas(aro(va), aro(vb))) return 'aroma';   // sem CNP, o aroma tem de ser igual dos dois lados
    const ua = new Map((ofertas.get(a.p.ean) || []).map(([l, it]) => [l, it.url]));
    for (const [l, it] of ofertas.get(b.p.ean) || []) if (ua.has(l) && ua.get(l) !== it.url) return 'a mesma loja vende os dois';
    return null;
  }

  const pares = [];
  for (const a of fichas) {
    if (a.lojas.size > MAX_LOJAS_PEQUENA) continue;
    let melhor = null, segundo = 0;
    for (const b of porMarca.get(a.marca) || []) {
      if (b === a || Math.abs(a.ml - b.ml) / Math.max(a.ml, b.ml) > 0.06) continue;
      // só para a ficha de mais lojas (empate: a de EAN verdadeiro fica)
      const real = e => /^\d{8,14}$/.test(String(e));
      if (b.lojas.size < a.lojas.size || (b.lojas.size === a.lojas.size && !(real(b.p.ean) && !real(a.p.ean)))) continue;
      if (![...b.lojas].some(l => !a.lojas.has(l))) continue;
      const j = parecenca(a.pal, b.pal);
      if (!melhor || j > melhor.j) { segundo = melhor ? melhor.j : segundo; melhor = { b, j }; } else if (j > segundo) segundo = j;
    }
    if (!melhor) { conta('sem candidato'); continue; }
    if (melhor.j < LIMIAR) { conta('nome pouco parecido'); continue; }
    if (melhor.j - segundo < FOLGA) { conta('dois candidatos'); continue; }
    const r = recusa(a, melhor.b, melhor.j); if (r) { conta(r); continue; }
    pares.push({ a, sai: a.p.ean, fica: melhor.b.p.ean, s: a.p, p: melhor.b.p, j: melhor.j, lojasSai: a.lojas.size, lojasFica: melhor.b.lojas.size, juntas: new Set([...a.lojas, ...melhor.b.lojas]).size });
  }
  // duas fichas pequenas na mesma ficha grande têm de ser o mesmo produto entre si
  // («Prédermine pele normal» e «… pele seca» não vão as duas para «Prédermine Cream»)
  const porFica = new Map(); for (const x of pares) (porFica.get(x.fica) || porFica.set(x.fica, []).get(x.fica)).push(x);
  const incompat = new Set();
  for (const grupo of porFica.values()) for (let i = 0; i < grupo.length; i++) for (let k = i + 1; k < grupo.length; k++) {
    const x = grupo[i], y = grupo[k], j = parecenca(x.a.pal, y.a.pal);
    if (j < LIMIAR || recusa(x.a, y.a, j)) { incompat.add(x); incompat.add(y); }
  }
  motivos['duas fichas diferentes na mesma'] = incompat.size;
  const compat = pares.filter(x => !incompat.has(x));
  // sem cadeias: quem fica não pode sair noutro par
  const saem = new Set(compat.map(x => x.sai));
  const finais = compat.filter(x => !saem.has(x.fica));
  motivos['cadeia'] = compat.length - finais.length;
  return { finais, motivos };
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  let seed;
  try { seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8')); }
  catch { console.error('✗ sem data/seed-bundle.json — correr bash scripts/ci/seed.sh unpack'); process.exit(1); }
  // os pares manuais, sintéticos e do CNP mandam: os códigos que lá estão não entram aqui
  const ja = new Set();
  for (const f of ['product-aliases.json', 'product-aliases-auto.json', 'product-aliases-cnp.json']) {
    try { for (const [k, d] of Object.entries(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')))) if (!k.startsWith('_')) { ja.add(k); for (const a of d.aliases || []) ja.add(String(a)); } } catch { /* sem ficheiro */ }
  }
  const { finais, motivos } = gerar(seed);
  // pares que o Tomás marcou como errados ao rever a lista: não voltam
  let recusados = new Set();
  try { recusados = new Set((JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'aliases-recusados.json'), 'utf8')).pares || []).map(x => x.sai + '>' + x.fica)); } catch { /* sem ficheiro */ }
  const usar = finais.filter(x => !ja.has(x.sai) && !ja.has(x.fica) && !recusados.has(x.sai + '>' + x.fica));
  motivos['já noutro alias ou recusado'] = finais.length - usar.length;
  const out = { _comment: 'Gerado por scripts/aliases-nome.js — fichas pequenas (1–3 lojas) que são o mesmo produto que uma ficha com mais lojas, pela marca, tamanho e nome (sem CNP). Aplicado na publicação por scripts/dedup-ean-variants.js, depois dos aliases manuais, dos sintéticos e dos do CNP, que mandam. Não editar à mão: corrigir as regras ou acrescentar um par manual.', _gerado: new Date().toISOString().slice(0, 10) };
  for (const x of usar.sort((a, b) => String(a.fica).localeCompare(String(b.fica)))) {
    const e = out[x.fica] || (out[x.fica] = { aliases: [], reason: [] });
    e.aliases.push(x.sai); e.reason.push(`${x.s.name} (${x.lojasSai}) ⇄ ${x.p.name} (${x.lojasFica}) · ${x.j.toFixed(2)}`);
  }
  console.log(`🔗 fichas juntas pelo nome: ${usar.length} · até +${usar.reduce((t, x) => t + x.juntas - x.lojasFica, 0)} lojas nas fichas que ficam`);
  console.log('   recusadas:', Object.entries(motivos).map(([k, v]) => `${k} ${v}`).join(' · '));
  if (args.amostra) {
    const a = [...usar]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    for (const x of a.slice(0, Number(args.amostra))) console.log(`   ${x.j.toFixed(2)} | ${x.s.name.slice(0, 50)} (${x.lojasSai}) ⇄ ${x.p.name.slice(0, 56)} (${x.lojasFica})`);
  }
  if (args['dry-run']) return;
  fs.writeFileSync(SAIDA, JSON.stringify(out, null, 1) + '\n');
}

module.exports = { gerar };
if (require.main === module) main();
