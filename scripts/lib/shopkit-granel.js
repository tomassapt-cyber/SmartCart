/**
 * CosMath — catálogo a granel das lojas Shopkit
 * ============================================================
 * PORQUÊ (medido a 2026-09-25)
 * --------------------------------------------------------------
 * A smartbeauty, a beleza37 e a sobeauty corriam ficha a ficha, e as fichas
 * destas lojas são ENORMES: **1.005 KB** numa, 742 KB noutra. Uma passagem pela
 * smartbeauty gastava ~1 GB de tráfego para trazer 997 ofertas.
 *
 * Os três cabeçalhos diziam "SEM products.json → scrape ficha-a-ficha" e
 * identificavam a plataforma como WooCommerce. As duas coisas estavam erradas: é
 * **Shopkit** (as imagens vêm de cdn-shopkit.com) e o endpoint existe:
 *
 *     GET /products.json?limit=250&page=N
 *     {"data":[…], "paging":{"previous":…,"next":…}, "total_count":8108}
 *
 * Cada produto traz 81 campos, e entre eles tudo o que a integração precisa:
 * `barcode` (EAN), `price`, `price_promo`, `brand`, `image`, `url` e `stock`.
 * Medido na primeira página das três lojas: EAN válido em 50/50, 40/50 e 50/50.
 *
 *     loja          produtos   pedidos   tráfego      antes
 *     smartbeauty      8.108       163     71 MB     ~1 GB para 997 ofertas
 *     beleza37         7.713       155     54 MB
 *     sobeauty           954        20      8 MB
 *
 * 14× menos tráfego para 8× mais catálogo. E o `price_promo` enche o
 * `previous_price`, que estava vazio nos 3.545 produtos da smartbeauty — ou seja
 * os descontos destas lojas passam a ser visíveis no site.
 *
 * ⚠️ `limit=50`, E NÃO 250 — isto custou-me uma volta. O servidor devolve sempre
 * 50 por página, seja qual for o `limit`, mas o valor do `limit` decide ATÉ ONDE
 * pagina: com `limit=250` o `paging.next` fica **null na 4.ª página** e o
 * catálogo acaba nos 200 produtos (de 954 na sobeauty, de 8.108 na smartbeauty).
 * Com `limit=50` o `next` continua até ao fim. Verificado a andar até esgotar:
 *
 *     limit=250 →   4 páginas,   200 itens   (silenciosamente incompleto)
 *     limit=50  →  20 páginas,   954 itens   sobeauty     (= total_count)
 *     limit=50  → 163 páginas, 8.108 itens   smartbeauty  (= total_count)
 *
 * Por isso a função COMPARA o que recolheu com o `total_count` e avisa se ficar
 * a menos de 95% — um catálogo cortado a meio é exactamente o tipo de falha que
 * passa por boa.
 *
 * ⚠️ ESTAS LOJAS BLOQUEIAM OS IPs DE DATACENTER AO NÍVEL DA LIGAÇÃO. Medido dos
 * runners do GitHub: `HTTP 000`, o curl não chega a estabelecer conexão (as
 * outras sete bloqueadas dão 403 ou um desafio). Isto corre do PC do dono, por
 * agendador de tarefas — o granel é o que torna isso rápido (minutos, não horas).
 */

const { fetchTextResilient } = require('./resilient-fetch');
const { isNonCosmetic } = require('./product-fingerprint');
const { ritmoDaLoja } = require('./leitura-alargada');

function volumeDoNome(nome) {
  const m = (nome || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toLowerCase();
  return (u === 'l' && v < 10) ? v * 1000 : (u === 'kg' ? v * 1000 : v);
}

const eanValido = b => /^\d{12,14}$/.test(String(b || '')) && !/^0{6,}/.test(String(b));

/** Um produto do endpoint → a forma canónica dos catálogos do projeto. */
function mapear(p, agora) {
  const ean = eanValido(p.barcode) ? String(p.barcode) : null;
  const ref = String(p.reference || '');
  const cnp = /^\d{7}$/.test(ref) ? ref : null;
  if (!ean && !cnp) return null;              // sem chave nacional/global → ignora

  const nome = String(p.title || '').trim();
  if (!nome || isNonCosmetic(nome)) return null;

  // price_promo é o preço A PAGAR quando existe; o price passa a ser o "antes".
  // Sem isto o desconto ficava invisível, que é o que acontecia até agora.
  const temPromo = p.price_promo != null && Number(p.price_promo) > 0;
  const preco = Number(temPromo ? p.price_promo : p.price);
  if (!Number.isFinite(preco) || preco <= 0) return null;
  const anterior = temPromo && Number(p.price) > preco ? Number(p.price) : null;

  // stock: só se a loja o controla. Sem controlo, assume-se vendável.
  const st = p.stock || {};
  const emStock = p.is_vendible !== false && (
    st.stock_enabled ? (Number(st.stock_qty) > 0 || st.stock_backorder === true) : true
  );

  const img = (p.image && (p.image.original || p.image.big || p.image.medium || p.image.thumb)) || null;

  return {
    url: p.permalink || p.url || null,
    status: 'ok',
    scraped_at: agora,
    name: nome,
    brand: (p.brand && p.brand.title) ? String(p.brand.title).trim() : null,
    ean,
    cnp,
    image_url: img ? String(img).replace(/\\\//g, '/') : null,
    price: preco,
    previous_price: anterior,
    in_stock: emStock,
    volume_ml: volumeDoNome(nome),
    category: (Array.isArray(p.categories) && p.categories[0] && p.categories[0].title) || null,
    variants: [],
  };
}

// Ritmo (2026-11-16): a Shopkit (Sobeauty, Smart Beauty e Beleza37 estão na mesma
// plataforma) limita os pedidos por endereço e responde 429 «demasiados pedidos». Com
// 250 ms entre páginas e as 4 tentativas do fetchTextResilient quase seguidas, as
// três lojas pararam a meio na recolha do PC de 16/11 (páginas 5, 34 e 3). O 429 é
// um «abranda», não um bloqueio: um minuto depois a loja responde outra vez.
// Crawl-delay (2026-11-26): o robots.txt das três (em www.) pede 10 s e íamos a 2 s. Não
// basta lê-lo em cada corrida: a Shopkit responde 429 até ao próprio robots.txt quando os
// pedidos se juntam, e a So Beauty só o publica em www. (sobeauty.pt não tem). Por isso
// 10 s é o mínimo nesta plataforma, e mais se o robots.txt da loja pedir mais.
const PAUSA_PAGINAS_MS = 10000;
const ESPERAS_429_S = [60, 120, 240, 300];   // depois disto desiste (a loja não quer mesmo)
const dorme = ms => new Promise(s => setTimeout(s, ms));

/** Uma página do /products.json; num 429 espera o que a loja pede (Retry-After) e tenta de novo. */
async function pedirPagina(url, cab, { esperas = ESPERAS_429_S, dormir = dorme, pedir = fetch } = {}) {
  for (let i = 0; ; i++) {
    const r = await pedir(url, { headers: { Accept: 'application/json', ...cab }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    if (r.status === 429 && i < esperas.length) {
      const pede = Number(r.headers.get('retry-after'));
      const s = pede > 0 && pede <= 600 ? pede : esperas[i];
      try { await r.body?.cancel(); } catch { /* nada */ }
      console.log(`  ⏳ 429 «demasiados pedidos» — espera ${s} s e continua (${i + 1}/${esperas.length})`);
      await dormir(s * 1000);
      continue;
    }
    if (r.ok) {
      const corpo = await r.text();
      if (/^\s*[{[]/.test(corpo)) return corpo;   // a página que se queria
    } else {
      try { await r.body?.cancel(); } catch { /* nada */ }
    }
    // outro estado ou corpo que não é JSON: o caminho de sempre, com o diagnóstico do helper
    return fetchTextResilient(url, { expect: 'json', attempts: 4, timeoutMs: 30000, headers: { Accept: 'application/json', ...cab } });
  }
}

/**
 * Recolhe o catálogo inteiro de uma loja Shopkit.
 * @param {string} base  ex. 'https://www.smartbeauty.pt'
 * @param {object} opts  { limite, ua, aoProgresso, pausaMs (fixa; sem ela lê-se o Crawl-delay), ritmo }
 * @returns {Promise<{produtos: Array, total: number, paginas: number, bytes: number}>}
 */
async function recolherCatalogo(base, opts = {}) {
  const { limite = Infinity, ua, aoProgresso, ritmo = ritmoDaLoja } = opts;
  // Crawl-delay (26/11/2026): ver PAUSA_PAGINAS_MS — a pausa é o maior dos dois.
  const { atrasoMs: pausaMs, crawlDelay } = opts.pausaMs != null
    ? { atrasoMs: opts.pausaMs, crawlDelay: null }
    : await ritmo(base, { concorrencia: 1, atrasoMs: PAUSA_PAGINAS_MS });
  console.log(`  🐢 ${pausaMs / 1000} s entre páginas${crawlDelay ? ` (Crawl-delay ${crawlDelay} s do robots.txt)` : ''}`);
  const cab = ua ? { 'User-Agent': ua } : {};
  const agora = new Date().toISOString();

  let url = base.replace(/\/$/, '') + '/products.json?limit=50';
  const produtos = [];
  let paginas = 0, bytes = 0, total = null, brutos = 0, semChave = 0;
  const vistos = new Set();

  while (url) {
    const corpo = await pedirPagina(url, cab);
    bytes += corpo.length;
    paginas++;

    let d;
    try { d = JSON.parse(corpo); }
    catch (e) { throw new Error(`pagina ${paginas} nao e JSON valido: ${e.message}`); }
    if (!Array.isArray(d.data)) throw new Error(`pagina ${paginas} sem campo "data" — o endpoint mudou de forma`);
    if (total === null) {
      total = Number(d.total_count) || 0;
      if (!total) throw new Error('total_count = 0 — a loja nao devolveu catalogo');
    }
    if (!d.data.length) break;

    for (const p of d.data) {
      brutos++;
      if (p.id != null) {
        if (vistos.has(p.id)) continue;      // defesa contra paginacao que repete
        vistos.add(p.id);
      }
      const m = mapear(p, agora);
      if (m) produtos.push(m); else semChave++;
      if (produtos.length >= limite) break;
    }
    if (produtos.length >= limite) break;

    if (aoProgresso) aoProgresso({ paginas, brutos, guardados: produtos.length, total, bytes });

    const prox = d.paging && d.paging.next;
    if (!prox || prox === url) break;
    url = prox;
    await dorme(pausaMs);
  }

  // Aviso de catalogo cortado. Sem isto, um corte de paginacao (foi o que o
  // limit=250 fazia) entrava como "a loja tem menos produtos" e ninguem via.
  if (limite === Infinity && total && brutos < total * 0.95) {
    console.warn(`⚠ recolhidos ${brutos} de ${total} anunciados (${(100 * brutos / total).toFixed(0)}%) — paginacao pode ter sido cortada`);
  }
  return { produtos, total, paginas, bytes, brutos, semChave };
}

module.exports = { recolherCatalogo, mapear, volumeDoNome, eanValido, pedirPagina };
