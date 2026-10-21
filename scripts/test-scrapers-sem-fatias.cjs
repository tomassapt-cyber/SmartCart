#!/usr/bin/env node
// Os scrapers não podem guardar o resultado da extração tal como sai das regex:
// cada campo é uma «fatia» que mantém viva a página HTML inteira, e uma recolha
// de milhares de páginas enche o heap (Farmácia.pt: OOM aos 4 GB a 21/10/2026).
// 1) verificação estática de todos os scrape-*-catalog.js;
// 2) prova com a extractProductData verdadeira da Farmácia.pt numa página
//    sintética de ~440 KB (sem rede).
// Uso: node scripts/test-scrapers-sem-fatias.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const v8 = require('node:v8');
const assert = require('node:assert/strict');

const SCRIPTS = __dirname;
let n = 0;
function caso(nome, fn) { fn(); n++; console.log('PASS:', nome); }

caso('nenhum scraper guarda {…, ...resultado} sem cópia JSON', () => {
  const maus = [];
  const ficheiros = fs.readdirSync(SCRIPTS).filter(f => /^scrape-.*-catalog\.js$/.test(f));
  assert.ok(ficheiros.length > 50, 'scrapers encontrados');
  for (const f of ficheiros) {
    fs.readFileSync(path.join(SCRIPTS, f), 'utf8').split(/\r?\n/).forEach((l, i) => {
      if (/products\.push\(\{[^\n]*\.\.\.\w+/.test(l) && !/JSON\.parse\(JSON\.stringify/.test(l)) maus.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(maus, []);
});

caso('com a cópia JSON, 400 páginas de 440 KB não ficam retidas (sem ela ficam)', () => {
  v8.setFlagsFromString('--expose_gc');
  const gc = vm.runInNewContext('gc');
  const src = fs.readFileSync(path.join(SCRIPTS, 'scrape-farmaciapt-catalog.js'), 'utf8');
  const ini = src.indexOf('function extractProductData(');
  const fim = src.indexOf('\nasync function', ini);
  assert.ok(ini > 0 && fim > ini, 'extractProductData encontrada');
  const ctx = {};
  vm.createContext(ctx);
  const topo = src.slice(src.indexOf('function '), ini).replace(/^const .*require\(.*$/gm, '');
  vm.runInContext(topo + '\n' + src.slice(ini, fim) + '\nthis.extract = extractProductData;', ctx);
  const pagina = '<html><head><meta property="og:title" content="Sesderma Resveraderm Sérum 30ml">'
    + '<meta property="product:brand" content="Sesderma"><meta property="og:image" content="https://x/i.jpg">'
    + '<meta property="og:description" content="Sérum antioxidante.">'
    + '<span data-price-amount="24.9" data-price-type="finalPrice"></span>'
    + '<script>{"gtin13":"8429979411617","availability":"https://schema.org/InStock"}</script>'
    + '</head><body>' + 'x'.repeat(440 * 1024) + '</body></html>';
  assert.ok(ctx.extract(pagina, 'https://farmacia.pt/a'), 'a página sintética é reconhecida');
  const medir = copiar => {
    gc(); const antes = process.memoryUsage().heapUsed;
    const guardados = [];
    for (let i = 0; i < 400; i++) {
      const d = ctx.extract(pagina + i, 'https://farmacia.pt/x' + i);
      const linha = { url: 'https://farmacia.pt/x' + i, status: 'ok', ...d };
      guardados.push(copiar ? JSON.parse(JSON.stringify(linha)) : linha);
    }
    gc(); const mb = (process.memoryUsage().heapUsed - antes) / 1048576;
    guardados.length = 0;
    return mb;
  };
  const sem = medir(false), com = medir(true);
  console.log(`   retido: sem cópia ${sem.toFixed(0)} MB · com cópia ${com.toFixed(1)} MB`);
  assert.ok(sem > 100, 'sem cópia, a página fica retida (prova do mecanismo)');
  assert.ok(com < 20, 'com cópia, quase nada fica retido');
});

console.log(`\n${n}/${n} casos passaram`);
