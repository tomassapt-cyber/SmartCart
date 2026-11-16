'use strict';
/**
 * CosMath — leitura alargada das lojas lidas em parte (2026-11-16, ponto 3 da
 * ordem de trabalho da auditoria de 06/11)
 * ===========================================================================
 * Os leitores de Aveirofarma, Primor, Atida, Cocooncenter e Sofarma só abriam as
 * fichas cujo endereço tinha uma marca ou palavra «dermo». A auditoria mostrou
 * que muitas das fichas saltadas são produtos que já comparamos noutras lojas.
 *
 * Isto junta aos leitores três coisas, sem lhes mudar a leitura das fichas:
 *
 * 1. DESCOBERTA aos poucos: em cada corrida abrem-se até N fichas do mapa da
 *    loja que nunca foram vistas. Guarda-se o EAN de cada uma num ficheiro de
 *    memória (url → [ean, dia]) que passa de corrida em corrida pela cache do
 *    Actions (não vai para o git: seriam MB novos 3×/dia). Uma ficha vista cujo
 *    EAN não está no catálogo não se volta a abrir durante DIAS_VALIDADE dias.
 *    As fichas descobertas saem marcadas `descoberta: true` e os integradores
 *    só as JUNTAM a produtos que já existem: não criam produtos novos.
 * 2. As fichas da memória cujo EAN está no catálogo entram na leitura normal,
 *    tal como os endereços das ofertas que a loja já tem.
 * 3. RITMO DO robots.txt: com Crawl-delay, um pedido de cada vez e a espera que
 *    a loja pede (Cocooncenter 10 s, Sofarma 1 s; antes liam-se 5 fichas em
 *    paralelo). Com um orçamento de tempo, lê-se primeiro o que está há mais
 *    tempo sem ser lido; o resto fica para a corrida seguinte (as ofertas que
 *    não se leem não desaparecem: envelhecem e as regras de frescura tratam-nas).
 *
 * Identificação honesta: os leitores passam a usar UA_COSMATH (as 5 lojas
 * aceitam-no, testado a 16/11), em vez de fingirem ser um Chrome.
 */
const fs = require('fs');
const path = require('path');

const UA_COSMATH = 'CosMath-Catalog-Bot/1.0 (+https://smart-cart-zx55.vercel.app; price comparison)';
const ROOT = path.resolve(__dirname, '..', '..');
const DIAS_VALIDADE = 45;
const semZeros = e => String(e || '').replace(/^0+/, '');
const hoje = () => new Date().toISOString().slice(0, 10);

/** Crawl-delay (segundos) do grupo do robots.txt que se aplica ao nosso robô, ou ao «*». */
function crawlDelayDe(robotsTxt, ua = UA_COSMATH) {
  const token = ua.split('/')[0].toLowerCase();
  const grupos = []; let atual = null, emAgentes = false;
  for (const linha of String(robotsTxt || '').split(/\r?\n/)) {
    const m = linha.replace(/#.*/, '').trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const campo = m[1].toLowerCase(), valor = m[2].trim();
    if (campo === 'user-agent') {
      if (!emAgentes) { atual = { agentes: [], delay: null }; grupos.push(atual); emAgentes = true; }
      atual.agentes.push(valor.toLowerCase());
    } else {
      emAgentes = false;
      if (atual && campo === 'crawl-delay' && Number(valor) > 0) atual.delay = Number(valor);
    }
  }
  const nosso = grupos.find(g => g.agentes.some(a => a !== '*' && token.includes(a)));
  const todos = grupos.find(g => g.agentes.includes('*'));
  return (nosso || todos || {}).delay || null;
}

/**
 * Ritmo da loja: lê o robots.txt e, havendo Crawl-delay, devolve um pedido de cada
 * vez com essa espera. Sem robots legível fica o ritmo pedido (o leitor já é lento).
 */
async function ritmoDaLoja(base, { concorrencia, atrasoMs }, fetchImpl = fetch) {
  let crawlDelay = null;
  try {
    const r = await fetchImpl(base.replace(/\/$/, '') + '/robots.txt', { headers: { 'user-agent': UA_COSMATH } });
    if (r.ok) crawlDelay = crawlDelayDe(await r.text());
  } catch { /* sem robots: ritmo pedido */ }
  if (!crawlDelay) return { concorrencia, atrasoMs, crawlDelay: null };
  return { concorrencia: 1, atrasoMs: Math.max(atrasoMs, Math.ceil(crawlDelay * 1000)), crawlDelay };
}

/** O que o catálogo já tem: EANs visíveis (sem zeros à esquerda) e a idade de cada endereço desta loja. */
function estadoDoSeed(loja, seed) {
  const { eMaquilhagem } = require('./classify-category');
  const { isNonCosmetic } = require('./product-fingerprint');
  // só o que o site mostra: sem maquilhagem nem não-cosméticos (suplementos, termómetros…)
  const eans = new Set();
  for (const p of seed.products || []) if (p.ean && !eMaquilhagem(p.name, p.category, p.brand) && !isNonCosmetic(p.name || '')) eans.add(semZeros(p.ean));
  const idade = new Map();
  const sp = (seed.store_products || []).find(g => g.store_slug === loja);
  for (const it of (sp && sp.items) || []) if (it.url) {
    const u = String(it.url).split('#')[0];
    const t = it.verified_at || it.scraped_at || '';
    if (!idade.has(u) || t < idade.get(u)) idade.set(u, t);
  }
  return { eans, idade };
}

function lerMemoria(ficheiro) {
  try { const d = JSON.parse(fs.readFileSync(ficheiro, 'utf8')); return d && d.urls ? d : { versao: 1, urls: {} }; }
  catch { return { versao: 1, urls: {} }; }
}
function gravarMemoria(ficheiro, memoria) {
  fs.mkdirSync(path.dirname(ficheiro), { recursive: true });
  fs.writeFileSync(ficheiro, JSON.stringify(memoria));
}
/** Regista o que uma ficha descoberta deu: o EAN, ou '' (sem EAN, 404, não é produto). */
function registar(memoria, url, ean) { memoria.urls[String(url).split('#')[0]] = [ean ? String(ean) : '', hoje()]; }

const diasDesde = d => (Date.now() - Date.parse(d + 'T00:00:00Z')) / 86400000;

/**
 * Planeia a corrida.
 *   todas      — todos os endereços de produto do mapa da loja
 *   filtradas  — os que o filtro da loja já escolhia (dermo, perfumes…)
 *   estado     — estadoDoSeed()
 *   memoria    — lerMemoria()
 *   maxNovas   — fichas nunca vistas a abrir nesta corrida
 *   saltar     — url → true para não descobrir (maquilhagem pelo endereço, etc.)
 * Devolve { fila, descobrir }: primeiro as fichas a descobrir (um lote limitado), depois
 * o que está há mais tempo sem ser lido, e no fim as ofertas que saíram do mapa.
 */
function planear({ todas, filtradas, estado, memoria, maxNovas = 0, saltar = () => false }) {
  // o fragmento (#variant-… da Primor) não vai ao servidor: uma ficha = um pedido
  const chave = u => String(u).split('#')[0];
  const noMapa = new Set(todas.map(chave));
  const base = new Set(filtradas.map(chave));
  // ofertas que a loja já tem; as que saíram do mapa também (a ficha pode existir
  // ainda), mas no fim da fila, para não gastarem o orçamento das lojas lentas
  let dasOfertas = 0; const foraDoMapa = [];
  for (const u of estado.idade.keys()) {
    if (base.has(u)) continue;
    if (noMapa.has(u)) { base.add(u); dasOfertas++; } else if (/^https?:\/\//.test(u)) foraDoMapa.push(u);
  }
  // fichas descobertas antes cujo EAN está no catálogo
  let daMemoria = 0;
  for (const [u, [ean]] of Object.entries(memoria.urls)) {
    if (ean && estado.eans.has(semZeros(ean)) && noMapa.has(u) && !base.has(u)) { base.add(u); daMemoria++; }
  }
  const descobrir = [];
  const vistos = new Set(base);
  for (const u of todas) {
    if (descobrir.length >= maxNovas) break;
    const k = chave(u);
    if (vistos.has(k) || saltar(k)) continue;
    const m = memoria.urls[k];
    if (m && diasDesde(m[1]) < DIAS_VALIDADE) continue;
    descobrir.push(k); vistos.add(k);
  }
  const idadeDe = u => estado.idade.get(u) || '';
  const porIdade = (a, b) => (idadeDe(a) < idadeDe(b) ? -1 : idadeDe(a) > idadeDe(b) ? 1 : 0);
  const fila = [...base].sort(porIdade);
  const fora = foraDoMapa.filter(u => !vistos.has(u)).sort(porIdade);
  // a descoberta vai À FRENTE (16/11): com o orçamento de tempo, o que fica para a
  // corrida seguinte são as fichas lidas há menos tempo, não as fichas novas — na 1.ª
  // corrida da Aveirofarma, com a descoberta no fim, as 2 000 ficaram todas por abrir
  return { fila: [...descobrir, ...fila, ...fora], descobrir: new Set(descobrir), dasOfertas, foraDoMapa: fora.length, daMemoria, vistas: Object.keys(memoria.urls).length };
}

/** Endereço com cara de maquilhagem (não vale a pena descobrir: o site não a mostra). */
function pareceMaquilhagem(url) {
  const { eMaquilhagem } = require('./classify-category');
  const slug = decodeURIComponent(String(url).split('#')[0].split('/').pop() || '').replace(/\.html?$/, '').replace(/[-_]+/g, ' ');
  return eMaquilhagem(slug, null, '');
}

/** Argumentos comuns: --descobrir=N (fichas novas por corrida) e --orcamento-min=M. */
function opcoes(args, { descobrir = 1500, orcamentoMin = 95 } = {}) {
  return {
    maxNovas: args.descobrir === undefined ? descobrir : Math.max(0, parseInt(args.descobrir, 10) || 0),
    orcamentoMs: (args['orcamento-min'] === undefined ? orcamentoMin : Number(args['orcamento-min'])) * 60000,
  };
}

/**
 * Tudo junto para um leitor: memória, estado do catálogo, ritmo do robots e plano.
 * Devolve { fila, descobrir, concorrencia, atrasoMs, registar(url, ean), gravar(), fimDoTempo() }.
 */
async function prepararLeitura({ loja, base, todas, filtradas, maxNovas = 0, orcamentoMs = Infinity, saltar = pareceMaquilhagem, concorrencia, atrasoMs, seed = null, ficheiro = null }) {
  const memFile = ficheiro || path.join(ROOT, '.cache-lojas', `${loja}-descoberta.json`);
  const memoria = lerMemoria(memFile);
  if (!seed) { try { seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8')); } catch { seed = { products: [], store_products: [] }; } }
  const estado = estadoDoSeed(loja, seed);
  const ritmo = await ritmoDaLoja(base, { concorrencia, atrasoMs });
  const plano = planear({ todas, filtradas, estado, memoria, maxNovas, saltar });
  const inicio = Date.now();
  // Pausa entre pedidos. Com Crawl-delay conta de início a início (um pedido de
  // cada vez, nunca antes do intervalo pedido, com até 10% de folga a mais); sem
  // ele, o costume dos leitores: o atraso depois de cada pedido, com 30% de variação.
  let ultimo = 0;
  const pausa = async () => {
    if (!ritmo.crawlDelay) return new Promise(r => setTimeout(r, ritmo.atrasoMs + Math.random() * ritmo.atrasoMs * 0.3));
    const alvo = (ultimo || Date.now()) + ritmo.atrasoMs * (1 + Math.random() * 0.1);
    const falta = alvo - Date.now();
    if (falta > 0) await new Promise(r => setTimeout(r, falta));
    ultimo = Date.now();
  };
  console.log(`  🔎 leitura alargada: ${plano.fila.length - plano.descobrir.size} fichas a ler (filtro ${filtradas.length}, +${plano.dasOfertas} das ofertas, +${plano.daMemoria} já descobertas com EAN do catálogo, +${plano.foraDoMapa} ofertas fora do mapa no fim) · ${plano.descobrir.size} por descobrir · memória ${plano.vistas} fichas`);
  console.log(`  🐢 ritmo: ${ritmo.concorrencia} em paralelo, ${ritmo.atrasoMs} ms entre pedidos${ritmo.crawlDelay ? ` (Crawl-delay ${ritmo.crawlDelay} s do robots.txt)` : ''}${Number.isFinite(orcamentoMs) ? ` · orçamento ${Math.round(orcamentoMs / 60000)} min` : ''}`);
  return {
    fila: plano.fila, descobrir: plano.descobrir,
    concorrencia: ritmo.concorrencia, atrasoMs: ritmo.atrasoMs,
    registar: (url, ean) => { if (plano.descobrir.has(String(url).split('#')[0])) registar(memoria, url, ean); },
    eDescoberta: url => plano.descobrir.has(String(url).split('#')[0]),
    gravar: () => gravarMemoria(memFile, memoria),
    pausa,
    fimDoTempo: () => Date.now() - inicio > orcamentoMs,
    temEanNoCatalogo: ean => estado.eans.has(semZeros(ean)),
  };
}

module.exports = { UA_COSMATH, DIAS_VALIDADE, crawlDelayDe, ritmoDaLoja, estadoDoSeed, lerMemoria, gravarMemoria, registar, planear, pareceMaquilhagem, opcoes, prepararLeitura };
