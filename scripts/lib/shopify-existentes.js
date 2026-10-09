'use strict';
/**
 * Recolha de uma loja Shopify para integração "só produtos existentes".
 * ======================================================================
 * Preço, preço barrado e stock vêm EM BLOCO do /products.json (250 produtos por
 * pedido: ~16 pedidos para 4.000 produtos). O /products.json público não traz o
 * código de barras, por isso o GTIN de cada variante lê-se UMA vez no
 * /products/<handle>.js e fica guardado num ficheiro de cache
 * (data/catalog/<loja>-gtin.json: id da variante → código). Variantes novas
 * entram na cache aos poucos (no máximo `maxJs` leituras por corrida).
 *
 * Porque não ler o .js de todos os produtos em todas as corridas (como faz
 * scripts/lib/shopify-loja.js, que continua a servir as lojas antigas): a
 * 2026-10-09 a SkinLovers e a Ilha dos Cosméticos responderam 429 antes dos
 * 200 produtos a 2 pedidos/s; a 1 pedido a cada 2 s seriam 2 h por corrida.
 *
 * Também, ao contrário da lib antiga:
 *   - identifica-se como bot (UA declarado) e cumpre o robots.txt da loja;
 *   - pára ao primeiro 403/429 ou página de desafio, sem gravar nada;
 *   - só devolve variantes com GTIN-12/13/14 de dígito de controlo certo;
 *   - aceita um prefixo de mercado (ex.: /pt-pt), para ler os preços que a
 *     loja mostra a quem compra de Portugal.
 * Criado a 2026-10-09 para a SkinLovers e a Ilha dos Cosméticos.
 */

const UA = 'GirlMath-Catalog-Bot/1.0 (+https://girlmath.pt; price comparison)';
const DESAFIO = /<title>[^<]*(just a moment|captcha|access denied|attention required|verifying your connection)/i;
const dorme = ms => new Promise(r => setTimeout(r, ms));

function gtinValido(e) {
  const s = String(e == null ? '' : e).trim();
  if (!/^(\d{12}|\d{13}|\d{14})$/.test(s)) return false;
  const corpo = s.slice(0, -1).split('').reverse();
  const soma = corpo.reduce((t, d, i) => t + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === Number(s.at(-1));
}

/** Regras de robots.txt para "User-agent: *" (o nosso bot não tem grupo próprio). */
function regrasRobots(txt) {
  const grupos = [];
  let atual = null, emAgentes = false;
  for (const linha of String(txt || '').split(/\r?\n/)) {
    const l = linha.replace(/#.*/, '').trim();
    const m = l.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const campo = m[1].toLowerCase(), valor = m[2].trim();
    if (campo === 'user-agent') {
      if (!emAgentes) { atual = { agentes: [], regras: [] }; grupos.push(atual); }
      atual.agentes.push(valor.toLowerCase());
      emAgentes = true;
    } else {
      emAgentes = false;
      if (atual && (campo === 'allow' || campo === 'disallow') && valor) atual.regras.push({ permite: campo === 'allow', caminho: valor });
    }
  }
  const nosso = grupos.find(g => g.agentes.some(a => a !== '*' && UA.toLowerCase().includes(a)));
  return (nosso || grupos.find(g => g.agentes.includes('*')) || { regras: [] }).regras;
}

function permitido(regras, caminho) {
  let melhor = null;
  for (const r of regras) {
    const rx = new RegExp('^' + r.caminho.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'));
    if (rx.test(caminho) && (!melhor || r.caminho.length > melhor.caminho.length || (r.caminho.length === melhor.caminho.length && r.permite))) melhor = r;
  }
  return !melhor || melhor.permite;
}

class Paragem extends Error {}

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
    const corpo = await r.text();
    if (DESAFIO.test(corpo.slice(0, 20000))) throw new Paragem(`página de desafio em ${url} — parar sem gravar`);
    if (r.url && new URL(r.url).hostname !== u.hostname) throw new Paragem(`redirecionado para outro domínio: ${r.url}`);
    if (r.status >= 500 && t < tentativas) { await dorme(5000); continue; }
    return { estado: r.status, corpo };
  }
}

const locs = xml => [...String(xml).matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/g)].map(m => m[1].replace(/&amp;/g, '&'));
const centimos = v => { const n = Math.round(Number(v) * 100); return Number.isFinite(n) ? n : NaN; };

/** Linhas do feed a partir dos produtos do /products.json e da cache de GTIN. */
function linhas(prefixo, produtos, cache) {
  const saida = [], contas = { sem_gtin: 0, por_ler: 0, preco_invalido: 0 };
  for (const p of produtos) {
    const vs = Array.isArray(p.variants) ? p.variants : [];
    for (const v of vs) {
      const id = String(v.id);
      if (!(id in cache)) { contas.por_ler++; continue; }
      const ean = cache[id];
      if (!gtinValido(ean)) { contas.sem_gtin++; continue; }
      const preco = centimos(v.price), barrado = centimos(v.compare_at_price);
      if (!(preco > 0)) { contas.preco_invalido++; continue; }
      const titulo = vs.length > 1 && v.title && !/^default title$/i.test(v.title) ? `${p.title} - ${v.title}` : p.title;
      const linha = {
        status: 'ok', ean, name: String(titulo || '').replace(/\s+/g, ' ').trim(), brand: String(p.vendor || '').trim() || null,
        price: preco / 100, in_stock: v.available === true,
        url: `${prefixo}/products/${p.handle}${vs.length > 1 ? `?variant=${v.id}` : ''}`,
      };
      if (barrado > preco) linha.previous_price = barrado / 100;
      saida.push(linha);
    }
  }
  return { linhas: saida, contas };
}

/**
 * @param {{origem:string, prefixo?:string, cache?:object, pausaMs?:number, pausaJsMs?:number,
 *          maxJs?:number, minimo?:number, limite?:number, prioridade?:(p)=>number, aoProgresso?:Function}} o
 *   origem:  'https://www.skinlovers.com' (robots e mapa do site)
 *   prefixo: 'https://www.skinlovers.com/pt-pt' (mercado de onde se leem preços; por omissão = origem)
 *   cache:   { "<id da variante>": "<código de barras ou ''>" } — alterada no lugar
 * @returns feed para o integrador + estatísticas; a cache atualizada fica em `o.cache`
 */
async function recolher(o) {
  const origem = o.origem.replace(/\/$/, ''), prefixo = (o.prefixo || o.origem).replace(/\/$/, '');
  const cache = o.cache || {};
  const pausa = o.pausaMs ?? 2500, pausaJs = o.pausaJsMs ?? 2000, maxJs = o.maxJs ?? 600;
  const inicio = new Date().toISOString();
  const rob = await pedir(`${origem}/robots.txt`, null);
  const regras = rob.estado === 200 ? regrasRobots(rob.corpo) : [];

  // 1) mapa do site: a lista completa, para medir a cobertura do bloco
  const raiz = await pedir(`${origem}/sitemap.xml`, regras);
  if (raiz.estado !== 200) throw new Error(`mapa do site devolveu ${raiz.estado}`);
  const mapas = locs(raiz.corpo).filter(u => new URL(u).pathname.startsWith('/sitemap_products_'));
  if (!mapas.length) throw new Error('sem sitemap_products_* no mapa do site');
  const doMapa = new Set();
  for (const m of mapas) {
    await dorme(pausa);
    const x = await pedir(m, regras);
    if (x.estado !== 200) throw new Error(`${m} devolveu ${x.estado}`);
    for (const u of locs(x.corpo)) { const h = (u.match(/\/products\/([^/?#]+)/) || [])[1]; if (h) doMapa.add(decodeURIComponent(h)); }
  }

  // 2) preços e stock em bloco
  const produtos = [], vistos = new Set();
  for (let pagina = 1; pagina <= 200; pagina++) {
    await dorme(pausa);
    const r = await pedir(`${prefixo}/products.json?limit=250&page=${pagina}`, regras);
    if (r.estado !== 200) throw new Error(`products.json página ${pagina} devolveu ${r.estado}`);
    let lote;
    try { lote = JSON.parse(r.corpo).products; } catch { throw new Error(`products.json página ${pagina} não é JSON`); }
    if (!Array.isArray(lote)) throw new Error(`products.json página ${pagina} sem lista de produtos`);
    if (!lote.length) break;
    for (const p of lote) if (!vistos.has(p.handle)) { vistos.add(p.handle); produtos.push(p); }
    if (o.limite && produtos.length >= o.limite) break;
  }
  const lista = o.limite ? produtos.slice(0, o.limite) : produtos;
  const cobertura = doMapa.size ? [...doMapa].filter(h => vistos.has(h)).length / doMapa.size : 0;
  if (!o.limite && cobertura < 0.9) throw new Error(`o bloco só cobre ${Math.round(cobertura * 100)}% do mapa do site; não gravo`);

  // 3) GTIN das variantes que ainda não estão na cache (as das marcas prioritárias primeiro)
  const porLer = lista.filter(p => (p.variants || []).some(v => !(String(v.id) in cache)));
  if (o.prioridade) porLer.sort((a, b) => o.prioridade(b) - o.prioridade(a));
  let lidosJs = 0, retirados = 0, falhasJs = 0;
  for (const p of porLer.slice(0, maxJs)) {
    await dorme(pausaJs);
    const r = await pedir(`${prefixo}/products/${encodeURIComponent(p.handle)}.js`, regras);
    lidosJs++;
    if (r.estado === 404 || r.estado === 410) { retirados++; continue; }
    if (r.estado !== 200) { falhasJs++; continue; }
    let j;
    try { j = JSON.parse(r.corpo); } catch { falhasJs++; continue; }
    for (const v of j.variants || []) cache[String(v.id)] = String(v.barcode == null ? '' : v.barcode).trim();
    if (o.aoProgresso && lidosJs % 100 === 0) o.aoProgresso(lidosJs, Math.min(porLer.length, maxJs));
  }
  if (lidosJs && falhasJs > lidosJs * 0.1) throw new Error(`${falhasJs} de ${lidosJs} leituras de GTIN falharam; não gravo`);

  const { linhas: rows, contas } = linhas(prefixo, lista, cache);
  const variantes = lista.reduce((t, p) => t + (p.variants || []).length, 0);
  if (!o.limite && variantes < (o.minimo ?? 500)) throw new Error(`só ${variantes} variantes no bloco (mínimo ${o.minimo ?? 500}); não gravo`);
  return {
    scraped_at: inicio, completed_at: new Date().toISOString(), source: prefixo,
    // um ensaio com --limite é uma recolha parcial: o integrador recusa-a
    in_progress: Boolean(o.limite),
    sitemap_products: doMapa.size, bulk_products: lista.length, coverage: Number(cobertura.toFixed(4)), variants: variantes,
    gtin_lookups: lidosJs, gtin_pending: Math.max(0, porLer.length - maxJs), retired: retirados, counts: contas,
    products: rows,
  };
}

module.exports = { recolher, linhas, gtinValido, regrasRobots, permitido, Paragem, UA };
