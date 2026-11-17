#!/usr/bin/env node
/**
 * CosMath — juntar fichas do MESMO produto com códigos de barras diferentes,
 * quando as farmácias lhes dão o mesmo CNP (2026-11-17)
 * ==========================================================================
 * O fabricante muda o EAN quando muda a embalagem, e cada loja fica com o código
 * que tinha: o mesmo produto aparece em várias fichas, cada uma com poucas lojas.
 * Amostra de 17/11 (Desktop\duo\AMOSTRA-KUANTOKUSTA-2026-11-17.md): Bioderma
 * Sensibio H2O 250 ml em 4 fichas (21 + 5 + 4 + 2 lojas), Apivita gel purificante
 * (17 + 3), Oleoban duche (15 + 2)…
 *
 * As farmácias dão, na mesma linha, o EAN e o CNP (código nacional do produto).
 * Quando dois EANs com fichas separadas aparecem com o mesmo CNP, é forte sinal de
 * que são o mesmo produto. Mas o CNP sozinho NÃO chega: há lojas que põem o CNP
 * errado (Em-eukal ⇄ Strepsils, Alobaby ⇄ Boiron) e há CNPs de linha que cobrem
 * vários produtos. Por isso o scripts/apply-cnp-merge.js recusa juntar EANs reais.
 * Este passo só junta com TODAS as provas:
 *   • o mesmo CNP para os dois EANs, e o CNP liga no máximo 3 EANs (mais = código
 *     de linha);
 *   • a mesma marca e um tamanho em comum (±6%, do nome ou das variantes);
 *   • nomes compatíveis (palavras sem a marca, com o vocabulário pt/en/es/fr do
 *     #143: Jaccard ≥ 0,34);
 *   • nada que diga «outro produto»: sinalDeProdutoDiferente, variantes opostas,
 *     tipo em conflito (creme ≠ gel…), limpeza ≠ tratamento, versões/tons/aromas/FPS
 *     iguais dos dois lados (Plus, Light, Noite, Homem, Bebé, Recarga…);
 *   • nenhuma loja vende os dois códigos em páginas diferentes (seriam dois
 *     produtos à venda lado a lado).
 * Só cosmética que o site mostra.
 *
 * Gera data/product-aliases-cnp.json (EAN que sai → EAN que fica: o de mais lojas).
 * A fusão faz-se na PUBLICAÇÃO (scripts/dedup-ean-variants.js → lerAliases), depois
 * dos aliases manuais e dos sintéticos, que mandam. Não muda o seed nem os nomes.
 *
 * Uso: node scripts/aliases-cnp.js [--dry-run] [--amostra=N]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { eMaquilhagem } = require('./lib/classify-category');
const { isNonCosmetic, normalizeBrand, sinalDeProdutoDiferente, extractVolumeMl } = require('./lib/product-fingerprint');
const { tiposDe, tiposEmConflito } = require('./lib/variant-fixes');
const { variantesOpostas } = require('./juntar-por-cnp');
const { versoes, palavras, mesmas, LIMPEZA, sa } = require('./aliases-sinteticos');

const ROOT = path.resolve(__dirname, '..');
const SAIDA = path.join(ROOT, 'data', 'product-aliases-cnp.json');
const CATALOGOS = path.join(ROOT, 'data', 'catalog');
const LIMIAR = 0.34;          // o CNP já é prova forte: os nomes só têm de ser compatíveis
// Mais do que isto é código de linha, não de produto. O Sensibio H2O 250 ml tem 4 EANs
// no mesmo CNP (6576678) e é um só produto: cada par passa na mesma pelas outras provas.
const MAX_EANS_POR_CNP = 6;
const eanReal = e => /^\d{8,14}$/.test(String(e || ''));
const eCnp = c => /^\d{7}$/.test(String(c || '').trim());
const nucleo = e => String(e).replace(/^0+/, '');
// As farmácias abreviam («Sol Oft Lubrif», «Pomada Oft Vit A», «Geng Pasta Dent»): uma
// palavra conta como a mesma se for o início da outra (≥ 3 letras) ou se as duas
// começarem igual em ≥ 6 letras (relipidante ⇄ relipidizante, desembaraçador ⇄ -ante).
const CORRIGE = { h20: 'h2o', lavante: 'limpeza', lavant: 'limpeza', oleoso: 'oleosa', oleosos: 'oleosa', oleosas: 'oleosa' };
const COR = /\b(colou?r|cor|tinted|teinte|teintee|tintado|con color|com cor)\b/;   // versão com cor
// limpeza ≠ tratamento, com as palavras de limpeza que as farmácias usam («Gel Moussant»,
// «Gel Espuma», «Fluido Dermo-Nettoyant», «Óleo Demaquilante» são todos de limpeza)
const LIMPEZA_CNP = new RegExp(LIMPEZA.source.replace(/\)\\b$/, '|lavagem|demaq\\w*|moussant\\w*|espum\\w*|foam\\w*|nettoyant\\w*|limpiador\\w*)\\b'));
const palavrasCnp = (nome, marca) => new Set([...palavras(nome, marca)].map(x => CORRIGE[x] || x));
function batem(x, y) {
  if (x === y) return true;
  const [c, l] = x.length <= y.length ? [x, y] : [y, x];
  if (c.length >= 3 && l.startsWith(c)) return true;
  let i = 0; while (i < c.length && c[i] === l[i]) i++;
  return i >= 6;
}
/** Jaccard em que cada palavra de A pode casar com uma palavra de B que «bata». */
function parecenca(A, B) {
  const livres = [...B]; let comuns = 0;
  for (const x of A) { const k = livres.findIndex(y => batem(x, y)); if (k >= 0) { comuns++; livres.splice(k, 1); } }
  return comuns / ((A.size + B.size - comuns) || 1);
}

/** Linhas {loja, ean, cnp, url} dos catálogos das lojas que dão os dois códigos. */
function lerCatalogos(dir = CATALOGOS) {
  const linhas = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('-full.json')) continue;
    let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    const loja = f.replace(/-full\.json$/, '');
    for (const x of (Array.isArray(d) ? d : d.products || [])) {
      if (!x || !eCnp(x.cnp)) continue;
      const ean = String(x.ean || x.gtin13 || x.gtin || '').replace(/\D/g, '');
      if (eanReal(ean)) linhas.push({ loja, ean, cnp: String(x.cnp).trim(), url: x.url || '' });
    }
  }
  return linhas;
}

function gerar(seed, linhas) {
  const ofertas = new Map();
  for (const g of seed.store_products) for (const it of g.items) (ofertas.get(it.ean) || ofertas.set(it.ean, []).get(it.ean)).push([g.store_slug, it]);
  const visivel = p => p && p.name && eanReal(p.ean) && !eMaquilhagem(p.name, p.category, p.brand) && !isNonCosmetic(p.name);
  const porEan = new Map(), porNucleo = new Map();
  for (const p of seed.products) { porEan.set(String(p.ean), p); if (eanReal(p.ean)) porNucleo.set(nucleo(p.ean), p); }
  const ficha = e => porEan.get(e) || porNucleo.get(nucleo(e));   // UPC-A ⇄ EAN-13

  // CNP → EANs com ficha própria (e as lojas que o dizem)
  const porCnp = new Map();
  for (const l of linhas) {
    const p = ficha(l.ean); if (!visivel(p)) continue;
    const m = porCnp.get(l.cnp) || porCnp.set(l.cnp, new Map()).get(l.cnp);
    (m.get(p.ean) || m.set(p.ean, new Set()).get(p.ean)).add(l.loja);
  }
  const tamanhos = p => {
    const s = new Set(); const v = extractVolumeMl(p.name || ''); if (v) s.add(v);
    for (const [, it] of ofertas.get(p.ean) || []) for (const x of it.variants || []) if (x.volume_ml > 0) s.add(x.volume_ml);
    return s;
  };
  const nLojas = e => new Set((ofertas.get(e) || []).map(([l]) => l)).size;
  const motivos = {}; const conta = k => { motivos[k] = (motivos[k] || 0) + 1; };
  const exemplos = {};   // motivo → [a, b] (para rever as regras com --recusadas=motivo)

  /** Devolve null se a e b podem ser o mesmo produto, ou o motivo para não. */
  function recusa(a, b) {
    const ma = normalizeBrand(a.brand || ''), mb = normalizeBrand(b.brand || '');
    if (!ma || !mb) return 'sem marca';
    if (ma !== mb) return 'marca diferente';
    const ta = tamanhos(a), tb = tamanhos(b);
    if (!ta.size || !tb.size) return 'sem tamanho';
    if (![...ta].some(t => [...tb].some(u => Math.abs(t - u) / Math.max(t, u) <= 0.06))) return 'tamanho diferente';
    if (parecenca(palavrasCnp(a.name, a.brand), palavrasCnp(b.name, b.brand)) < LIMIAR) return 'nome pouco parecido';
    // «H20» é gralha de «H2O» (água): sem isto o «20» conta como número diferente
    const na = String(a.name).replace(/\bH20\b/gi, 'H2O'), nb = String(b.name).replace(/\bH20\b/gi, 'H2O');
    if (sinalDeProdutoDiferente({ name: na, brand: a.brand }, { name: nb, brand: b.brand }) || variantesOpostas({ name: na }, { name: nb })) return 'outro produto';
    if (tiposEmConflito(tiposDe(a.name), tiposDe(b.name))) return 'tipo';
    if (LIMPEZA_CNP.test(sa(a.name)) !== LIMPEZA_CNP.test(sa(b.name)) && tiposDe(a.name).size && tiposDe(b.name).size) return 'limpeza';
    // versões, tons e FPS iguais dos dois lados; o aroma só separa quando os DOIS nomes
    // dizem um e são diferentes («Gel Purificante» ⇄ «Gel Purificante Lima e Própolis»
    // é o mesmo, com o CNP a provar)
    const va = versoes(a.name), vb = versoes(b.name);
    if (COR.test(sa(a.name)) !== COR.test(sa(b.name))) return 'versão/tom';   // «Proteos Screen Color» ≠ «Proteos Screen»
    const base = v => new Set([...v].filter(x => !x.startsWith('aroma-'))), aro = v => new Set([...v].filter(x => x.startsWith('aroma-')));
    if (!mesmas(base(va), base(vb))) return 'versão/tom';
    if (aro(va).size && aro(vb).size && !mesmas(aro(va), aro(vb))) return 'aroma';
    const la = new Map((ofertas.get(a.ean) || []).map(([l, it]) => [l, it.url]));
    for (const [l, it] of ofertas.get(b.ean) || []) if (la.has(l) && la.get(l) !== it.url) return 'a mesma loja vende os dois';
    return null;
  }

  // pares do mesmo CNP; o EAN que fica é o de mais lojas
  const pares = new Map();   // ean que sai → { sai, fica, cnps }
  for (const [cnp, m] of porCnp) {
    const eans = [...m.keys()];
    if (eans.length < 2) continue;
    if (eans.length > MAX_EANS_POR_CNP) { conta('código de linha'); continue; }
    eans.sort((x, y) => nLojas(y) - nLojas(x) || String(x).localeCompare(String(y)));
    const fica = eans[0];
    for (const sai of eans.slice(1)) {
      const r = recusa(porEan.get(sai), porEan.get(fica));
      if (r) { conta(r); (exemplos[r] || (exemplos[r] = [])).push([porEan.get(sai), porEan.get(fica)]); continue; }
      const ant = pares.get(sai);
      if (ant && ant.fica !== fica) { ant.conflito = true; continue; }   // o mesmo EAN puxado para dois lados
      if (ant) ant.cnps.add(cnp);
      else pares.set(sai, { sai, fica, cnps: new Set([cnp]) });
    }
  }
  let finais = [...pares.values()].filter(x => !x.conflito);
  motivos['puxado para duas fichas'] = pares.size - finais.length;
  // sem cadeias: quem fica não pode sair noutro par
  const saem = new Set(finais.map(x => x.sai));
  const antes = finais.length; finais = finais.filter(x => !saem.has(x.fica));
  motivos['cadeia'] = antes - finais.length;
  for (const x of finais) { x.p = porEan.get(x.fica); x.s = porEan.get(x.sai); x.lojasFica = nLojas(x.fica); x.lojasSai = nLojas(x.sai); }
  return { finais, motivos, exemplos };
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  let seed;
  try { seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8')); }
  catch { console.error('✗ sem data/seed-bundle.json — correr bash scripts/ci/seed.sh unpack'); process.exit(1); }
  // os pares manuais e os sintéticos mandam: os códigos que lá estão não entram aqui
  const ja = new Set();
  for (const f of ['product-aliases.json', 'product-aliases-auto.json']) {
    try { for (const [k, d] of Object.entries(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')))) if (!k.startsWith('_')) { ja.add(k); for (const a of d.aliases || []) ja.add(String(a)); } } catch { /* sem ficheiro */ }
  }
  const linhas = lerCatalogos();
  const { finais, motivos, exemplos } = gerar(seed, linhas);
  if (args.recusadas) {
    const l = exemplos[args.recusadas] || [];
    for (const [a, b] of l.slice(0, Number(args.n || 40))) console.log(`   ✗ ${a.name.slice(0, 55)} [${a.brand}] ⇄ ${b.name.slice(0, 55)} [${b.brand}]`);
  }
  const usar = finais.filter(x => !ja.has(x.sai) && !ja.has(x.fica));
  motivos['já num alias manual/sintético'] = finais.length - usar.length;
  const out = { _comment: 'Gerado por scripts/aliases-cnp.js — fichas do mesmo produto com códigos de barras diferentes, ligadas pelo mesmo CNP nas farmácias e confirmadas pela marca, tamanho, nome e versão. Aplicado na publicação por scripts/dedup-ean-variants.js, depois dos aliases manuais e dos sintéticos, que mandam. Não editar à mão: corrigir as regras ou acrescentar um par manual.', _gerado: new Date().toISOString().slice(0, 10) };
  for (const x of usar.sort((a, b) => String(a.fica).localeCompare(String(b.fica)))) {
    const e = out[x.fica] || (out[x.fica] = { aliases: [], reason: [] });
    e.aliases.push(x.sai); e.reason.push(`CNP ${[...x.cnps].join('/')} · ${x.s.name} (${x.lojasSai}) ⇄ ${x.p.name} (${x.lojasFica})`);
  }
  const ganho = usar.reduce((t, x) => t + x.lojasSai, 0);
  console.log(`🔗 fichas juntas pelo CNP: ${usar.length} (de ${linhas.length} linhas EAN+CNP) · até +${ganho} lojas nas fichas que ficam`);
  console.log('   recusadas:', Object.entries(motivos).map(([k, v]) => `${k} ${v}`).join(' · '));
  if (args.amostra) {
    const a = [...usar]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    for (const x of a.slice(0, Number(args.amostra))) console.log(`   ${x.s.name.slice(0, 50)} (${x.lojasSai}) ⇄ ${x.p.name.slice(0, 56)} (${x.lojasFica})`);
  }
  if (args['dry-run']) return;
  fs.writeFileSync(SAIDA, JSON.stringify(out, null, 1) + '\n');
}

module.exports = { gerar, lerCatalogos, palavrasCnp, parecenca, COR, LIMPEZA_CNP };
if (require.main === module) main();
