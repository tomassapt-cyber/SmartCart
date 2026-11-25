'use strict';
/**
 * CosMath — leitura em rotação com orçamento de tempo (25/11/2026)
 * =================================================================
 * Wells e Loja da Farmácia liam o mapa inteiro de uma vez e só gravavam no fim.
 * Com a loja mais lenta, o GitHub cortava o job pelo limite de tempo e perdia-se
 * a corrida toda:
 *  - Wells: 297,5 min de leitura num job de 300 → cortada a meio da integração;
 *  - Loja da Farmácia: ~1 ficha/s, ~3 h para o mapa inteiro num job de 150 min →
 *    cortada em quase todas as corridas desde 19/11.
 *
 * Agora:
 *  1. ORDEM: primeiro o que está há mais tempo sem ser lido. A idade de cada
 *     endereço é a leitura mais recente que se conhece: a verificação da oferta
 *     no catálogo ou a última leitura guardada na memória. Os endereços nunca
 *     lidos vão à frente (fichas novas no mapa), menos numa corrida sem memória,
 *     em que vão para o fim (as ofertas do site primeiro); os empates ficam em
 *     ordem aleatória.
 *  2. ORÇAMENTO: quando o tempo acaba, o leitor deixa de pedir fichas e grava o
 *     que leu, e a integração e o push ficam com tempo. As ofertas que ficam por
 *     ler não desaparecem: mantêm a data da última leitura (o integrador usa a
 *     data de cada ficha) e são as primeiras da corrida seguinte.
 *  3. MEMÓRIA (.cache-lojas/<loja>-lidas.json): passa de corrida em corrida pela
 *     cache do Actions e não vai para o git. Guarda url → data da última resposta
 *     definitiva (ficha lida, ficha sem EAN, 404). As falhas não contam: o
 *     endereço volta à frente na corrida seguinte.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const chave = u => String(u || '').split('#')[0];

/** url → verified_at das ofertas desta loja no catálogo (várias ofertas no mesmo endereço: conta a mais antiga). */
function idadesDoSeed(seed, loja) {
  const idade = new Map();
  const sp = ((seed && seed.store_products) || []).find(g => g.store_slug === loja);
  for (const it of (sp && sp.items) || []) {
    if (!it.url) continue;
    const u = chave(it.url), t = it.verified_at || '';
    if (!idade.has(u) || t < idade.get(u)) idade.set(u, t);
  }
  return idade;
}

function lerMemoria(ficheiro) {
  try { const d = JSON.parse(fs.readFileSync(ficheiro, 'utf8')); return d && d.lidas ? d : { versao: 1, lidas: {} }; }
  catch { return { versao: 1, lidas: {} }; }
}

/**
 * Ordena endereços (ou objetos, com `url` a dizer onde está o endereço) do lido há mais tempo para o mais recente.
 * Os nunca lidos vão à frente; com `nuncaLidasNoFim` (corrida sem memória: 1.ª vez, ou cache perdida) vão para o fim,
 * para que as ofertas que o site mostra se refresquem primeiro (na Wells, 4 528 endereços do mapa nunca deram oferta).
 */
function ordenar(itens, { idadeSeed = new Map(), lidas = {}, url = x => x, aleatorio = Math.random, nuncaLidasNoFim = false } = {}) {
  const idade = x => {
    const k = chave(url(x)); const a = idadeSeed.get(k) || '', b = lidas[k] || '';
    const m = a > b ? a : b;
    return !m && nuncaLidasNoFim ? '￿' : m;
  };
  return itens.map(x => [x, idade(x), aleatorio()])
    .sort((p, q) => (p[1] < q[1] ? -1 : p[1] > q[1] ? 1 : p[2] - q[2]))
    .map(p => p[0]);
}

/**
 * Prepara a rotação de uma loja.
 *   loja         — slug da loja no catálogo (store_products)
 *   itens        — endereços do mapa (ou objetos com o endereço)
 *   url          — x → endereço (por omissão, o próprio item)
 *   orcamentoMin — minutos de leitura (Infinity = sem limite)
 *   seed, ficheiro, agora — para os testes
 * Devolve { fila, lida(url), gravar(), fimDoTempo(), resumo }.
 */
function prepararRotacao({ loja, itens, url = x => x, orcamentoMin = Infinity, seed = null, ficheiro = null, agora = Date.now }) {
  const memFile = ficheiro || path.join(ROOT, '.cache-lojas', `${loja}-lidas.json`);
  const memoria = lerMemoria(memFile);
  if (!seed) { try { seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8')); } catch { seed = { store_products: [] }; } }
  const idadeSeed = idadesDoSeed(seed, loja);
  seed = null;   // o catálogo inteiro não fica preso na memória do leitor
  // a memória só guarda o que ainda está no mapa
  const noMapa = new Set(itens.map(x => chave(url(x))));
  for (const k of Object.keys(memoria.lidas)) if (!noMapa.has(k)) delete memoria.lidas[k];
  const semMemoria = Object.keys(memoria.lidas).length === 0;
  const fila = ordenar(itens, { idadeSeed, lidas: memoria.lidas, url, nuncaLidasNoFim: semMemoria });
  let comOferta = 0, nuncaLidas = 0;
  for (const k of noMapa) {
    if (idadeSeed.has(k)) comOferta++;
    else if (!memoria.lidas[k]) nuncaLidas++;
  }
  const orcamentoMs = Number(orcamentoMin) * 60000;
  const inicio = agora();
  return {
    fila,
    lida: u => { memoria.lidas[chave(u)] = new Date(agora()).toISOString(); },
    gravar: () => { fs.mkdirSync(path.dirname(memFile), { recursive: true }); fs.writeFileSync(memFile, JSON.stringify(memoria)); },
    fimDoTempo: () => agora() - inicio > orcamentoMs,
    resumo: `🔁 rotação: ${fila.length} endereços no mapa (${comOferta} já são ofertas, ${nuncaLidas} nunca lidos${semMemoria ? ', ficam para o fim: corrida sem memória' : ''}) · memória ${Object.keys(memoria.lidas).length} · ` +
      (Number.isFinite(orcamentoMs) ? `orçamento ${Math.round(orcamentoMs / 60000)} min, primeiro o lido há mais tempo` : 'sem orçamento de tempo'),
  };
}

/** --orcamento-min=N (sem o argumento: sem limite). */
function orcamentoDosArgs(args) {
  const v = args['orcamento-min'];
  const n = typeof v === 'string' ? Number(v) : NaN;   // «--orcamento-min» sem valor não é 1 minuto
  return n > 0 ? n : Infinity;
}

module.exports = { idadesDoSeed, lerMemoria, ordenar, prepararRotacao, orcamentoDosArgs };
