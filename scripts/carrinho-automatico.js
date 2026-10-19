#!/usr/bin/env node
/**
 * CosMath — carrinho automático nas lojas Shopify (2026-10-19)
 * ============================================================================
 * Quando o cabaz do CosMath tem 2, 3 ou mais produtos de uma loja, o cliente
 * tinha de os abrir um a um e juntá-los ao carrinho da loja à mão. Nas lojas
 * Shopify com o carrinho clássico há um link oficial que abre a loja com o
 * carrinho JÁ CHEIO, com as quantidades:
 *
 *   <origem>/cart/add?items[0][id]=<variante>&items[0][quantity]=2&items[1][id]=…
 *
 * Provado a 19/10 na Farmácia Garcia (só carrinho, nunca checkout): os dois
 * produtos entram com as quantidades certas e a loja abre o /cart; um produto
 * esgotado no link não faz falhar os outros.
 *
 * A variante sai do /products/<handle>.js da própria loja (CORS aberto, «*», nas
 * 27 lojas): pelo ?variant= do endereço da oferta, senão pelo EAN (barcode),
 * senão a única variante. O site faz isto no clique; este ficheiro tem a função
 * de referência (montar o link e escolher a variante) e a VERIFICAÇÃO semanal
 * das lojas de data/carrinho-automatico.json:
 *   /cart.js responde com o carrinho  → a loja ainda tem o carrinho clássico
 *   /products/<handle>.js com CORS «*» e a variante do EAN → o site consegue
 * Uma loja que falhe sai da lista à mão (o botão volta a abrir cada produto).
 *
 * Uso:
 *   node scripts/carrinho-automatico.js                       verifica todas
 *   node scripts/carrinho-automatico.js --md=f.md --estado=f.env   (workflow)
 *   node scripts/carrinho-automatico.js --gravar              grava a data de hoje
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FICH = path.join(ROOT, 'data', 'carrinho-automatico.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const ORIGEM_SITE = 'https://smart-cart-zx55.vercel.app';

const semZeros = e => String(e || '').trim().replace(/^0+/, '');

/** o handle Shopify de um endereço de oferta (/products/<handle>), ou null */
function handleDoUrl(url) {
  try {
    const m = new URL(url).pathname.match(/\/products\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

/**
 * A variante a pôr no carrinho, a partir do /products/<handle>.js da loja.
 * 1) o ?variant= do endereço da oferta, se existir nesse produto;
 * 2) a variante com o EAN da oferta no barcode (sem zeros à esquerda);
 * 3) a única variante, se o produto só tiver uma.
 * null = não se sabe qual → esse produto abre-se à parte, como hoje.
 */
function varianteDoEan(produtoJs, ean, urlOferta) {
  const vs = (produtoJs && produtoJs.variants) || [];
  try {
    const id = new URL(urlOferta).searchParams.get('variant');
    if (id && vs.some(v => String(v.id) === id)) return Number(id);
  } catch { /* endereço inválido → segue */ }
  const alvo = semZeros(ean);
  const porEan = alvo ? vs.find(v => semZeros(v.barcode) === alvo) : null;
  if (porEan) return porEan.id;
  return vs.length === 1 ? vs[0].id : null;
}

/**
 * Os links de carrinho de um cabaz: um por ORIGEM (a mesma loja pode ter
 * ofertas noutro domínio — a Farmatogo tem algumas em nouxis.com — e o
 * carrinho é por domínio). itens: [{ url, variante, quantidade }].
 */
function linksDeCarrinho(itens) {
  const porOrigem = new Map();
  for (const it of itens) {
    if (!it || !it.variante) continue;
    let origem;
    try { origem = new URL(it.url).origin; } catch { continue; }
    if (!porOrigem.has(origem)) porOrigem.set(origem, []);
    porOrigem.get(origem).push(it);
  }
  return [...porOrigem].map(([origem, lista]) => ({
    origem,
    link: `${origem}/cart/add?` + lista.map((it, i) =>
      `items[${i}][id]=${encodeURIComponent(it.variante)}&items[${i}][quantity]=${Math.max(1, Math.round(Number(it.quantidade) || 1))}`).join('&'),
  }));
}

// ── verificação (rede) ─────────────────────────────────────────────────────
async function pedir(url, extra = {}) {
  const r = await fetch(url, { headers: { 'user-agent': UA, ...extra }, signal: AbortSignal.timeout(20000) });
  return { status: r.status, cors: r.headers.get('access-control-allow-origin'), corpo: await r.text() };
}

function amostraDeOfertas(slug, n = 3) {
  const f = path.join(ROOT, 'data', 'seed-bundle.json.gz', 'ofertas', slug + '.jsonl');
  if (!fs.existsSync(f)) return [];
  const ls = fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
    .filter(o => o.in_stock !== false && /^\d{8,14}$/.test(String(o.ean)) && handleDoUrl(o.url));
  if (ls.length <= n) return ls;
  return [ls[Math.floor(ls.length * 0.1)], ls[Math.floor(ls.length / 2)], ls[Math.floor(ls.length * 0.9)]].slice(0, n);
}

// Respostas de quem limita ou bloqueia os servidores da nuvem (a 1.ª corrida
// no GitHub, 19/10, deu 1/3 na A Tua Farmácia, que do PC dá 3/3). O site lê
// do telemóvel do cliente, não da nuvem: isto não é a loja a deixar de
// funcionar, é a vigia que não consegue ver daqui.
const BLOQUEIO = new Set([403, 429, 503]);

async function pedirProduto(url) {
  let p = await pedir(url, { origin: ORIGEM_SITE });
  if (BLOQUEIO.has(p.status)) {   // uma segunda tentativa, com calma
    await new Promise(z => setTimeout(z, 4000));
    p = await pedir(url, { origin: ORIGEM_SITE });
  }
  return p;
}

async function verificarLoja(slug, loja) {
  const r = { slug, origem: loja.origem, carrinho: false, cors: null, variantes: 0, amostra: 0, bloqueados: 0, estados: [], erro: null };
  try {
    const c = await pedir(loja.origem + '/cart.js');
    r.carrinho = c.status === 200 && /"items"\s*:/.test(c.corpo);
    for (const o of amostraDeOfertas(slug)) {
      const origem = new URL(o.url).origin;
      const p = await pedirProduto(`${origem}/products/${encodeURIComponent(handleDoUrl(o.url))}.js`);
      r.amostra++;
      r.cors = r.cors || p.cors;
      let j = null; try { j = JSON.parse(p.corpo); } catch { /* 404/HTML */ }
      const achou = !!(j && varianteDoEan(j, o.ean, o.url));
      if (achou) r.variantes++;
      else if (BLOQUEIO.has(p.status)) r.bloqueados++;
      r.estados.push(achou ? 'ok' : (j ? 'sem variante' : String(p.status) + (p.status === 200 ? ' sem JSON' : '')));
      await new Promise(z => setTimeout(z, 700));
    }
  } catch (e) { r.erro = e.message; }
  const precisa = Math.min(2, r.amostra);
  // passa: carrinho clássico, CORS aberto e pelo menos 2 de 3 variantes achadas
  r.ok = r.carrinho && r.cors === '*' && r.variantes >= precisa && r.amostra > 0;
  // não se sabe daqui: o carrinho responde, e o que falta são pedidos bloqueados
  r.inconclusiva = !r.ok && r.carrinho && r.bloqueados > 0 && r.variantes + r.bloqueados >= precisa
    && (r.cors === '*' || r.variantes === 0);
  return r;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  const fich = JSON.parse(fs.readFileSync(FICH, 'utf8'));
  const res = [];
  for (const [slug, loja] of Object.entries(fich.lojas)) {
    const r = await verificarLoja(slug, loja);
    res.push(r);
    console.log(`${r.ok ? '✓' : (r.inconclusiva ? '?' : '✗')} ${slug.padEnd(20)} carrinho:${r.carrinho ? 'sim' : 'NÃO'} CORS:${r.cors || '—'} variantes:${r.variantes}/${r.amostra} [${r.estados.join(', ')}]${r.erro ? ' erro: ' + r.erro : ''}`);
  }
  const falham = res.filter(r => !r.ok && !r.inconclusiva);
  const inconclusivas = res.filter(r => r.inconclusiva);
  console.log(`\n${res.filter(r => r.ok).length}/${res.length} lojas com o carrinho automático a funcionar` +
    (inconclusivas.length ? ` · ${inconclusivas.length} sem conclusão daqui (pedidos bloqueados): ${inconclusivas.map(r => r.slug).join(', ')}` : ''));
  if (args.md) {
    const linha = r => `| ${r.slug} (${r.origem}) | ${r.carrinho ? 'sim' : '**não**'} | ${r.cors || '—'} | ${r.variantes}/${r.amostra} (${r.estados.join(', ')})${r.erro ? ' · ' + r.erro : ''} |`;
    const ln = ['O carrinho automático (um link que abre a loja com o cabaz já no carrinho) deixou de funcionar nestas lojas:', '',
      '| loja | carrinho clássico (/cart.js) | CORS do produto | variante pelo EAN (resposta de cada amostra) |', '|---|---|---|---|',
      ...falham.map(linha), '',
      'Enquanto estiverem em `data/carrinho-automatico.json`, o botão do cabaz tenta o link e pode abrir um carrinho vazio ou incompleto. **A fazer:** confirmar à mão; se a loja mudou de plataforma, tirá-la do ficheiro (o botão volta a abrir cada produto). «sem variante» = o produto existe mas nenhum tamanho tem o EAN da oferta; «404» = o produto já não existe com esse endereço.', ''];
    if (inconclusivas.length) ln.push(`Sem conclusão a partir da nuvem (a loja limitou ou bloqueou os pedidos, ${[...BLOQUEIO].join('/')}): ${inconclusivas.map(r => r.slug).join(', ')}. Não é falha — o site lê do telemóvel de quem compra.`, '');
    ln.push(`Verificação de ${new Date().toISOString().slice(0, 10)} pelo \`scripts/carrinho-automatico.js\`.`);
    fs.writeFileSync(args.md, ln.join('\n') + '\n');
  }
  if (args.estado) fs.writeFileSync(args.estado, `FALHAM=${falham.length}\nTOTAL=${res.length}\nINCONCLUSIVAS=${inconclusivas.length}\n`);
  if (args.gravar && !falham.length) {
    fich.verificado = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(FICH, JSON.stringify(fich, null, 1) + '\n');
    console.log('gravado: verificado =', fich.verificado);
  }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

module.exports = { handleDoUrl, varianteDoEan, linksDeCarrinho, verificarLoja };
