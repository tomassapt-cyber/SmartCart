/**
 * Ghost offers — esconder do render ofertas de produtos que a loja já REMOVEU
 * ============================================================
 * Os integradores são enrich-only: adicionam/actualizam ofertas mas NUNCA
 * removem. Quando uma loja tira um produto do site, a oferta antiga fica no
 * seed com o preço velho — aparece como "melhor preço" e o link dá 404
 * (beco sem saída para o utilizador).
 *
 * Deteção em DOIS SINAIS (ambos obrigatórios para esconder):
 *   1. CANDIDATO — o URL da oferta está AUSENTE do catálogo raspado fresco
 *      da loja (data/catalog/<loja>-full.json). Sinal barato mas com falsos
 *      positivos: os scrapers só guardam produtos extraídos com sucesso
 *      (ex.: cocooncenter tinha 747 "ausentes" com amostra toda viva).
 *   2. CONFIRMADO — verificação HTTP real (scripts/verify-ghost-offers.js)
 *      registou o URL como dead (404/410) em data/ghost-check.json.
 *
 * NÃO-destrutivo: opera sobre o seedJson em memória no inject; o
 * seed-bundle.json fica intacto (a informação do scraping é PRESERVADA).
 * Se o produto voltar: o URL reaparece no catálogo → deixa de ser candidato
 * → a oferta volta a ser mostrada automaticamente.
 *
 * GUARDAS por loja (candidatos só são computados se TODAS verdadeiras):
 *   1. Catálogo existe, é JSON válido, com scraped_at e products[].
 *   2. Scrape COMPLETO (in_progress !== true).
 *   3. Catálogo RECENTE (scraped_at dentro de staleDays).
 *   4. Catálogo com >= minProducts (catálogo quase-vazio = scrape falhado).
 */

const fs = require('fs');
const path = require('path');

// store_slug do seed → nome-base do ficheiro de catálogo (só onde diferem).
const SLUG_TO_CATALOG = {
  'loja-farmacia': 'lojafarmacia',
  'pharma-gdd': 'pharmagdd',
};

// Normaliza URL para comparação robusta (protocolo/www/trailing-slash/caso do
// host). Mantém o path como está (case-sensitive) — só apara diferenças
// triviais que não mudam o produto.
function normUrl(u) {
  if (!u) return '';
  let s = String(u).trim();
  s = s.replace(/^https?:\/\//i, '');
  s = s.replace(/^www\./i, '');
  s = s.replace(/\/+$/, '');
  const slash = s.indexOf('/');
  if (slash === -1) return s.toLowerCase();
  return s.slice(0, slash).toLowerCase() + s.slice(slash);
}

function loadCatalogUrls(catalogDir, slug) {
  const base = SLUG_TO_CATALOG[slug] || slug;
  const file = path.join(catalogDir, `${base}-full.json`);
  if (!fs.existsSync(file)) return { ok: false, reason: 'sem catálogo' };
  let cat;
  try { cat = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { ok: false, reason: 'catálogo inválido' }; }
  if (!cat || !Array.isArray(cat.products)) return { ok: false, reason: 'catálogo sem products[]' };
  if (cat.in_progress === true) return { ok: false, reason: 'scrape em progresso' };
  const urls = new Set();
  for (const p of cat.products) if (p && p.url) urls.add(normUrl(p.url));
  return { ok: true, urls, scraped_at: cat.scraped_at || null, count: cat.products.length };
}

/**
 * Candidatos a fantasma por loja: ofertas cujo URL não está no catálogo fresco.
 * Devolve { candidatesByStore: {slug: [url,…]}, perStore: [{slug, candidates|skipped}] }.
 */
function findGhostCandidates(seedJson, opts = {}) {
  const catalogDir = opts.catalogDir || path.join(__dirname, '..', '..', 'data', 'catalog');
  const staleDays = opts.staleDays != null ? opts.staleDays : 4;
  const minProducts = opts.minProducts != null ? opts.minProducts : 30;
  const now = opts.now || Date.now();

  const candidatesByStore = {};
  const perStore = [];
  for (const sp of seedJson.store_products) {
    const cat = loadCatalogUrls(catalogDir, sp.store_slug);
    if (!cat.ok) { perStore.push({ slug: sp.store_slug, skipped: cat.reason }); continue; }
    if (!cat.scraped_at) { perStore.push({ slug: sp.store_slug, skipped: 'catálogo sem scraped_at' }); continue; }
    const ageDays = (now - new Date(cat.scraped_at).getTime()) / 864e5;
    if (!(ageDays >= 0) || ageDays > staleDays) { perStore.push({ slug: sp.store_slug, skipped: `catálogo ${ageDays.toFixed(1)}d (>${staleDays}d)` }); continue; }
    if (cat.count < minProducts) { perStore.push({ slug: sp.store_slug, skipped: `catálogo só ${cat.count} produtos (<${minProducts})` }); continue; }

    const urls = [];
    for (const it of sp.items) {
      if (!it.url) continue;                       // sem URL não dá para verificar → mantém
      if (!cat.urls.has(normUrl(it.url))) urls.push(it.url);
    }
    candidatesByStore[sp.store_slug] = urls;
    perStore.push({ slug: sp.store_slug, candidates: urls.length });
  }
  return { candidatesByStore, perStore };
}

/**
 * Esconde (remove do seedJson EM MEMÓRIA) as ofertas candidatas CONFIRMADAS
 * mortas pela cache de verificação HTTP (data/ghost-check.json, escrita por
 * scripts/verify-ghost-offers.js). Sem cache → não esconde nada (fail-safe).
 */
function dropGhostOffers(seedJson, opts = {}) {
  const cacheFile = opts.cacheFile || path.join(__dirname, '..', '..', 'data', 'ghost-check.json');
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { /* sem cache → nada confirmado */ }

  const { candidatesByStore, perStore } = findGhostCandidates(seedJson, opts);
  const isDead = (u) => cache[u] && cache[u].status === 'dead';

  let totalGhost = 0, totalUnconfirmed = 0, storesProcessed = 0;
  for (const sp of seedJson.store_products) {
    const cands = candidatesByStore[sp.store_slug];
    if (!cands) continue;
    storesProcessed++;
    const deadSet = new Set(cands.filter(isDead));
    totalUnconfirmed += cands.length - deadSet.size;
    if (deadSet.size) {
      const before = sp.items.length;
      sp.items = sp.items.filter(it => !deadSet.has(it.url));
      const n = before - sp.items.length;
      totalGhost += n;
      const st = perStore.find(s => s.slug === sp.store_slug);
      if (st) st.ghosts = n;
    }
  }
  return { totalGhost, totalUnconfirmed, storesProcessed, perStore };
}

module.exports = { dropGhostOffers, findGhostCandidates, normUrl };
