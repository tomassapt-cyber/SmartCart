#!/usr/bin/env node
// Descobre URLs de produto via sitemap (robots.txt + variantes comuns) e
// imprime uma amostra. Uso: node scripts/probe-find-products.js <base_url> [pattern]
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function txt(u) {
  try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); return { s: r.status, b: await r.text() }; }
  catch (e) { return { s: 0, b: '', e: e.message }; }
}
function locs(b) { return (b.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim().replace(/&amp;/g, '&')); }

async function discoverSitemap(base) {
  const root = base.replace(/\/$/, '');
  const cands = [root + '/sitemap.xml', root + '/sitemap_index.xml', root + '/sitemap_products_1.xml', root + '/feeds/sitemap.xml', root + '/pub/sitemap.xml'];
  const rob = await txt(root + '/robots.txt');
  if (rob.s === 200) for (const m of rob.b.matchAll(/sitemap:\s*(\S+)/gi)) cands.push(m[1].trim());
  const seen = new Set();
  for (const u of cands) {
    if (seen.has(u)) continue; seen.add(u);
    const sm = await txt(u);
    if (sm.s === 200 && sm.b.includes('<loc>')) return { url: u, body: sm.b };
  }
  return null;
}

async function main() {
  const base = process.argv[2];
  const pattern = process.argv[3] ? new RegExp(process.argv[3]) : /\/(product|products|produto|artigo|p)\//i;
  const sm = await discoverSitemap(base);
  if (!sm) { console.log('✗ nenhum sitemap encontrado'); return; }
  console.log('sitemap:', sm.url);
  let L = locs(sm.body);
  const subs = L.filter(u => /\.xml/i.test(u));
  let prods = L.filter(u => pattern.test(u) && !/\.xml/i.test(u));
  // descer nos sub-sitemaps (preferir produtos)
  if (prods.length < 3 && subs.length) {
    const ordered = subs.sort((a, b) => (/(product|produt|artigo|catalog)/i.test(b) ? 1 : 0) - (/(product|produt|artigo|catalog)/i.test(a) ? 1 : 0));
    for (const s of ordered.slice(0, 4)) {
      const r = await txt(s);
      if (r.s === 200) { const pl = locs(r.b).filter(u => pattern.test(u)); prods.push(...pl); if (prods.length >= 5) break; }
    }
  }
  prods = [...new Set(prods.map(u => u.split('?')[0]))];
  console.log('total sub-sitemaps:', subs.length, '| produtos encontrados:', prods.length);
  prods.slice(0, 6).forEach(u => console.log('  ', u));
}
main();
