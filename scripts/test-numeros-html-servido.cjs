#!/usr/bin/env node
// Teste offline: os contadores do HTML servido (lojas, produtos, poupança) saem
// do catálogo e não dos valores de exemplo do template (pendência 8: o HTML de
// produção dizia «Comparamos 17 lojas»). Usa o demo.html verdadeiro.
// Uso: node scripts/test-numeros-html-servido.cjs
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { escreverNumerosNoHtml, escreverNumeroNoManifest, IDS_LOJAS } = require('./lib/numeros-servidos');

const ROOT = path.resolve(__dirname, '..');
const demo = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');
const STATS = { stores: 102, products: 69108, avg_savings_pct: 30 };
const texto = (html, id) => {
  const m = new RegExp('\\sid="' + id + '"[^>]*>([^<]*)<').exec(html);
  return m ? m[1] : null;
};

let n = 0;
function caso(nome, fn) { fn(); n++; console.log('PASS:', nome); }

caso('o template tem os 11 contadores, com valores de exemplo', () => {
  for (const id of IDS_LOJAS) assert.notStrictEqual(texto(demo, id), null, id);
  assert.strictEqual(texto(demo, 'tagline-stores'), '17');
  assert.strictEqual(texto(demo, 'hero-stat-stores'), '46');
});

caso('todos os contadores passam a ter os números do catálogo', () => {
  const { html, trocas } = escreverNumerosNoHtml(demo, STATS);
  assert.strictEqual(trocas, 11);
  for (const id of IDS_LOJAS) assert.strictEqual(texto(html, id), '102', id);
  assert.strictEqual(texto(html, 'hero-stat-products'), '69108+');
  assert.strictEqual(texto(html, 'footer-mini-products'), (69108).toLocaleString('pt-PT'));
  assert.strictEqual(texto(html, 'news-stat-products'), (69108).toLocaleString('pt-PT'));
  assert.strictEqual(texto(html, 'hero-stat-savings'), '−30%');
  assert.ok(!/Comparamos <span id="tagline-stores">17</.test(html));
});

caso('só mudam os contadores: o resto do HTML (e o JS que usa os mesmos ids) fica igual', () => {
  const { html } = escreverNumerosNoHtml(demo, STATS);
  const a = demo.split('\n'), b = html.split('\n');
  assert.strictEqual(a.length, b.length);
  const mudadas = a.map((l, i) => l !== b[i] ? i : -1).filter(i => i >= 0);
  // 11 contadores em 10 linhas (footer-mini-stores e footer-mini-products partilham uma)
  assert.strictEqual(mudadas.length, 10);
  for (const i of mudadas) assert.ok(/\sid="[a-z-]+-(stores|products|savings)"/.test(a[i]), 'linha ' + (i + 1));
  // as listas de ids no JavaScript continuam lá, intactas
  assert.strictEqual(html.split("'tagline-stores'").length, demo.split("'tagline-stores'").length);
});

caso('idempotente: correr duas vezes dá o mesmo HTML', () => {
  const um = escreverNumerosNoHtml(demo, STATS).html;
  assert.strictEqual(escreverNumerosNoHtml(um, STATS).html, um);
});

caso('sem números conhecidos não se escreve nada (fica o que lá está)', () => {
  assert.strictEqual(escreverNumerosNoHtml(demo, null).html, demo);
  assert.strictEqual(escreverNumerosNoHtml(demo, { stores: 0, products: 0, avg_savings_pct: null }).trocas, 0);
});

caso('manifest: «em 70 lojas portuguesas» passa a ter o número do catálogo', () => {
  const m = fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8');
  const novo = escreverNumeroNoManifest(m, 102);
  assert.ok(/em 102 lojas portuguesas/.test(novo));
  assert.doesNotThrow(() => JSON.parse(novo));
  assert.strictEqual(escreverNumeroNoManifest(m, 0), m);
});

console.log(`\n${n}/${n} casos passaram`);
