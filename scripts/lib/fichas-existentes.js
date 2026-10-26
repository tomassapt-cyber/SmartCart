'use strict';
/**
 * Recolha "só produtos existentes" para lojas SEM API: mapa do site + JSON-LD de cada ficha.
 * =========================================================================================
 * Irmã de scripts/lib/shopify-existentes.js, com as mesmas regras (e as mesmas funções de
 * robots/GTIN): bot declarado, robots.txt cumprido (incluindo Crawl-delay), paragem sem
 * gravar ao primeiro 403/429/página de desafio/redireção para outro domínio.
 *
 * Porque não scripts/lib/fichas-jsonld.js: essa lib (lojas antigas) usa o UA de um browser,
 * não lê o robots.txt e não pára em 403/429; e lê tudo como UTF-8, o que estraga lojas em
 * windows-1252 (a Glammy). Aqui a página é descodificada com o charset do cabeçalho HTTP.
 *
 * Cada ficha dá UMA linha: o GTIN, o preço e o stock do Product do JSON-LD (o preço riscado
 * vem de offers.priceSpecification com priceType StrikethroughPrice, quando existe).
 * Criado a 2026-10-14 para a Glammy.
 */
const { UA, regrasRobots, permitido, gtinValido, Paragem } = require('./shopify-existentes');

const DESAFIO = /<title>[^<]*(just a moment|captcha|access denied|attention required|verifying your connection)/i;
const dorme = ms => new Promise(r => setTimeout(r, ms));

/** Crawl-delay (segundos) do grupo "User-agent: *" — o nosso bot não tem grupo próprio. */
function crawlDelay(txt) {
  let noGrupo = false, valor = null, emAgentes = false;
  for (const linha of String(txt || '').split(/\r?\n/)) {
    const m = linha.replace(/#.*/, '').trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const campo = m[1].toLowerCase(), v = m[2].trim();
    if (campo === 'user-agent') { if (!emAgentes) noGrupo = false; if (v === '*') noGrupo = true; emAgentes = true; continue; }
    emAgentes = false;
    if (noGrupo && campo === 'crawl-delay' && Number(v) > 0) valor = Number(v);
  }
  return valor;
}

function charsetDe(tipo) {
  const m = String(tipo || '').match(/charset=["']?([\w-]+)/i);
  const c = m ? m[1].toLowerCase() : 'utf-8';
  return c === 'iso-8859-1' || c === 'latin1' ? 'windows-1252' : c; // os browsers tratam latin-1 como windows-1252
}

async function pedir(url, regras, { tentativas = 2 } = {}) {
  const u = new URL(url);
  if (regras && !permitido(regras, u.pathname + u.search)) throw new Paragem(`robots.txt não permite ${u.pathname}`);
  for (let t = 1; ; t++) {
    let r;
    try {
      r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'pt-PT,pt;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(40000) });
    } catch (e) {
      if (t >= tentativas) return { estado: 0, erro: String(e && e.message || e) };
      await dorme(5000); continue;
    }
    if (r.status === 403 || r.status === 429) throw new Paragem(`HTTP ${r.status} em ${url} — parar sem gravar`);
    // o tempo-limite também corta a LEITURA do corpo — e isso rebentava fora do
    // try de cima e deitava a corrida inteira abaixo (Glammy, 25/10). Conta como
    // falha desta ficha, como um fetch que não respondeu.
    let bytes;
    try { bytes = new Uint8Array(await r.arrayBuffer()); } catch (e) {
      if (t >= tentativas) return { estado: 0, erro: String(e && e.message || e) };
      await dorme(5000); continue;
    }
    let corpo;
    try { corpo = new TextDecoder(charsetDe(r.headers.get('content-type'))).decode(bytes); } catch { corpo = new TextDecoder('utf-8').decode(bytes); }
    if (DESAFIO.test(corpo.slice(0, 20000))) throw new Paragem(`página de desafio em ${url} — parar sem gravar`);
    if (r.url && new URL(r.url).hostname !== u.hostname) throw new Paragem(`redirecionado para outro domínio: ${r.url}`);
    if (r.status >= 500 && t < tentativas) { await dorme(5000); continue; }
    return { estado: r.status, corpo };
  }
}

const locs = xml => [...String(xml).matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/g)].map(m => m[1].replace(/&amp;/g, '&'));

function produtoDoJsonLd(html) {
  for (const m of String(html).matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let j; try { j = JSON.parse(m[1].trim()); } catch { continue; }
    const pilha = [j];
    while (pilha.length) {
      const x = pilha.pop();
      if (Array.isArray(x)) { pilha.push(...x); continue; }
      if (!x || typeof x !== 'object') continue;
      if ([].concat(x['@type'] || []).includes('Product')) return x;
      if (x['@graph']) pilha.push(x['@graph']);
    }
  }
  return null;
}

/** Linha do feed a partir do Product do JSON-LD (null se não tiver GTIN válido ou preço). */
function linhaDaFicha(url, p) {
  if (!p) return { motivo: 'sem_jsonld' };
  const ean = String(p.gtin13 || p.gtin || p.gtin14 || p.gtin12 || '').trim();
  if (!gtinValido(ean)) return { motivo: 'sem_gtin' };
  const of = [].concat(p.offers || [])[0] || {};
  const preco = Math.round(Number(of.price ?? of.lowPrice) * 100) / 100;
  if (!(preco > 0) || (of.priceCurrency && of.priceCurrency !== 'EUR')) return { motivo: 'preco_invalido' };
  const riscado = [].concat(of.priceSpecification || []).find(s => /StrikethroughPrice/i.test(String(s && s.priceType)));
  const linha = {
    status: 'ok', ean, name: String(p.name || '').replace(/\s+/g, ' ').trim(),
    brand: String((p.brand && (p.brand.name || p.brand)) || '').trim() || null,
    price: preco, in_stock: /InStock|LimitedAvailability|OnlineOnly/i.test(String(of.availability || '')), url,
  };
  const barrado = riscado ? Math.round(Number(riscado.price) * 100) / 100 : NaN;
  if (barrado > preco) linha.previous_price = barrado;
  return { linha };
}

/**
 * @param {{origem:string, mapa:string, filtroFicha:RegExp, pausaMs?:number, minimo?:number, limite?:number,
 *          aoProgresso?:Function}} o
 *   mapa:        endereço do mapa do site (índice ou lista) com as fichas
 *   filtroFicha: só os endereços que casam são fichas de produto
 */
async function recolher(o) {
  const origem = o.origem.replace(/\/$/, '');
  const inicio = new Date().toISOString();
  const rob = await pedir(`${origem}/robots.txt`, null);
  const regras = rob.estado === 200 ? regrasRobots(rob.corpo) : [];
  const atraso = rob.estado === 200 ? crawlDelay(rob.corpo) : null;
  const pausa = Math.max(o.pausaMs ?? 1500, atraso ? atraso * 1000 + 200 : 0);

  const fichas = new Set(), fila = [o.mapa], vistos = new Set();
  while (fila.length) {
    const m = fila.shift(); if (vistos.has(m)) continue; vistos.add(m);
    await dorme(pausa);
    const x = await pedir(m, regras);
    if (x.estado !== 200) throw new Error(`${m} devolveu ${x.estado}`);
    if (/<sitemapindex/i.test(x.corpo)) fila.push(...locs(x.corpo));
    else for (const u of locs(x.corpo)) if (o.filtroFicha.test(u)) fichas.add(u);
  }
  const lista = o.limite ? [...fichas].slice(0, o.limite) : [...fichas];
  if (!o.limite && lista.length < (o.minimo ?? 500)) throw new Error(`só ${lista.length} fichas no mapa (mínimo ${o.minimo ?? 500}); não gravo`);

  const rows = [], contas = { sem_jsonld: 0, sem_gtin: 0, preco_invalido: 0 };
  let lidas = 0, retiradas = 0, falhas = 0;
  for (const u of lista) {
    await dorme(pausa);
    const r = await pedir(u, regras);
    lidas++;
    if (r.estado === 404 || r.estado === 410) { retiradas++; continue; }
    if (r.estado !== 200) { falhas++; continue; }
    const { linha, motivo } = linhaDaFicha(u, produtoDoJsonLd(r.corpo));
    if (linha) rows.push(linha); else contas[motivo]++;
    if (o.aoProgresso && lidas % 250 === 0) o.aoProgresso(lidas, lista.length);
  }
  if (falhas > lidas * 0.1) throw new Error(`${falhas} de ${lidas} fichas falharam; não gravo`);
  return {
    scraped_at: inicio, completed_at: new Date().toISOString(), source: origem,
    in_progress: Boolean(o.limite), // um ensaio com --limite é parcial: o integrador recusa-o
    sitemap_products: fichas.size, read: lidas, retired: retiradas, failed: falhas, pause_ms: pausa, counts: contas,
    products: rows,
  };
}

module.exports = { recolher, linhaDaFicha, produtoDoJsonLd, crawlDelay, charsetDe };
