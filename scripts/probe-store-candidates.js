#!/usr/bin/env node
/**
 * GirlMath — Probe de viabilidade de lojas candidatas (sem ScrapingBee)
 * ====================================================================
 * Para cada candidato testa, com fetch HTTP simples (UA de browser):
 *   1. Homepage acessível? (200, sem bloqueio Cloudflare/bot)
 *   2. Tem /sitemap.xml (ou sitemap index)? Quantos URLs?
 *   3. Plataforma detectada (Magento / WooCommerce / Shopify / PrestaShop / outro)
 *   4. Numa página de produto: há EAN (JSON-LD gtin13/gtin/sku numérico OU
 *      data-layer "ean") + preço?
 *
 * NÃO faz scrape — só diagnostica se VALE A PENA construir o trio scraper.
 *
 * Uso:
 *   node scripts/probe-store-candidates.js                # lista default
 *   node scripts/probe-store-candidates.js farmaciaonline pharma2you  # só estes ids
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const ALL = {
  farmaciaonline:     'https://www.farmaciaonline.pt',
  pharma2you:         'https://pharma2you.pt',
  'perfumes-companhia':'https://www.perfumesecompanhia.pt',
  lookfantastic:      'https://www.lookfantastic.pt',
  elcorteingles:      'https://www.elcorteingles.pt',
  worten:             'https://www.worten.pt',
  fnac:               'https://www.fnac.pt',
  douglas:            'https://www.douglas.pt',
  primor:             'https://pt.primor.eu',
  farmaciasdirect:    'https://www.farmaciasdirect.eu',
  'loja-farmacia':    'https://www.lojadafarmacia.com',
  'farmacia-saude':   'https://www.farmaciasaude.com.pt',
  farmaciasholon:     'https://www.farmaciasholon.pt',
  'sa-da-bandeira':   'https://www.sadabandeira.com',
  perfumesclub:       'https://www.perfumesclub.pt',
  maquillalia:        'https://www.maquillalia.com',
  miin:               'https://miin-cosmetics.pt',
  haemiskin:          'https://www.haemiskin.pt',
};

async function fetchText(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml,*/*' },
      redirect: 'follow', signal: ctrl.signal,
    });
    const body = await res.text();
    return { status: res.status, body, url: res.url };
  } catch (e) {
    return { status: 0, error: e.name === 'AbortError' ? 'timeout' : e.message, body: '' };
  } finally { clearTimeout(t); }
}

function detectPlatform(html, headers) {
  const h = html.toLowerCase();
  if (h.includes('cdn.shopify') || h.includes('shopify')) return 'Shopify';
  if (h.includes('/static/version') && h.includes('magento') || h.includes('mage/') || h.includes('magento')) return 'Magento';
  if (h.includes('woocommerce') || h.includes('wp-content/plugins/woocommerce')) return 'WooCommerce';
  if (h.includes('prestashop')) return 'PrestaShop';
  if (h.includes('vtex')) return 'VTEX';
  if (h.includes('__next_data__') || h.includes('_next/')) return 'Next.js';
  return 'desconhecido';
}

function findEanInProduct(html) {
  const out = { jsonld: null, datalayer: null, price: null };
  // JSON-LD blocks
  const blocks = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const b of blocks) {
    const inner = b.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
    let j; try { j = JSON.parse(inner.replace(/[\x00-\x1f]+/g, ' ')); } catch { continue; }
    const arr = Array.isArray(j) ? j : (j['@graph'] || [j]);
    for (const node of arr) {
      const type = node && node['@type'];
      const isProd = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
      if (!isProd) continue;
      const gtin = node.gtin13 || node.gtin || node.gtin12 || node.gtin14 || node.ean || (node.sku && /^\d{12,14}$/.test(String(node.sku)) ? node.sku : null);
      if (gtin && /^\d{8,14}$/.test(String(gtin))) out.jsonld = String(gtin);
      const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
      if (offer && offer.price) out.price = String(offer.price);
    }
  }
  // data-layer style ean
  const dl = html.match(/["']ean["']\s*:\s*["'](\d{12,14})["']/);
  if (dl) out.datalayer = dl[1];
  if (!out.price) {
    const pm = html.match(/["']price["']\s*:\s*["']?(\d+[.,]\d{2})/);
    if (pm) out.price = pm[1];
  }
  return out;
}

// Heurística: extrair um URL de produto de um sitemap/HTML
function pickProductUrl(sitemapXml, base) {
  const locs = (sitemapXml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim());
  // se for sitemap index, devolve sub-sitemaps
  const subs = locs.filter(u => /sitemap.*\.xml/i.test(u));
  const prods = locs.filter(u => /\.html$|\/produto|\/product|\/p\/|-p-|\/dp\//i.test(u) && !/sitemap/i.test(u));
  return { subs, prods, total: locs.length };
}

async function discoverSitemaps(base) {
  const root = base.replace(/\/$/, '');
  const cands = [
    root + '/sitemap.xml', root + '/sitemap_index.xml', root + '/sitemap-index.xml',
    root + '/sitemap_products_1.xml', root + '/pub/sitemap.xml', root + '/media/sitemap.xml',
  ];
  // robots.txt → Sitemap: lines
  const rob = await fetchText(root + '/robots.txt');
  if (rob.status === 200) {
    for (const m of rob.body.matchAll(/sitemap:\s*(\S+)/gi)) cands.push(m[1].trim());
  }
  const seen = new Set();
  for (const u of cands) {
    if (seen.has(u)) continue; seen.add(u);
    const sm = await fetchText(u);
    if (sm.status === 200 && sm.body.includes('<loc>')) return { url: u, body: sm.body };
  }
  return null;
}

async function probe(id, base) {
  const r = { id, base, home: '-', platform: '-', sitemap: '-', sampleEan: '-', samplePrice: '-', verdict: '' };
  const home = await fetchText(base);
  if (home.status !== 200) { r.home = `${home.status}${home.error ? ' ' + home.error : ''}`; r.verdict = '✗ inacessível'; return r; }
  r.home = '200';
  r.platform = detectPlatform(home.body);

  // sitemap (com descoberta alargada)
  const smFound = await discoverSitemaps(base);
  let prodUrls = [];
  if (smFound) {
    const pk = pickProductUrl(smFound.body, base);
    r.sitemap = `${pk.total} locs`;
    prodUrls = pk.prods.slice(0, 3);
    if (prodUrls.length === 0 && pk.subs.length) {
      // descer no sitemap index → preferir sub com "produt/product/shop"
      const subUrl = pk.subs.find(u => /produt|product|catalog|shop|item/i.test(u)) || pk.subs[0];
      const sub = await fetchText(subUrl);
      if (sub.status === 200) {
        const pk2 = pickProductUrl(sub.body, base);
        prodUrls = pk2.prods.slice(0, 3);
        // se ainda nada, amostrar URLs profundos arbitrários (não-home, não-sitemap)
        if (prodUrls.length === 0) {
          const deep = (sub.body.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim())
            .filter(u => u !== base && u !== base + '/' && !/sitemap/i.test(u));
          prodUrls = deep.slice(0, 3);
        }
        r.sitemap += ` →sub:${pk2.total}`;
      }
    }
    // último recurso: amostrar locs profundos do sitemap principal
    if (prodUrls.length === 0) {
      const deep = (smFound.body.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, '').trim())
        .filter(u => u !== base && u !== base + '/' && !/sitemap/i.test(u));
      prodUrls = deep.slice(0, 3);
    }
  } else {
    r.sitemap = 'nenhum';
  }

  // sample product
  if (prodUrls.length) {
    for (const pu of prodUrls) {
      const p = await fetchText(pu);
      if (p.status !== 200) continue;
      const e = findEanInProduct(p.body);
      if (e.jsonld || e.datalayer) {
        r.sampleEan = (e.jsonld || e.datalayer) + (e.jsonld ? ' (ld)' : ' (dl)');
        r.samplePrice = e.price || '?';
        r._sampleUrl = pu;
        break;
      } else if (e.price && r.samplePrice === '-') { r.samplePrice = e.price + ' (sem ean)'; r._sampleUrl = pu; }
    }
  }

  if (r.sampleEan !== '-' && r.samplePrice !== '-') r.verdict = '✓✓ EAN+preço HTTP simples';
  else if (r.sampleEan !== '-') r.verdict = '✓ EAN (preço?)';
  else if (r.platform !== 'desconhecido' && r.sitemap !== '-') r.verdict = '~ plataforma ok, sem EAN visível';
  else r.verdict = '? investigar manual';
  return r;
}

(async () => {
  const ids = process.argv.slice(2);
  const targets = ids.length ? ids.map(id => [id, ALL[id]]).filter(([, u]) => u) : Object.entries(ALL);
  console.log(`🔎 A sondar ${targets.length} candidatos (HTTP simples, sem ScrapingBee)…\n`);
  const results = [];
  for (const [id, base] of targets) {
    const r = await probe(id, base).catch(e => ({ id, base, verdict: 'ERRO ' + e.message }));
    results.push(r);
    console.log(`${(r.verdict||'').padEnd(30)} ${id.padEnd(20)} plat:${(r.platform||'-').padEnd(12)} home:${r.home} sitemap:${r.sitemap}`);
    if (r.sampleEan && r.sampleEan !== '-') console.log(`    └─ EAN:${r.sampleEan}  preço:${r.samplePrice}  ${r._sampleUrl||''}`);
  }
  console.log('\n══════ Veredito ══════');
  const win = results.filter(r => (r.verdict||'').startsWith('✓✓'));
  const maybe = results.filter(r => (r.verdict||'').startsWith('✓ ') || (r.verdict||'').startsWith('~'));
  console.log(`✓✓ Viáveis já (EAN+preço HTTP): ${win.map(r=>r.id).join(', ') || '—'}`);
  console.log(`~  Talvez (investigar):          ${maybe.map(r=>r.id).join(', ') || '—'}`);
})();
