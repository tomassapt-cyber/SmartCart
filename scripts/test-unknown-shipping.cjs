const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'demo.html'), 'utf8');
let scripts = 0;
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  if (!match[1].trim() || /type=["']application\/json/.test(match[0])) continue;
  new vm.Script(match[1]);
  scripts++;
}
assert.ok(scripts > 0, 'scripts da página encontrados');

function extract(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, start);
  return html.slice(from, to);
}
const code = extract('function shippingForStore(', '// STATE')
  + extract('function optimizeBundle(', 'function renderResults(');
const normalizeCode = extract('function normalizeSeedFromLive(', 'function rebuildCatalogIndexes(');
const normalized = vm.runInNewContext(normalizeCode + '\nnormalizeSeedFromLive({ stores: [{ slug: "maia" }, { slug: "gratis", free_shipping_threshold: 0, shipping_zones: { mainland: 0 } }] });');
assert.equal(normalized.stores[0].free_shipping_threshold, null);
assert.equal(normalized.stores[0].shipping_zones, null);
assert.equal(normalized.stores[1].free_shipping_threshold, 0);
assert.equal(normalized.stores[1].shipping_zones.mainland, 0);
const ctx = {
  STORE_BY_SLUG: {
    maia: { slug: 'maia', name: 'Maia', shipping_zones: null, free_shipping_threshold: null },
    fixa: { slug: 'fixa', name: 'Fixa', shipping_zones: { mainland: 4, madeira: 7, acores: 9 }, free_shipping_threshold: null },
    gratis: { slug: 'gratis', name: 'Grátis', shipping_zones: { mainland: 0, madeira: 0, acores: 0 }, free_shipping_threshold: null },
  },
  OFFERS_BY_PRODUCT: {},
  PRODUCT_BY_EAN: { a: { name: 'A', brand: 'Marca' } },
  bundleState: { volumes: new Map() },
  ofertasProntasComVariantes: () => true,
  Set, Map, Object, Array, Math, Number, Infinity,
};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const offer = (price) => ({ in_stock: true, price, url: 'https://example.invalid/p' });
assert.equal(ctx.shippingForStore('maia', 'nacional'), null);
assert.equal(ctx.shippingForStore('fixa', 'Madeira'), 7);
assert.equal(ctx.shippingForStore('fixa', 'Açores'), 9);
assert.equal(ctx.shippingForStore('gratis', 'nacional'), 0);
ctx.OFFERS_BY_PRODUCT.a = { maia: offer(5) };
let result = ctx.optimizeBundle([{ ean: 'a', qty: 1 }]);
assert.equal(result.solutions.length, 0);
assert.deepEqual(Array.from(result.shippingUnknown), ['a']);
assert.equal(result.uncovered.length, 0);
ctx.OFFERS_BY_PRODUCT.a.fixa = offer(6);
result = ctx.optimizeBundle([{ ean: 'a', qty: 1 }]);
assert.equal(result.solutions[0].total, 10);
assert.equal(result.solutions[0].stores_used[0], 'fixa');
assert.equal(result.shippingUnknown.length, 0);
ctx.OFFERS_BY_PRODUCT.a.gratis = offer(7);
result = ctx.optimizeBundle([{ ean: 'a', qty: 1 }]);
assert.equal(result.solutions[0].total, 7);
assert.equal(result.solutions[0].stores_used[0], 'gratis');
console.log('OK: sintaxe da página; portes desconhecidos, zonas, custo zero e ranking.');

