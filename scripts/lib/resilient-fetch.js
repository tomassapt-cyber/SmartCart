/**
 * CosMath — fetch resiliente e HONESTO para os scrapers
 * ============================================================
 * PORQUÊ ESTE HELPER (análise de 18 runs falhados, 2026-07-19)
 * --------------------------------------------------------------
 * 8 scrapers tinham a mesma linha:  `return await r.text()`  — sem olhar
 * para `r.status`. Consequência: quando um WAF devolve 403/415/challenge, o
 * corpo HTML é parseado como XML, dá 0 <loc>, e o log diz "0 produtos".
 * Fica impossível distinguir três coisas MUITO diferentes:
 *    (a) o site bloqueou-nos      → tentar outra vez / outro caminho
 *    (b) o sitemap está mesmo vazio → a loja mudou de estrutura
 *    (c) a rede falhou             → repetir
 * Foi preciso investigar à mão, run a run, para descobrir que era (a).
 *
 * Este helper resolve isso: valida o status, valida o tipo de conteúdo,
 * repete com backoff+jitter em erros transitórios, e quando desiste ATIRA
 * um erro que DIZ o que aconteceu (status + content-type + início do corpo).
 *
 * Uso:
 *   const { fetchTextResilient, looksBlocked } = require('./lib/resilient-fetch');
 *   const xml = await fetchTextResilient(url, { expect: 'xml', minBytes: 1000 });
 */

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Headers de browser completos: vários WAFs decidem por fingerprint de
// cabeçalhos, não só por IP (ver farmacia2u, que devolve 415 a pedidos "nus").
function browserHeaders(extra = {}) {
  return {
    'User-Agent': DEFAULT_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Upgrade-Insecure-Requests': '1',
    ...extra,
  };
}

// Assinaturas típicas de página de bloqueio/challenge servida com HTTP 200.
const BLOCK_RE = /(just a moment|checking your browser|cf-browser-verification|attention required|access denied|unusual traffic|are you a robot|请稍候)/i;

function looksBlocked(body, contentType, expect) {
  if (!body) return true;
  if (BLOCK_RE.test(body.slice(0, 4000))) return true;
  // esperávamos XML e veio HTML → quase sempre challenge/erro disfarçado
  if (expect === 'xml') {
    const head = body.slice(0, 300).trim().toLowerCase();
    if (head.startsWith('<!doctype html') || head.startsWith('<html')) return true;
    if (contentType && /text\/html/i.test(contentType) && !/xml/i.test(contentType)) return true;
  }
  if (expect === 'json') {
    const head = body.slice(0, 120).trim();
    if (!head.startsWith('{') && !head.startsWith('[')) return true;
  }
  return false;
}

class FetchDiagnosticError extends Error {
  constructor(url, { status, contentType, body, attempts, reason }) {
    const snippet = (body || '').slice(0, 200).replace(/\s+/g, ' ');
    super(
      `${reason} · ${url}\n` +
      `   HTTP ${status ?? '—'} · content-type: ${contentType || '—'} · ${(body || '').length} bytes · ${attempts} tentativa(s)\n` +
      `   início do corpo: ${snippet || '(vazio)'}`
    );
    this.name = 'FetchDiagnosticError';
    this.status = status; this.contentType = contentType; this.reason = reason;
  }
}

/**
 * @param {string} url
 * @param {object} opts
 *   expect     'xml' | 'json' | 'html' | null   — valida a forma do corpo
 *   minBytes   number  — corpo mais curto que isto é suspeito (feed truncado)
 *   attempts   number  — tentativas totais (default 4)
 *   timeoutMs  number  — por tentativa (default 30000)
 *   headers    object  — extra
 */
async function fetchTextResilient(url, opts = {}) {
  const { expect = null, minBytes = 0, attempts = 4, timeoutMs = 30000, headers = {} } = opts;
  let last = { status: null, contentType: null, body: '', reason: 'falhou' };

  for (let i = 1; i <= attempts; i++) {
    let r, body = '', ctype = null;
    try {
      r = await fetch(url, { headers: browserHeaders(headers), redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
      ctype = r.headers.get('content-type');
      body = await r.text();
    } catch (e) {
      last = { status: null, contentType: null, body: '', reason: `erro de rede (${e.name === 'TimeoutError' ? 'timeout ' + timeoutMs + 'ms' : e.message})` };
      if (i < attempts) { await sleep(backoff(i)); continue; }
      throw new FetchDiagnosticError(url, { ...last, attempts: i });
    }

    if (!r.ok) {
      last = { status: r.status, contentType: ctype, body, reason: r.status === 403 || r.status === 415 || r.status === 429 ? 'BLOQUEADO pelo site (WAF?)' : 'HTTP de erro' };
      // 4xx que não seja rate-limit não melhora com retry
      const vaiMelhorar = r.status === 429 || r.status >= 500;
      if (vaiMelhorar && i < attempts) { await sleep(backoff(i)); continue; }
      throw new FetchDiagnosticError(url, { ...last, attempts: i });
    }

    if (looksBlocked(body, ctype, expect)) {
      last = { status: r.status, contentType: ctype, body, reason: 'resposta 200 mas com aspeto de bloqueio/challenge' };
      if (i < attempts) { await sleep(backoff(i)); continue; }
      throw new FetchDiagnosticError(url, { ...last, attempts: i });
    }

    if (minBytes && body.length < minBytes) {
      last = { status: r.status, contentType: ctype, body, reason: `corpo demasiado curto (${body.length} < ${minBytes} bytes esperados)` };
      if (i < attempts) { await sleep(backoff(i)); continue; }
      throw new FetchDiagnosticError(url, { ...last, attempts: i });
    }

    return body;
  }
  throw new FetchDiagnosticError(url, { ...last, attempts });
}

// backoff crescente com jitter: 2s, 6s, 15s, 30s (+até 40% aleatório)
function backoff(attempt) {
  const base = [2000, 6000, 15000, 30000][Math.min(attempt - 1, 3)];
  return Math.round(base * (1 + Math.random() * 0.4));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = { fetchTextResilient, browserHeaders, looksBlocked, FetchDiagnosticError, DEFAULT_UA };
