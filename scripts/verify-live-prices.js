#!/usr/bin/env node
/**
 * CosMath — verificador de preços AO VIVO (rede de segurança do comparador)
 * ============================================================
 * Compara o preço do seed com o preço REAL da ficha, por amostragem aleatória
 * de N produtos por loja. Nasceu do report do user (2026-07-17: wowfarma a
 * mostrar preço base durante promoções) e apanhou logo mais 3 classes de bug:
 * truncagem de markup (wells), mercado errado por GEO-IP (Shopify Markets) e
 * URLs de outro mercado (farmatogo). Ver memory/cosmath-registo-correcoes.md.
 *
 * Uso:
 *   node scripts/verify-live-prices.js                          # todas as lojas
 *   node scripts/verify-live-prices.js --stores=wells,druni     # só estas
 *   node scripts/verify-live-prices.js --samples=10             # amostras/loja
 *
 * Saída: linha por loja (ok/na/http + MISMATCH) e detalhe dos desvios no fim.
 * Um MISMATCH NÃO é prova de bug — pode ser preço mudado entre o refresh e
 * agora. Investigar quando são vários na mesma loja ou o desvio é sistemático.
 *
 * ⚠️ perfumesclub fica SEMPRE de fora (regra: nunca sondar do PC de casa).
 * Lojas que bloqueiam fetch simples (sweetcare/atida/notino) dão http:N — não
 * é sinal de erro nos dados.
 */
const fs = require('fs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SAMPLES = 10;

async function get(u, ms = 15000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow', signal: ctl.signal }); const x = await r.text(); clearTimeout(t); return { status: r.status, text: x }; }
  catch (e) { clearTimeout(t); return { status: 0, text: '', err: e.message }; }
}

function livePrices(html) {
  const out = new Set();
  // JSON-LD Product offers
  for (const b of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(b[1].replace(/[\x00-\x1f]+/g, ' '));
      const ns = j['@graph'] ? j['@graph'] : (Array.isArray(j) ? j : [j]);
      for (const n of ns) {
        const t = n && n['@type'];
        if (t !== 'Product' && !(Array.isArray(t) && t.includes('Product'))) continue;
        const offers = Array.isArray(n.offers) ? n.offers : [n.offers].filter(Boolean);
        for (const o of offers) {
          for (const k of ['price', 'lowPrice', 'highPrice']) { const v = parseFloat(o && o[k]); if (isFinite(v) && v > 0) out.add(+v.toFixed(2)); }
          const ps = o && o.priceSpecification; const pss = Array.isArray(ps) ? ps : [ps].filter(Boolean);
          for (const p of pss) { const v = parseFloat(p && p.price); if (isFinite(v) && v > 0) out.add(+v.toFixed(2)); }
        }
      }
    } catch {}
  }
  // metas comuns
  for (const re of [/itemprop=["']price["'][^>]*content=["']([\d.,]+)/gi, /content=["']([\d.,]+)["'][^>]*itemprop=["']price["']/gi, /property=["'](?:og|product):price:amount["'][^>]*content=["']([\d.,]+)/gi, /content=["']([\d.,]+)["'][^>]*property=["'](?:og|product):price:amount["']/gi]) {
    for (const m of html.matchAll(re)) { const v = parseFloat(m[1].replace(',', '.')); if (isFinite(v) && v > 0) out.add(+v.toFixed(2)); }
  }
  // Shopify: meta twitter:data1 "9,34 €" / price no JSON do tema
  for (const m of html.matchAll(/"price"\s*:\s*"?(\d{2,7})"?\s*,\s*"price_min"/g)) { const v = parseInt(m[1], 10) / 100; if (v > 0) out.add(+v.toFixed(2)); }
  return [...out];
}

(async () => {
  const argv = process.argv.slice(2);
  const arg = n => { const m = argv.find(a => a.startsWith('--' + n + '=')); return m ? m.split('=')[1] : null; };
  const SEED_FILE = arg('seed') || require('path').join(__dirname, '..', 'data', 'seed-bundle.json');
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
const ONLY = arg('stores') ? new Set(arg('stores').split(',')) : null;
  const N_SAMPLES = arg('samples') ? parseInt(arg('samples'), 10) : SAMPLES;
  const res = {};
  for (const sp of seed.store_products) {
    const slug = sp.store_slug;
    if (ONLY && !ONLY.has(slug)) continue;
    if (slug === 'perfumesclub') { res[slug] = { skip: 'regra IP' }; continue; }
    const pool = sp.items.filter(i => i.url && i.in_stock !== false && i.price > 0);
    if (!pool.length) { res[slug] = { skip: 'sem itens' }; continue; }
    const nS = slug === 'care2me' ? Math.min(4, N_SAMPLES) : N_SAMPLES;
    const picks = [];
    const semPromo = pool.filter(i => i.previous_price == null);
    const base = semPromo.length >= nS ? semPromo : pool;
    for (let k = 0; k < nS && base.length; k++) picks.push(base.splice(Math.floor(Math.random() * base.length), 1)[0]);
    const r = { ok: 0, mismatch: [], na: 0, http: 0 };
    for (const it of picks) {
      const pg = await get(it.url);
      if (pg.status !== 200) { r.http++; await sleep(650); continue; }
      const live = livePrices(pg.text);
      if (!live.length) { r.na++; await sleep(650); continue; }
      const hit = live.some(v => Math.abs(v - it.price) <= 0.051);
      if (hit) r.ok++;
      else r.mismatch.push({ seed: it.price, live: live.slice(0, 5), url: it.url.slice(0, 90) });
      await sleep(650);
    }
    res[slug] = r;
    const flag = r.mismatch.length ? ' ⚠ ' + r.mismatch.length + ' MISMATCH' : '';
    console.log(slug.padEnd(21) + 'ok:' + r.ok + ' na:' + r.na + ' http:' + r.http + flag);
  }
  fs.writeFileSync(require('path').join(require('os').tmpdir(), 'verify-live.json'), JSON.stringify(res, null, 1));
  console.log('\n═══ MISMATCHES DETALHE ═══');
  for (const [s, r] of Object.entries(res)) {
    if (r.mismatch && r.mismatch.length) for (const m of r.mismatch) console.log(s, '· seed', m.seed + '€', '· live', JSON.stringify(m.live), '·', m.url);
  }
  console.log('✓ resultado completo em', require('path').join(require('os').tmpdir(), 'verify-live.json'));
})();
