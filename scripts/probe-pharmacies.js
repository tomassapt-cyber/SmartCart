#!/usr/bin/env node
/**
 * Probe rápido de farmácias/lojas PT: para cada domínio descobre sitemap,
 * apanha alguns URLs de produto e testa se expõem EAN (gtin13/gtin/ean/MPN/
 * data-layer) + preço, via HTTP simples. Imprime veredito por loja.
 *
 * Uso: node scripts/probe-pharmacies.js                # lista default
 *      node scripts/probe-pharmacies.js https://x.pt https://y.pt
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const DEFAULT = [
  'https://www.farmaciaonline.pt',
  'https://pharma2you.pt',
  'https://www.minhafarmacia.pt',
  'https://www.farmaciachaves.pt',
  'https://www.farmaciagolf.pt',
  'https://www.redfarmacia.pt',
  'https://www.farmacialemos.pt',
  'https://www.saudefarmacia.pt',
  'https://www.mediceo.pt',
  'https://www.farmaciasportuguesas.pt',
  'https://www.vitalfarma.pt',
  'https://www.farmaciaconfianca.pt',
  'https://www.farmaciacampos.pt',
  'https://www.efarma.pt',
  'https://www.farmaciagama.pt',
  'https://www.netfarma.pt',
  'https://www.farmacianovasaude.pt',
  'https://www.dafarmacia.pt',
];

async function txt(u, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal }); return { s: r.status, b: await r.text(), url: r.url }; }
  catch (e) { return { s: 0, b: '', e: e.name === 'AbortError' ? 'timeout' : e.message }; }
  finally { clearTimeout(t); }
}
function locs(b) { return (b.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }

async function discoverSitemap(base) {
  const root = base.replace(/\/$/, '');
  const cands = [root + '/sitemap.xml', root + '/sitemap_index.xml', root + '/feeds/sitemap.xml', root + '/sitemap_products_1.xml', root + '/pub/sitemap.xml'];
  const rob = await txt(root + '/robots.txt');
  if (rob.s === 200) for (const m of rob.b.matchAll(/sitemap:\s*(\S+)/gi)) cands.push(m[1].trim());
  for (const u of [...new Set(cands)]) { const sm = await txt(u); if (sm.s === 200 && sm.b.includes('<loc>')) return sm.b; }
  return null;
}
function pickProducts(body) {
  const L = locs(body);
  const subs = L.filter(u => /\.xml/i.test(u));
  const pat = /\.html$|\/produto|\/products?\/|\/artigo\/|\/p\/|-p-\d/i;
  let prods = L.filter(u => pat.test(u) && !/\.xml/i.test(u));
  return { prods, subs };
}
function findEan(html) {
  const out = { ean: null, src: null, price: null };
  const blocks = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const b of blocks) {
    const inner = b.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
    // regex-based (tolera @context partido por PHP)
    if (!out.ean) { const m = inner.match(/"(gtin13|gtin|gtin12|gtin14|ean|mpn)"\s*:\s*"?(\d{12,14})"?/i); if (m && !/0{6,}/.test(m[2])) { out.ean = m[2]; out.src = m[1]; } }
    if (!out.price) { const p = inner.match(/"price"\s*:\s*"?(\d+(?:\.\d+)?)/); if (p) out.price = p[1]; }
  }
  if (!out.ean) { const dl = html.match(/["'\\]*ean["'\\]*\s*:\s*["'\\]*(\d{12,14})/); if (dl && !/0{6,}/.test(dl[1])) { out.ean = dl[1]; out.src = 'datalayer'; } }
  return out;
}

async function probe(base) {
  const home = await txt(base);
  if (home.s !== 200) return `✗ inacessível (${home.s || home.e})`;
  const sm = await discoverSitemap(base);
  if (!sm) return '~ acessível mas sem sitemap';
  let { prods, subs } = pickProducts(sm);
  if (prods.length < 3 && subs.length) {
    const sub = subs.find(u => /produt|product|artigo|catalog|shop/i.test(u)) || subs[0];
    const r = await txt(sub); if (r.s === 200) prods = pickProducts(r.b).prods;
  }
  if (!prods.length) return `~ sitemap ok mas sem URLs de produto (${locs(sm).length} locs)`;
  let okEan = 0, tested = 0, src = null, sample = null;
  for (const u of prods.slice(0, 5)) {
    const p = await txt(u); if (p.s !== 200) continue; tested++;
    const e = findEan(p.b);
    if (e.ean) { okEan++; src = e.src; if (!sample) sample = `${e.ean} €${e.price || '?'}`; }
  }
  if (okEan >= Math.ceil(tested / 2)) return `✓✓ EAN via ${src} (${okEan}/${tested}) ${sample} · ${prods.length} produtos`;
  if (okEan > 0) return `✓ EAN parcial via ${src} (${okEan}/${tested}) · ${prods.length} produtos`;
  return `✗ sem EAN (${tested} testados) · ${prods.length} produtos`;
}

(async () => {
  const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
  console.log(`🔎 A sondar ${targets.length} farmácias (HTTP simples, todos os campos EAN incl. mpn)…\n`);
  for (const base of targets) {
    const verd = await probe(base).catch(e => 'ERRO ' + e.message);
    console.log(`${verd.slice(0, 4).padEnd(4)} ${base.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').padEnd(28)} ${verd.slice(4)}`);
  }
})();
