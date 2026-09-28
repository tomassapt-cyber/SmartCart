#!/usr/bin/env node
/**
 * CosMath — scraper da Auchan (auchan.pt) · loja 76
 * =================================================
 * PRIMEIRO HIPERMERCADO ALÉM DO CONTINENTE (2026-09-28). ~5.500 produtos em
 * «Beleza, Higiene e Bebé» e ~8.500 em «Saúde e Bem-estar».
 *
 * PORQUE ENTROU (medido antes, amostra de 112 fichas): 63% dos EAN são NOVOS
 * no CosMath — higiene de grande consumo (géis de banho, desodorizantes,
 * champôs de supermercado) que as farmácias não vendem. Nível de preço 1,12×
 * a mediana nos produtos em comum: não é a mais barata em dermocosmética, mas
 * traz o canal de supermercado para competir com o Continente.
 *
 * COMO (Salesforce Commerce Cloud):
 *   1. PREÇOS em bloco: Search-UpdateGrid?cgid=<categoria>&start=N&sz=200 —
 *      cada "tile" traz id, nome, marca, preço actual (data-gtm.price) e o
 *      preço antes do desconto (data-gtm-new.price, quando há "discount").
 *      ~70 pedidos por passagem em vez de 14 mil fichas.
 *   2. EAN: SÓ na ficha (JSON-LD gtin). O EAN de um produto não muda, por isso
 *      guarda-se no catálogo (pid → ean) e só se abrem fichas de produtos NOVOS,
 *      no máximo --max-fichas por corrida (a primeira passagem espalha-se por
 *      várias corridas, as seguintes são quase só preços).
 *
 * ⚠️ As categorias de topo do site (/pt/beleza-e-higiene/) NÃO servem: o
 * cgid verdadeiro é "beleza-higiene-e-bebe" — com o do endereço o Search-
 * UpdateGrid devolve 1 byte, sem erro.
 *
 * Saída: data/catalog/auchan-full.json
 * Uso:   node scripts/scrape-auchan-catalog.js [--max-fichas=3000] [--so-precos]
 */
const fs = require('fs');
const path = require('path');
const { fetchTextResilient } = require('./lib/resilient-fetch');
const { decodeEntities } = require('./lib/name-cleanup');

const BASE = 'https://www.auchan.pt';
const GRID = `${BASE}/on/demandware.store/Sites-AuchanPT-Site/pt_PT/Search-UpdateGrid`;
const CATEGORIAS = ['beleza-higiene-e-bebe', 'saude-e-bem-estar'];
const SZ = 200;
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'auchan-full.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const MAX_FICHAS = args['so-precos'] ? 0 : Number(args['max-fichas'] ?? 3000);
const dorme = ms => new Promise(r => setTimeout(r, ms));
const get = url => fetchTextResilient(url, { headers: { 'user-agent': UA, 'accept-language': 'pt-PT,pt;q=0.9' } });

const desfaz = s => String(s || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function jsonDoAtributo(bloco, nome) {
  const m = bloco.match(new RegExp(`${nome}="([^"]*)"`));
  if (!m) return null;
  try { return JSON.parse(desfaz(m[1])); } catch { return null; }
}
function tituloBonito(s) {
  // A Auchan escreve os nomes TODOS EM MAIÚSCULAS. Para o casamento por nome
  // (fingerprint) a caixa não conta, mas um produto novo criado a partir daqui
  // ficava assim no site — passa a "Gel De Banho Palmolive…".
  return decodeEntities(String(s || '')).toLowerCase().replace(/(^|[\s\-/(])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(\d+)\s*(Ml|Gr|G|Kg|L|Cl|Un|Uni)\b/g, (_, n, u) => n + ' ' + u.toLowerCase());
}

function tiles(html) {
  const out = [];
  const partes = html.split(/<div class="product" data-pid="/).slice(1);
  out.brutos = partes.length;   // tiles na página, com ou sem preço — é isto que diz se há mais páginas
  for (const p of partes) {
    const pid = p.slice(0, p.indexOf('"'));
    const urls = jsonDoAtributo(p, 'data-urls') || {};
    const g = jsonDoAtributo(p, 'data-gtm') || {};
    const gn = jsonDoAtributo(p, 'data-gtm-new') || {};
    const preco = Number(g.price);
    if (!pid || !(preco > 0)) continue;
    const antes = Number(gn.price) > preco + 0.009 ? Number(gn.price) : null;
    const img = (p.match(/<img[^>]+(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i) || [])[1] || null;
    const semStock = /out-of-stock|esgotado|indispon/i.test(p.slice(0, 6000));
    out.push({
      pid, url: urls.absoluteProductUrl || (urls.productUrl ? BASE + urls.productUrl : null),
      name: tituloBonito(g.name || gn.item_name), brand: g.brand ? tituloBonito(g.brand) : null,
      price: preco, previous_price: antes, in_stock: !semStock,
      image_url: img ? (img.startsWith('http') ? img : BASE + img) : null,
      category: decodeEntities([gn.item_category, gn.item_category2, gn.item_category3].filter(Boolean).join(' > ') || g.category || '') || null,
    });
  }
  return out;
}

async function eanDaFicha(url) {
  const h = await get(url);
  const m = h.match(/"gtin(?:13|12|8|14)?"\s*:\s*"?(\d{8,14})/i);
  return m ? m[1] : null;
}

(async () => {
  const t0 = Date.now();
  // pid → ean já conhecido (o EAN não muda; poupa milhares de fichas por corrida)
  const eanConhecido = {};
  try {
    for (const p of JSON.parse(fs.readFileSync(OUT, 'utf8')).products || []) if (p.pid && p.ean) eanConhecido[p.pid] = p.ean;
  } catch { /* primeira corrida */ }

  const porPid = new Map();
  for (const cg of CATEGORIAS) {
    for (let start = 0; start < 30000; start += SZ) {
      const html = await get(`${GRID}?cgid=${cg}&start=${start}&sz=${SZ}`);
      const ts = tiles(html);
      for (const t of ts) if (!porPid.has(t.pid)) porPid.set(t.pid, t);
      // Parar pelos tiles BRUTOS e não pelos aproveitados: alguns vêm sem preço
      // (esgotados) e contá-los parava a paginação ao fim de ~1.000 produtos.
      if (ts.brutos < SZ) break;
      await dorme(800);
    }
    console.log(`  ${cg}: ${porPid.size} produtos acumulados`);
  }
  const lista = [...porPid.values()];
  // Guarda: muito menos do que o costume = bloqueio silencioso, não a loja a encolher.
  if (lista.length < 5000) { console.error(`✗ Só ${lista.length} produtos na listagem (esperados ~14 mil). Não gravo.`); process.exit(1); }

  let lidas = 0, semEan = 0;
  // Primeiro as fichas das MARCAS QUE O CATÁLOGO JÁ TEM: são as que casam com
  // produtos existentes e passam a comparar preço. Papel higiénico e marca
  // branca ficam para o fim (a primeira passagem espalha-se por várias corridas).
  const marcasConhecidas = new Set();
  try {
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'seed-bundle.json'), 'utf8'));
    for (const p of seed.products) if (p.brand) marcasConhecidas.add(String(p.brand).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim());
  } catch { /* sem seed: ordem da listagem */ }
  const conhecida = t => marcasConhecidas.has(String(t.brand || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim());
  const porLer = lista.filter(t => !eanConhecido[t.pid]).sort((a, b) => conhecida(b) - conhecida(a));
  if (marcasConhecidas.size) console.log(`  marcas do catálogo entre as por ler: ${porLer.filter(conhecida).length}`);
  console.log(`  EAN já conhecidos: ${lista.length - porLer.length} · por ler: ${porLer.length} · nesta corrida: até ${MAX_FICHAS}`);
  for (const t of porLer.slice(0, MAX_FICHAS)) {
    try { const e = await eanDaFicha(t.url); if (e) eanConhecido[t.pid] = e; else semEan++; } catch { semEan++; }
    if (++lidas % 250 === 0) console.log(`  ${lidas} fichas lidas`);
    await dorme(500);
  }

  const agora = new Date().toISOString();
  const produtos = lista.map(t => ({ ...t, status: 'ok', scraped_at: agora, ean: eanConhecido[t.pid] || null, cnp: null, volume_ml: null, variants: [] }));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: agora, source: BASE, in_progress: false, products: produtos }));
  const comEan = produtos.filter(p => p.ean).length;
  console.log(`✓ ${OUT}: ${produtos.length} produtos · ${comEan} com EAN · ${lidas} fichas lidas agora (${semEan} sem EAN) · ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
