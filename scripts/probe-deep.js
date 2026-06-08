#!/usr/bin/env node
// Teste de extração EAN/preço em URLs específicos (sem ScrapingBee)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function findEan(html) {
  const out = { ld: null, dl: null, price: null, avail: null };
  const blocks = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const b of blocks) {
    const inner = b.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
    let j; try { j = JSON.parse(inner.replace(/[\x00-\x1f]+/g, ' ')); } catch { continue; }
    const arr = Array.isArray(j) ? j : (j['@graph'] || [j]);
    for (const n of arr) {
      const t = n && n['@type'];
      const isP = t === 'Product' || (Array.isArray(t) && t.includes('Product'));
      if (!isP) continue;
      const g = n.gtin13 || n.gtin || n.ean || (n.sku && /^\d{12,14}$/.test(String(n.sku)) ? n.sku : null);
      if (g && /^\d{8,14}$/.test(String(g))) out.ld = String(g);
      const of = Array.isArray(n.offers) ? n.offers[0] : n.offers;
      if (of) { if (of.price) out.price = String(of.price); if (of.availability) out.avail = String(of.availability).split('/').pop(); }
    }
  }
  const dlRe = new RegExp('["\\\\]*ean["\\\\]*\\s*:\\s*["\\\\]*(\\d{12,14})');
  const dl = html.match(dlRe);
  if (dl) out.dl = dl[1];
  return out;
}

async function get(u) {
  const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  return { status: r.status, html: await r.text(), finalUrl: r.url };
}

async function main() {
  const urls = process.argv.slice(2);
  for (const u of urls) {
    try {
      const r = await get(u);
      const e = findEan(r.html);
      const verdict = (e.ld || e.dl) ? '✓ EAN ' + (e.ld ? e.ld + '(ld)' : e.dl + '(dl)') : '✗ sem EAN';
      console.log(`${r.status} ${verdict} preço:${e.price || '?'} stock:${e.avail || '?'}  ${u}`);
    } catch (err) {
      console.log(`ERR ${err.message}  ${u}`);
    }
  }
}
main();
