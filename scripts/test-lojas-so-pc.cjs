'use strict';
// Lojas do PC (data/lojas-so-pc.json): nunca saem do site por idade, e o
// aviso pede para correr o refresh. Sem rede. Uso: node scripts/test-lojas-so-pc.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const cv = require('./lib/catalog-visibility');
const { avaliar, textoIssue } = require('./aviso-lojas-pc');

// 1. a lista é a mesma em todo o lado
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'lojas-so-pc.json'), 'utf8'));
assert.ok(Number.isFinite(cfg.avisar_dias) && cfg.avisar_dias > 0);
const sh = fs.readFileSync(path.join(ROOT, 'scripts', 'refresh-pc-only.sh'), 'utf8');
const order = sh.match(/^ORDER=\(([^)]*)\)/m)[1].trim().split(/\s+/).sort();
const doSh = Object.entries(cfg.lojas).filter(([, c]) => c === 'bash scripts/refresh-pc-only.sh').map(([s]) => s).sort();
assert.deepEqual(doSh, order, 'lojas-so-pc.json e o ORDER do refresh-pc-only.sh têm de ser as mesmas');
for (const c of new Set(Object.values(cfg.lojas))) assert.ok(fs.existsSync(path.join(ROOT, c.split(' ')[1])), 'comando sem script: ' + c);
const yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'freshness-monitor.yml'), 'utf8');
assert.ok(yml.includes('lojas-so-pc.json') && !/notino,powerbeauty/.test(yml), 'o monitor lê a lista do ficheiro, sem cópia à mão');
assert.ok(cv.lojasSoPc().has('notino') && !cv.lojasSoPc().has('druni'));

// 2. o site: oferta de loja do PC com 30 dias fica; da nuvem sai
const DAY = 864e5, agora = Date.parse('2026-10-14T12:00:00Z');
const em = d => new Date(agora - d * DAY).toISOString();
const seed = () => ({
  products: [
    { ean: '3337875598767', name: 'CeraVe Creme Hidratante 340g' },
    { ean: '3337875597197', name: 'CeraVe Gel de Limpeza 236ml' },
    { ean: '3433422404397', name: 'Avène Água Termal 300ml' },
  ],
  store_products: [
    { store_slug: 'notino', items: [{ ean: '3337875598767', price: 15, in_stock: true, verified_at: em(30) }, { ean: '3433422404397', price: 9, in_stock: true, verified_at: em(40) }] },
    { store_slug: 'druni', items: [{ ean: '3337875597197', price: 12, in_stock: true, verified_at: em(30) }] },
  ],
});
let s = seed();
const r = cv.dropRottenOffers(s, agora);
assert.deepEqual(s.store_products[0].items.map(i => i.ean), ['3337875598767'], 'PC: a de 30 d fica; a 10 d atrás da mais fresca da loja sai (regra relativa)');
assert.deepEqual(s.store_products[1].items, [], 'nuvem: 30 d sai pelo tecto');
assert.equal(r.mantidasPc, 1); assert.equal(r.hiddenAbs, 1);
const v = cv.applyVisibilityFilter(s, () => false);
assert.deepEqual(s.products.map(p => p.ean), ['3337875598767'], 'produto só com a oferta velha do PC continua visível');
assert.equal(v.visiveis, 1);

// 3. o aviso
const cfgT = { avisar_dias: 7, lojas: { notino: 'bash scripts/refresh-pc-only.sh', farmacianovadamaia: 'python scripts/refresh-farmacianovadamaia-pc.py' } };
const comIdade = (dn, dm) => ({ store_products: [{ store_slug: 'notino', items: [{ verified_at: em(dn) }] }, { store_slug: 'farmacianovadamaia', items: [{ verified_at: em(dm) }] }] });
let a = avaliar(comIdade(3, 2), cfgT, agora);
assert.equal(a.atrasadas.length, 0); assert.equal(a.lembrete, false);
a = avaliar(comIdade(8.5, 2), cfgT, agora);
assert.deepEqual([a.atrasadas.length, a.maxDias, a.lembrete], [1, 8, false]);
const md = textoIssue(a, 'dono');
assert.ok(md.startsWith('@dono') && md.includes('| notino |') && md.includes('bash scripts/refresh-pc-only.sh') && !md.includes('python scripts'), 'só o comando das atrasadas');
assert.equal(avaliar(comIdade(14.2, 2), cfgT, agora).lembrete, true, 'lembrete aos 14 d');
assert.equal(avaliar(comIdade(15.2, 2), cfgT, agora).lembrete, false);
assert.equal(avaliar(comIdade(21.9, 30), cfgT, agora).lembrete, false, 'conta a mais atrasada (30 d), não a primeira');
assert.equal(avaliar(comIdade(21.9, 28.1), cfgT, agora).lembrete, true);
assert.equal(avaliar({ store_products: [] }, cfgT, agora).atrasadas.length, 2, 'loja sem ofertas conta como atrasada');
// 4. lojas bloqueadas (2026-10-26): fora do alarme da nuvem, mas NÃO são do PC
// (essas nunca saem do site por idade; as bloqueadas saem aos 14 dias)
{
  const fs = require('fs'), path = require('path');
  const raiz = path.join(__dirname, '..');
  const bloq = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'lojas-bloqueadas.json'), 'utf8')).lojas;
  const doPc = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'lojas-so-pc.json'), 'utf8')).lojas));
  const slugs = new Set(fs.readFileSync(path.join(raiz, 'data', 'seed-bundle.json.gz', 'lojas.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l).slug));
  for (const [slug, b] of Object.entries(bloq)) {
    assert.ok(!doPc.has(slug), `${slug}: bloqueada e do PC ao mesmo tempo`);
    assert.ok(slugs.has(slug), `${slug}: loja desconhecida`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(b.desde || '') && b.motivo, `${slug}: falta «desde» ou «motivo»`);
  }
}
// 5. em espera (2026-10-26: Notino): fora do refresh e do aviso, ofertas ficam no site
{
  const espera = cfg.em_espera || {};
  assert.ok(espera.notino, 'a Notino está em espera');
  for (const [slug, e] of Object.entries(espera)) {
    assert.ok(!(slug in cfg.lojas), `${slug}: em espera e na rotina ao mesmo tempo`);
    assert.ok(!order.includes(slug), `${slug}: em espera mas ainda no ORDER do refresh-pc-only.sh`);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(e.desde || '') && e.motivo && e.retomar, `${slug}: falta «desde», «motivo» ou «retomar»`);
    assert.ok(cv.lojasSoPc().has(slug), `${slug}: as ofertas em espera têm de ficar no site`);
  }
  assert.ok(/em_espera/.test(yml), 'o monitor também ignora as lojas em espera');
  const cfgE = { avisar_dias: 7, lojas: cfgT.lojas, em_espera: { notino: { desde: '2026-10-26', motivo: 'x', retomar: 'feed de afiliados' } } };
  const semNotino = { avisar_dias: 7, lojas: { farmacianovadamaia: cfgT.lojas.farmacianovadamaia }, em_espera: cfgE.em_espera };
  const ae = avaliar(comIdade(30, 2), semNotino, agora);
  assert.equal(ae.atrasadas.length, 0, 'loja em espera não conta como atrasada');
  const mdE = textoIssue(avaliar(comIdade(30, 9), semNotino, agora), '');
  assert.ok(mdE.includes('Em espera') && mdE.includes('feed de afiliados') && !mdE.includes('| notino |'), 'a issue lembra a loja em espera, sem a pôr na tabela');
}
console.log('lojas-so-pc: lista igual no script e no monitor, PC fica no site, nuvem sai pelo tecto, aviso e lembrete semanal, lojas bloqueadas fora do PC, Notino em espera — tudo passou');
