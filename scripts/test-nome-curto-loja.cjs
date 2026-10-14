#!/usr/bin/env node
// Teste offline do nome curto das lojas nos cartões (storeShortName do demo.html),
// contra as lojas verdadeiras do catálogo: nenhuma loja fica com um nome que se
// confunda com o de outra, nem reduzido a uma palavra genérica.
// Uso: node scripts/test-nome-curto-loja.cjs   (precisa do seed montado)
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');
const ini = html.indexOf('const STORE_SHORT_NAMES = {');
const fim = html.indexOf('function productCard(', ini);
assert.ok(ini > 0 && fim > ini, 'storeShortName encontrado no demo.html');

const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
if (!fs.existsSync(SEED)) { console.error('Falta o seed montado: bash scripts/ci/seed.sh unpack'); process.exit(1); }
const stores = JSON.parse(fs.readFileSync(SEED, 'utf8')).stores;
const ctx = { STORE_BY_SLUG: Object.fromEntries(stores.map(s => [s.slug, s])) };
vm.createContext(ctx);
vm.runInContext(html.slice(ini, fim) + '\nthis.storeShortName = storeShortName;', ctx);

let n = 0;
function caso(nome, fn) { fn(); n++; console.log('PASS:', nome); }
const nomes = stores.map(s => [s.slug, ctx.storeShortName(s.slug)]);

caso(`os ${stores.length} nomes curtos são todos diferentes`, () => {
  const por = new Map();
  for (const [slug, nome] of nomes) por.set(nome, [...(por.get(nome) || []), slug]);
  const repetidos = [...por].filter(([, v]) => v.length > 1).map(([k, v]) => `${k}: ${v.join(', ')}`);
  assert.deepEqual(repetidos, []);
});

caso('nenhum nome fica reduzido a uma palavra genérica ou a 1–2 letras', () => {
  const GENERICOS = /^(A|O|As|Os|My|GO|Loja|Farmácia|Farmácias|F\.|Love|Care|Nossa|Pharma)$/i;
  const maus = nomes.filter(([, nome]) => nome.length <= 2 || GENERICOS.test(nome));
  assert.deepEqual(maus, []);
});

caso('exemplos: Farmácia Barreiros, A Tua Farmácia, Love My Pharma, Druni PT', () => {
  const de = slug => ctx.storeShortName(slug);
  if (ctx.STORE_BY_SLUG.barreiros) assert.equal(de('barreiros'), 'F. Barreiros');
  if (ctx.STORE_BY_SLUG.atuafarmacia) assert.equal(de('atuafarmacia'), 'A Tua Farmácia');
  if (ctx.STORE_BY_SLUG.lovemypharma) assert.equal(de('lovemypharma'), 'Love My Pharma');
  if (ctx.STORE_BY_SLUG.druni) assert.equal(de('druni'), 'Druni');
  assert.equal(de('farmaciasportuguesas'), 'F. Portuguesas'); // mapa explícito mantém-se
  assert.equal(de('loja-que-nao-existe'), 'loja-que-nao-existe');
});

console.log(`\n${n}/${n} casos passaram`);
