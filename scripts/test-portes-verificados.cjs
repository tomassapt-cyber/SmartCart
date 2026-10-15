#!/usr/bin/env node
// Teste offline dos portes verificados (data/store-shipping.json) e da sua
// aplicação às lojas: formato do ficheiro, semântica dos campos (incluindo
// `ilhas: null` = desconhecido nas ilhas, 2026-10-14) e efeito no otimizador do
// carrinho do demo.html (o mesmo método do test-unknown-shipping.cjs).
// Uso: node scripts/test-portes-verificados.cjs
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { applyVerifiedShipping } = require('./lib/verified-shipping');

const ROOT = path.resolve(__dirname, '..');
const FICH = path.join(ROOT, 'data', 'store-shipping.json');
const bruto = fs.readFileSync(FICH, 'utf8');
const ship = JSON.parse(bruto);

let n = 0;
function caso(nome, fn) { fn(); n++; console.log('PASS:', nome); }

caso('formato: indentação de 1 espaço, LF, \\n final', () => {
  assert.equal(bruto.replace(/\r\n/g, '\n'), JSON.stringify(ship, null, 1) + '\n');
});

caso('cada entrada só tem campos conhecidos, com valores válidos', () => {
  const CAMPOS = new Set(['gratis', 'casa', 'ilhas', 'gratis_ilhas', 'ponto', 'ponto_txt']);
  const numOuNull = v => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
  for (const [slug, v] of Object.entries(ship)) {
    assert.equal(typeof v, 'object', slug);
    for (const k of Object.keys(v)) assert.ok(CAMPOS.has(k), `${slug}: campo desconhecido ${k}`);
    // casa: null = «só no checkout» (limiar verificado, tarifa por saber)
    for (const k of ['gratis', 'casa', 'ilhas', 'gratis_ilhas', 'ponto']) if (k in v) assert.ok(numOuNull(v[k]), `${slug}.${k}`);
    if ('ponto_txt' in v) assert.ok(v.ponto_txt === null || typeof v.ponto_txt === 'string', `${slug}.ponto_txt`);
  }
});

const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
if (fs.existsSync(SEED)) {
  // Só as lojas que este ficheiro passou a cobrir a 14/10: uma loja nova pode ter
  // os portes registados antes da 1.ª integração (ex.: a Glammy, #56).
  caso('as 33 lojas acrescentadas a 14/10 e a Cocooncenter existem no seed', () => {
    const slugs = new Set(JSON.parse(fs.readFileSync(SEED, 'utf8')).stores.map(s => s.slug));
    const DE_14_10 = ['cocooncenter', 'lojashampoo', 'farmaciasdirect', 'caretobeauty', 'parfumdreams', 'auchan', 'farmaciabarata', 'farmaciadaliga', 'megafarma', 'sofarma', 'pharma24', 'farmaciabemestar', 'farmaciagaiajardim', 'farmaciasprogresso', 'farma2go', 'dermis', 'farmacia24', 'farmaciapertodemim', 'farmacentral', 'farmaciamarquesbraga', 'farmaciaemcasa', 'balvera', 'camelo', 'santamarta', 'koreanbeauty', 'farmaciarodrigues', 'pharmaciadocabelo', 'miin', 'storekbeauty', 'orientperfumes', 'mitso', 'glowthie', 'mypharmaspot', 'farmacia2u'];
    assert.equal(DE_14_10.length, 34);
    assert.deepEqual(DE_14_10.filter(s => !slugs.has(s) || !ship[s]), []);
  });
} else console.log('(seed montado ausente: verificação de slugs saltada — corre `bash scripts/ci/seed.sh unpack`)');

// semântica do overlay, com um store-shipping.json temporário
function aplicar(entradas, lojas) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portes-'));
  fs.mkdirSync(path.join(dir, 'data'));
  fs.writeFileSync(path.join(dir, 'data', 'store-shipping.json'), JSON.stringify(entradas));
  const seed = { stores: lojas.map(s => JSON.parse(JSON.stringify(s))) };
  applyVerifiedShipping(seed, dir);
  fs.rmSync(dir, { recursive: true, force: true });
  return Object.fromEntries(seed.stores.map(s => [s.slug, s]));
}
const adivinhada = slug => ({ slug, free_shipping_threshold: 49, shipping_zones: { mainland: 3.95, madeira: 8.9, acores: 8.9 } });

caso('fase 5: ilhas ausente → desconhecido nas ilhas (já não copia a tarifa de casa)', () => {
  const r = aplicar({ a: { gratis: 40, casa: 3.7 } }, [adivinhada('a')]);
  assert.deepEqual(r.a.shipping_zones, { mainland: 3.7, madeira: null, acores: null, gratis_ilhas: null });
  assert.equal(r.a.free_shipping_threshold, 40);
});

caso('fase 5: loja sem entrada → tudo desconhecido, nada do que o integrador adivinhou', () => {
  const r = aplicar({}, [adivinhada('x')]);
  assert.equal(r.x.free_shipping_threshold, null);
  assert.deepEqual(r.x.shipping_zones, { mainland: null, madeira: null, acores: null, gratis_ilhas: null });
});

caso('fase 5: casa ausente → desconhecida; ilhas verificadas valem mesmo sem casa', () => {
  const r = aplicar({ p: { gratis: 39, ilhas: 11.55, gratis_ilhas: null } }, [adivinhada('p')]);
  assert.deepEqual(r.p.shipping_zones, { mainland: null, madeira: 11.55, acores: 11.55, gratis_ilhas: null });
  assert.equal(r.p.free_shipping_threshold, 39);
});

caso('ilhas: null → desconhecido nas ilhas (não fica o valor adivinhado nem o de casa)', () => {
  const r = aplicar({ a: { gratis: 45, casa: 4, ilhas: null } }, [adivinhada('a')]);
  assert.deepEqual(r.a.shipping_zones, { mainland: 4, madeira: null, acores: null, gratis_ilhas: null });
});

caso('ilhas com valor → esse valor', () => {
  const r = aplicar({ a: { gratis: 38.6, casa: 3.94, ilhas: 15 } }, [adivinhada('a')]);
  assert.deepEqual(r.a.shipping_zones, { mainland: 3.94, madeira: 15, acores: 15, gratis_ilhas: null });
});

caso('gratis: null → nunca grátis; fase 5: gratis ausente → null (não fica o 49 adivinhado)', () => {
  const r = aplicar({ a: { gratis: null, casa: 7.95 }, b: { casa: 5 } }, [adivinhada('a'), adivinhada('b')]);
  assert.equal(r.a.free_shipping_threshold, null);
  assert.equal(r.b.free_shipping_threshold, null);
});

caso('Cocooncenter verificada: casa 7,95 € e nunca grátis em casa', () => {
  assert.deepEqual(ship.cocooncenter, { gratis: null, casa: 7.95, ponto: 6.95, ponto_txt: '6,95 € (grátis ≥79 €)', ilhas: 7.95, gratis_ilhas: null });
});

caso('as 5 lojas que não enviam às ilhas, ou cobram por peso, ficam com ilhas: null', () => {
  for (const s of ['farmaciadaliga', 'farmaciasdirect', 'farmaciagaiajardim', 'farma2go', 'koreanbeauty']) {
    assert.ok('ilhas' in ship[s] && ship[s].ilhas === null, s);
  }
});

// efeito no otimizador do carrinho (código verdadeiro do demo.html)
caso('carrinho: loja com ilhas desconhecidas entra no continente e sai das combinações nas ilhas', () => {
  const html = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');
  const extrair = (ini, fim) => { const a = html.indexOf(ini), b = html.indexOf(fim, a); assert.ok(a >= 0 && b > a, ini); return html.slice(a, b); };
  const code = extrair('function shippingForStore(', '// STATE') + extrair('function optimizeBundle(', 'function renderResults(');
  const r = aplicar({ liga: { gratis: 45, casa: 4, ilhas: null }, outra: { gratis: null, casa: 5, ilhas: 9 } },
    [adivinhada('liga'), adivinhada('outra')]);
  const ctx = {
    STORE_BY_SLUG: { liga: { ...r.liga, name: 'Liga' }, outra: { ...r.outra, name: 'Outra' } },
    OFFERS_BY_PRODUCT: { a: {
      liga: { in_stock: true, price: 10, url: 'https://example.invalid/a' },
      outra: { in_stock: true, price: 12, url: 'https://example.invalid/b' },
    } },
    PRODUCT_BY_EAN: { a: { name: 'A', brand: 'Marca' } },
    bundleState: { volumes: new Map() },
    ofertasProntasComVariantes: () => true,
    Set, Map, Object, Array, Math, Number, Infinity,
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  assert.equal(ctx.shippingForStore('liga', 'nacional'), 4);
  assert.equal(ctx.shippingForStore('liga', 'Açores'), null);
  let res = ctx.optimizeBundle([{ ean: 'a', qty: 1 }], 'nacional');
  assert.equal(res.solutions[0].stores_used[0], 'liga');
  assert.equal(res.solutions[0].total, 14);
  res = ctx.optimizeBundle([{ ean: 'a', qty: 1 }], 'Açores');
  assert.equal(res.solutions[0].stores_used[0], 'outra');
  assert.equal(res.solutions[0].total, 21);
  assert.ok(res.solutions.every(s => !s.stores_used.includes('liga')));
});


caso('gratis_ilhas: número, null (nunca grátis nas ilhas) e, fase 5, ausente = null explícito', () => {
  const r = aplicar({ a: { gratis: 99, casa: 4.95, ilhas: 5.95, gratis_ilhas: 249 }, b: { gratis: 39, casa: 2.99, ilhas: 13, gratis_ilhas: null }, c: { gratis: 25, casa: 3.49, ilhas: 5.99 } },
    [adivinhada('a'), adivinhada('b'), adivinhada('c')]);
  assert.equal(r.a.shipping_zones.gratis_ilhas, 249);
  assert.equal(r.b.shipping_zones.gratis_ilhas, null);
  assert.ok('gratis_ilhas' in r.c.shipping_zones && r.c.shipping_zones.gratis_ilhas === null);
});

caso('carrinho: limiar próprio das ilhas — grátis no continente não promete grátis nas ilhas', () => {
  const html = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');
  const extrair = (ini, fim) => { const a = html.indexOf(ini), b = html.indexOf(fim, a); assert.ok(a >= 0 && b > a, ini); return html.slice(a, b); };
  const code = extrair('function shippingForStore(', '// STATE') + extrair('function optimizeBundle(', 'function renderResults(');
  const r = aplicar({ uni: { gratis: 39, casa: 2.99, ilhas: 13, gratis_ilhas: null }, nou: { gratis: 99, casa: 4.95, ilhas: 5.95, gratis_ilhas: 249 } },
    [adivinhada('uni'), adivinhada('nou')]);
  const ctx = {
    STORE_BY_SLUG: { uni: { ...r.uni, name: 'Uni' }, nou: { ...r.nou, name: 'Nou' } },
    OFFERS_BY_PRODUCT: { a: { uni: { in_stock: true, price: 60, url: 'https://example.invalid/a' } }, b: { nou: { in_stock: true, price: 120, url: 'https://example.invalid/b' } } },
    PRODUCT_BY_EAN: { a: { name: 'A', brand: 'M' }, b: { name: 'B', brand: 'M' } },
    bundleState: { volumes: new Map() }, ofertasProntasComVariantes: () => true,
    Set, Map, Object, Array, Math, Number, Infinity,
  };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  // 60 € na Uni: continente grátis (≥39); Açores paga 13 € (nas ilhas nunca é grátis)
  assert.equal(ctx.optimizeBundle([{ ean: 'a', qty: 1 }], 'nacional').solutions[0].total, 60);
  assert.equal(ctx.optimizeBundle([{ ean: 'a', qty: 1 }], 'Açores').solutions[0].total, 73);
  // 120 € na Nou: continente grátis (≥99); Madeira paga 5,95 € (só grátis ≥249)
  assert.equal(ctx.optimizeBundle([{ ean: 'b', qty: 1 }], 'nacional').solutions[0].total, 120);
  assert.equal(ctx.optimizeBundle([{ ean: 'b', qty: 1 }], 'Madeira').solutions[0].total, 125.95);
});

caso('fase 5, carrinho: loja só com limiar verificado entra acima do limiar (portes 0 €) e sai abaixo', () => {
  const html = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');
  const extrair = (ini, fim) => { const a = html.indexOf(ini), b = html.indexOf(fim, a); assert.ok(a >= 0 && b > a, ini); return html.slice(a, b); };
  const code = extrair('function shippingForStore(', '// STATE') + extrair('function optimizeBundle(', 'function renderResults(');
  const r = aplicar({ lim: { gratis: 40 }, fixa: { gratis: null, casa: 5 } }, [adivinhada('lim'), adivinhada('fixa')]);
  const ctx = {
    STORE_BY_SLUG: { lim: { ...r.lim, name: 'Lim' }, fixa: { ...r.fixa, name: 'Fixa' } },
    OFFERS_BY_PRODUCT: {
      a: { lim: { in_stock: true, price: 30, url: 'u' }, fixa: { in_stock: true, price: 33, url: 'u' } },
      b: { lim: { in_stock: true, price: 45, url: 'u' }, fixa: { in_stock: true, price: 46, url: 'u' } },
    },
    PRODUCT_BY_EAN: { a: { name: 'A', brand: 'M' }, b: { name: 'B', brand: 'M' } },
    bundleState: { volumes: new Map() }, ofertasProntasComVariantes: () => true,
    Set, Map, Object, Array, Math, Number, Infinity,
  };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  assert.equal(ctx.portesCalculaveis('lim', 'nacional'), true);
  // 30 € na Lim (tarifa por saber, abaixo de 40) → não entra; Fixa 33 + 5
  let res = ctx.optimizeBundle([{ ean: 'a', qty: 1 }], 'nacional');
  assert.deepEqual([res.solutions[0].stores_used[0], res.solutions[0].total], ['fixa', 38]);
  assert.ok(res.solutions.every(s => !s.stores_used.includes('lim')));
  // 45 € na Lim (≥40) → portes 0 €, sabidos → é a melhor
  res = ctx.optimizeBundle([{ ean: 'b', qty: 1 }], 'nacional');
  assert.deepEqual([res.solutions[0].stores_used[0], res.solutions[0].total, res.solutions[0].breakdown[0].free_shipping], ['lim', 45, true]);
  assert.equal(res.solutions[0].breakdown[0].shipping_base, null);
});

caso('fase 5, carrinho: um produto sem portes conhecidos não anula o resto do cabaz', () => {
  const html = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');
  const extrair = (ini, fim) => { const a = html.indexOf(ini), b = html.indexOf(fim, a); assert.ok(a >= 0 && b > a, ini); return html.slice(a, b); };
  const code = extrair('function shippingForStore(', '// STATE') + extrair('function optimizeBundle(', 'function renderResults(');
  const r = aplicar({ nada: {}, lim: { gratis: 100 }, fixa: { gratis: null, casa: 5 } }, [adivinhada('nada'), adivinhada('lim'), adivinhada('fixa')]);
  const ctx = {
    STORE_BY_SLUG: { nada: { ...r.nada, name: 'Nada' }, lim: { ...r.lim, name: 'Lim' }, fixa: { ...r.fixa, name: 'Fixa' } },
    OFFERS_BY_PRODUCT: {
      a: { nada: { in_stock: true, price: 10, url: 'u' } },           // só numa loja sem nada verificado
      c: { lim: { in_stock: true, price: 20, url: 'u' } },            // só numa loja só-limiar, abaixo dele
      b: { fixa: { in_stock: true, price: 12, url: 'u' } },
    },
    PRODUCT_BY_EAN: { a: { name: 'A', brand: 'M' }, b: { name: 'B', brand: 'M' }, c: { name: 'C', brand: 'M' } },
    bundleState: { volumes: new Map() }, ofertasProntasComVariantes: () => true,
    Set, Map, Object, Array, Math, Number, Infinity,
  };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const res = ctx.optimizeBundle([{ ean: 'a', qty: 1 }, { ean: 'b', qty: 1 }, { ean: 'c', qty: 1 }], 'nacional');
  assert.deepEqual(Array.from(res.shippingUnknown).sort(), ['a', 'c']);
  assert.deepEqual([res.solutions[0].stores_used.join(), res.solutions[0].total], ['fixa', 17]);
  assert.equal(res.uncovered.length, 0);
});

console.log(`\n${n}/${n} casos passaram`);
