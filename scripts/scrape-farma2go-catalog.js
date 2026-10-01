#!/usr/bin/env node
/**
 * CosMath — scraper da Farma2Go (farma2go.com/pt) · loja 86
 * ==========================================================
 * Farmácia espanhola com site português e envio para Portugal continental.
 * Shopify ENORME: ~170 mil produtos no mapa do site (174 sitemaps × ~1.000).
 *
 * PORQUE ENTROU (2026-10-01, amostra pequena: 39 com EAN, 11 em comum): 0,86×
 * a mediana, a mais barata em 45% dos comuns — o melhor preço medido até hoje.
 *
 * COMO (o modelo da Auchan — preços em bloco, EAN guardado por produto):
 *   1. PREÇOS: /pt/collections/<c>/products.json?limit=250&page=N, só nas
 *      subcoleções de beleza (facial, corporal, capilar, bebé, …: ~15 mil
 *      produtos únicos, ~80 pedidos). ⚠️ A Shopify corta na página 100 (25 mil
 *      por coleção) — por isso por coleção e não /collections/all.
 *   2. EAN: só no /products/<handle>.js (variants[].barcode). Guarda-se por
 *      handle e lê-se só para os produtos novos, até --max-ean por corrida,
 *      primeiro as marcas que o catálogo já tem. Só ~1/3 traz EAN de fábrica;
 *      o resto usa o código nacional espanhol, que não casa com nada.
 *
 * ⚠️ OS NOMES VÊM MISTURADOS no /pt: os traduzidos em português ("Champô"),
 * os outros em espanhol ("Champú"). Por isso o integrador
 * NÃO cria produtos (criarDermo: false): entra só como fonte de preço dos que
 * já temos, casados por EAN.
 *
 * Saída: data/catalog/farma2go-full.json
 * Uso:   node scripts/scrape-farma2go-catalog.js [--max-ean=4000] [--so-precos]
 */
const fs = require('fs');
const path = require('path');
const { fetchTextResilient } = require('./lib/resilient-fetch');
const { decodeEntities } = require('./lib/name-cleanup');

const BASE = 'https://farma2go.com';
// ⚠️ As coleções-MÃE ('cosmeticos', 'higiene-cuidado-pessoal') devolvem
// {"products":[]} no products.json — são agregadoras. Os produtos estão nas
// subcoleções (repetidos entre elas; o Map por handle tira os duplicados).
const COLECOES = ['facial', 'corporalmente', 'capilar', 'bebe', 'homem', 'desodorantes',
  'cuidado-de-pes-e-maos', 'cosmetica-coreana-k-beauty', 'contornos-de-olhos-e-labios', 'acne'];
const OUT = path.join(__dirname, '..', 'data', 'catalog', 'farma2go-full.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const MAX_EAN = args['so-precos'] ? 0 : Number(args['max-ean'] ?? 4000);
const dorme = ms => new Promise(r => setTimeout(r, ms));
const get = (url, expect) => fetchTextResilient(url, { expect, headers: { 'user-agent': UA, 'accept-language': 'pt-PT,pt;q=0.9' } });
const semAcentos = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const eanOk = s => /^\d{12,14}$/.test(String(s || '').trim());

(async () => {
  const t0 = Date.now();
  // handle → EAN (ou '' = já lido e sem EAN, para não o voltar a pedir)
  const eanPorHandle = {};
  try { for (const p of JSON.parse(fs.readFileSync(OUT, 'utf8')).products || []) if (p.handle) eanPorHandle[p.handle] = p.ean || ''; } catch { /* 1.ª corrida */ }

  const porHandle = new Map();
  for (const c of COLECOES) {
    for (let page = 1; page <= 100; page++) {
      let lista;
      try { lista = JSON.parse(await get(`${BASE}/pt/collections/${c}/products.json?limit=250&page=${page}`, 'json')).products || []; }
      catch (e) { if (/HTTP 400/.test(String(e.message))) break; throw e; }   // 400 = além da página 100
      if (!lista.length) break;
      for (const p of lista) {
        if (porHandle.has(p.handle)) continue;
        const v = (p.variants || [])[0];
        const preco = v ? Number(v.price) : 0;
        if (!(preco > 0)) continue;
        const antes = v.compare_at_price && Number(v.compare_at_price) > preco + 0.009 ? Number(v.compare_at_price) : null;
        porHandle.set(p.handle, {
          handle: p.handle,
          url: `${BASE}/pt/products/${p.handle}`,
          status: 'ok',
          name: decodeEntities(p.title || ''),
          brand: p.vendor ? decodeEntities(p.vendor) : null,
          price: preco, previous_price: antes, in_stock: !!v.available,
          image_url: (p.images && p.images[0] && p.images[0].src) || null,
          category: c, cnp: null, volume_ml: null, variants: [],
        });
      }
      if (lista.length < 250) break;
      await dorme(700);
    }
    console.log(`  ${c}: ${porHandle.size} produtos acumulados`);
  }
  const lista = [...porHandle.values()];
  if (lista.length < 5000) { console.error(`✗ Só ${lista.length} produtos nas coleções (7.652 a 2026-10-01). Não gravo.`); process.exit(1); }

  // EAN — primeiro as marcas que o catálogo já tem
  const marcas = new Set();
  try { for (const p of JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'seed-bundle.json'), 'utf8')).products) if (p.brand) marcas.add(semAcentos(p.brand)); } catch {}
  const conhecida = t => marcas.has(semAcentos(t.brand));
  const porLer = lista.filter(t => !(t.handle in eanPorHandle)).sort((a, b) => conhecida(b) - conhecida(a));
  console.log(`  EAN já conhecidos: ${lista.length - porLer.length} · por ler: ${porLer.length} (de marcas do catálogo: ${porLer.filter(conhecida).length}) · nesta corrida: até ${MAX_EAN}`);
  let lidos = 0, comEan = 0;
  for (const t of porLer.slice(0, MAX_EAN)) {
    try {
      // /pt/products/ e não /products/: no /pt o handle é o TRADUZIDO
      // ("revita-champo-…" vs "revita-anticaida-champu-…") e na raiz dá 404.
      const j = JSON.parse(await get(`${BASE}/pt/products/${encodeURIComponent(t.handle)}.js`, 'json'));
      const b = ((j.variants || [])[0] || {}).barcode;
      eanPorHandle[t.handle] = eanOk(b) ? String(b).trim() : '';
      if (eanPorHandle[t.handle]) comEan++;
    } catch { /* fica para a próxima corrida */ }
    if (++lidos % 500 === 0) console.log(`  ${lidos} EAN lidos (${comEan} com código)`);
    await dorme(350);
  }

  const agora = new Date().toISOString();
  const produtos = lista.map(t => ({ ...t, scraped_at: agora, ean: eanPorHandle[t.handle] || null }));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ scraped_at: agora, source: BASE + '/pt', in_progress: false, products: produtos }));
  console.log(`✓ ${OUT}: ${produtos.length} produtos · ${produtos.filter(p => p.ean).length} com EAN · ${lidos} lidos agora (${comEan} com EAN) · ${Math.round((Date.now() - t0) / 60000)} min`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
