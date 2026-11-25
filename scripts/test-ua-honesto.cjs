'use strict';
// UA honesto (2026-11-25): o CosMath apresenta-se sempre como o robô do CosMath, nunca como um
// browser. A migração vai por lotes; PENDENTES são os ficheiros que ainda faltam, e a lista só
// pode encolher. Nenhum ficheiro novo pode trazer o UA de browser nem opções que escondem a
// automação (--disable-blink-features=AutomationControlled, navigator.webdriver…). Sem rede.
// Uso: node scripts/test-ua-honesto.cjs
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const S = __dirname;
const { UA_COSMATH } = require('./lib/identidade');
assert.match(UA_COSMATH, /^CosMath-Catalog-Bot\/1\.0 \(\+https:\/\/smart-cart-zx55\.vercel\.app; price comparison\)$/);
assert.equal(require('./lib/leitura-alargada').UA_COSMATH, UA_COSMATH, 'leitura-alargada usa o UA central');

// a resilient-fetch (cabeçalhos de quase todos os leitores) manda o UA do CosMath, e um só
const { browserHeaders, DEFAULT_UA } = require('./lib/resilient-fetch');
assert.equal(DEFAULT_UA, UA_COSMATH);
assert.equal(browserHeaders()['User-Agent'], UA_COSMATH);
const h = browserHeaders({ 'user-agent': UA_COSMATH, 'accept-language': 'pt-PT' });
assert.deepEqual(Object.keys(h).filter(k => k.toLowerCase() === 'user-agent'), ['user-agent'], 'um só User-Agent');
assert.deepEqual(Object.keys(h).filter(k => k.toLowerCase() === 'accept-language'), ['accept-language']);
assert.equal(new Headers(h).get('user-agent'), UA_COSMATH, 'o pedido leva o UA uma vez');

// a sonda do ensaio nunca abre as lojas proibidas, e só essas (pelo nome exato ou pelo domínio)
const { NUNCA } = require('./ensaio-ua');
for (const s of ['afarmaciaonline', 'afarmaciaonline.pt', 'notino', 'www.notino.pt', 'perfumesclub.pt', 'caretobeauty', 'barreiros.pt']) assert.equal(NUNCA.test(s), true, s);
for (const s of ['asuafarmaciaonline', 'asuafarmaciaonline.pt', 'farmaciabarreirosx.pt', 'glowthie.com']) assert.equal(NUNCA.test(s), false, s);

// ainda por migrar (lotes 3–5); tirar daqui cada ficheiro migrado
const PENDENTES = new Set([
  'audit-product-images.js', 'build-homepage-data.js', 'build-popular-searches.js', 'carrinho-automatico.js',
  'discover-inventory.js', 'fetch-notino-images.js', 'fix-bad-images.py', 'inspect-page.js', 'probe-deep.js',
  'probe-find-products.js', 'probe-pharmacies.js', 'probe-shipping.js', 'probe-store-candidates.js',
  'refresh-seed-images.js', 'scrape-afarmaciaonline-catalog.js', 'scrape-barreiros-catalog.js',
  'scrape-druni-catalog.js', 'scrape-manuelaserra-catalog.js', 'scrape-miin-catalog.js',
  'scrape-mycosmetics-catalog.js', 'scrape-nossafarmacia-catalog.js', 'scrape-notino-catalog.js',
  'scrape-perfumesclub-catalog.js', 'scrape-pharma2you-catalog.js', 'scrape-pharmagdd-catalog.js',
  'scrape-pharmascalabis-catalog.js', 'scrape-pluricosmetica-catalog.js', 'scrape-poupafarma-catalog.js',
  'scrape-prices.js', 'scrape-quickfarma-catalog.js', 'scrape-saudemayor-catalog.js', 'scrape-skpro-catalog.js',
  'scrape-storekbeauty-catalog.js', 'scrape-sweetcare-catalog.js', 'scrape-unifarma-catalog.js',
  'scrape-vallispharma-catalog.js', 'scrape-vidamais-catalog.js', 'scrape-wells-catalog.js',
  'scrape-wowfarma-catalog.js', 'verify-ghost-offers.js', 'verify-live-prices.js', 'verify-store.js',
]);

const BROWSER = /Mozilla\/5\.0|AutomationControlled|navigator\s*,\s*['"]webdriver|navigator\.webdriver\s*=/;
const ficheiros = [];
(function andar(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') andar(p); }
    else if (/\.(c?js|mjs|py|sh)$/.test(e.name) && p !== __filename) ficheiros.push(p);
  }
})(S);
const comBrowser = ficheiros.filter(p => BROWSER.test(fs.readFileSync(p, 'utf8'))).map(p => path.relative(S, p).replace(/\\/g, '/'));
const novos = comBrowser.filter(f => !PENDENTES.has(f));
assert.deepEqual(novos, [], `ficheiros com UA de browser fora da lista de pendentes (usar scripts/lib/identidade.js): ${novos.join(', ')}`);
const jaMigrados = [...PENDENTES].filter(f => !comBrowser.includes(f));
assert.deepEqual(jaMigrados, [], `já não têm UA de browser — tirar de PENDENTES: ${jaMigrados.join(', ')}`);

console.log(`UA honesto: UA central, um só User-Agent por pedido, nenhum ficheiro novo com UA de browser · faltam ${PENDENTES.size} ficheiros (lotes seguintes) — tudo passou`);
