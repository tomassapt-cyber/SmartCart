'use strict';
// Vigia dos portes (scripts/portes-vigia.js): assinatura das páginas, valores
// vigiados, alarme quando um valor usado pelo carrinho desaparece, revisão aos
// 90 dias e coerência com o store-shipping.json. Sem rede.
// Uso: node scripts/test-portes-vigia.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { assinatura, vigiados, desaparecidos, avaliar, relatorio, valoresDoCarrinho } = require('./portes-vigia');
const ROOT = path.resolve(__dirname, '..');

// 1. assinatura: valores junto de palavras de portes; preços soltos de produtos não
const pagina = `<html><body><h1>Envios</h1><p>Portugal Continental: 2.95&euro; – GRÁTIS para encomendas acima de 25€.</p>
  <p>Portes para as Ilhas: 4,95 € – grátis acima de 50 €.</p><script>var x="99€ portes";</script>
  <div class="produto">Creme Hidratante 50ml 18,90€</div></body></html>`;
const naPagina = assinatura(pagina);
for (const v of ['2.95', '4.95', '25', '50']) assert.ok(naPagina.includes(v), 'falta ' + v);
assert.ok(!naPagina.includes('99'), 'o texto dos <script> não conta');
// um preço de produto perto da frase de portes entra na assinatura (18,90)…
assert.ok(naPagina.includes('18.9'));
// …mas não é vigiado: só contam os valores que o carrinho usa
assert.deepEqual(vigiados(naPagina, { casa: 2.95, gratis: 25, ilhas: 4.95, gratis_ilhas: 50 }), ['2.95', '4.95', '25', '50']);
assert.deepEqual(assinatura('<p>Sem nada sobre portes. Creme 12,50€</p>'), []);

// 2. só se vigia o que o carrinho usa e a página mostra (24,99 € na página = limiar 25)
const entrada = { gratis: 25, casa: 4.99, ilhas: 6.69, gratis_ilhas: null, ponto: 4.99 };
assert.deepEqual(valoresDoCarrinho(entrada), [4.99, 25, 6.69]);
assert.deepEqual(vigiados(['3.99', '4.99', '6.69', '11.55', '24.99'], entrada), ['4.99', '6.69', '25']);
assert.deepEqual(desaparecidos(['4.99', '6.69', '25'], ['4.99', '6.69', '24.99']), []);
assert.deepEqual(desaparecidos(['4.99', '6.69', '25'], ['5.49', '6.69', '29.99']), ['4.99', '25']);

// 3. avaliar: mudou / inacessível / sem valores / revisão aos 90 dias
const agora = Date.parse('2026-10-15T12:00:00Z');
const fontes = { dias_revisao: 90, lojas: {
  a: { url: 'https://a.test/envios', verificado: '2026-10-15', valores: ['3.95', '20'] },
  b: { url: 'https://b.test/envios', verificado: '2026-10-15', valores: ['2.99', '39'] },
  c: { url: 'https://c.test/envios', verificado: '2026-10-15', valores: ['5'] },
  d: { url: 'https://d.test/envios', verificado: '2026-06-01', valores: [] },
} };
const r = avaliar(fontes, { a: { valores: ['3.95', '20'] }, b: { valores: ['2.99', '49'] }, c: { erro: 'HTTP 403' }, d: { valores: ['1'] } }, agora);
assert.deepEqual(r.mudaram.map(x => [x.slug, x.faltam]), [['b', ['39']]]);
assert.deepEqual(r.inacessiveis.map(x => x.slug), ['c']);
assert.deepEqual(r.semValores.map(x => x.slug), ['d']);
assert.deepEqual(r.antigas.map(x => x.slug), ['d']);
const md = relatorio(r, 'dono');
assert.ok(md.startsWith('@dono') && md.includes('| b |') && md.includes('**39**') && md.includes('--gravar=<loja>') && md.includes('Revisão periódica'));
assert.ok(!relatorio(avaliar(fontes, { a: { valores: ['3.95', '20'] }, b: { valores: ['2.99', '39'] }, c: { valores: ['5'] }, d: { valores: [] } }, agora), '').includes('mudou'));

// 4. o ficheiro de fontes: lojas existem no store-shipping.json, datas válidas, valores ⊂ valores do carrinho
const F = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'portes-fontes.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'store-shipping.json'), 'utf8'));
assert.ok(Number.isFinite(F.dias_revisao) && F.dias_revisao > 0);
for (const [slug, f] of Object.entries(F.lojas)) {
  assert.ok(S[slug], 'fonte de loja sem portes verificados: ' + slug);
  assert.ok(/^https:\/\//.test(f.url), slug + ': url');
  assert.ok(!Number.isNaN(Date.parse(f.verificado)), slug + ': data');
  const usados = valoresDoCarrinho(S[slug]);
  for (const v of f.valores) assert.ok(usados.some(u => Math.abs(u - Number(v)) <= 0.011), `${slug}: ${v} não é um valor do carrinho`);
}
const yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'portes-vigia.yml'), 'utf8');
assert.ok(yml.includes('scripts/portes-vigia.js') && yml.includes('test-portes-vigia.cjs'));
console.log('portes-vigia: assinatura, valores vigiados, alarme quando um valor do carrinho desaparece, revisão aos 90 dias, ficheiro de fontes coerente — tudo passou');
