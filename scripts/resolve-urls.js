#!/usr/bin/env node
/**
 * SmartCartCosmetics — Resolver de URLs canónicos
 * ============================================================
 *
 * Para cada par (loja × ean) descobre o URL real da página de produto
 * usando 4 estratégias em ordem de preferência:
 *   1. EAN search (loja.pt/search?q=EAN)
 *   2. Nome search (loja.pt/search?q=marca+nome) + fuzzy match
 *   3. Sitemap.xml + filtragem por tokens do nome
 *   4. Google site:loja.pt "marca nome" (último recurso, opcional)
 *
 * Cada match é validado:
 *   - Fetch da PDP candidata
 *   - Extracção do título via title_selector
 *   - Levenshtein vs. nome canónico
 *   - confidence = 1 - dist/maxLen
 *
 * Output: data/url-resolution.json (schema na docstring).
 *
 * Uso:
 *   node scripts/resolve-urls.js                    # universo completo
 *   node scripts/resolve-urls.js --store=notino     # 1 loja
 *   node scripts/resolve-urls.js --ean=3614271326072 # 1 produto em todas as lojas
 *   node scripts/resolve-urls.js --sample           # demo de 3 SKUs × 5 lojas
 *   node scripts/resolve-urls.js --dry-run          # sem fetch, simula
 *   node scripts/resolve-urls.js --max-per-store=20 # limite p/ teste rápido
 *
 * Variáveis de ambiente:
 *   RESOLVER_OUT=data/url-resolution.json     output path
 *   RESOLVER_LOG=logs/url-resolution-YYYY-MM-DD.log  log path
 *   RESOLVER_CONFIDENCE_THRESHOLD=0.85        threshold needs_review
 *   RESOLVER_HEADLESS=true                    Playwright headless
 *   RESOLVER_CONCURRENCY=3                    lojas em paralelo
 */

const fs = require('fs');
const path = require('path');
const { BaseScraper, delay } = require('../scrapers/scraper-base');

// ============================================================
// CLI args
// ============================================================
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));

const ROOT = path.resolve(__dirname, '..');
const STORES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stores.json'), 'utf8')).stores;
const PRODUCTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products-master.json'), 'utf8')).products;
const PRICES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prices-snapshot.json'), 'utf8')).precos;

const CONFIDENCE_THRESHOLD = Number(process.env.RESOLVER_CONFIDENCE_THRESHOLD || 0.85);
const CONCURRENCY = Number(process.env.RESOLVER_CONCURRENCY || 3);
const OUT_PATH = process.env.RESOLVER_OUT || path.join(ROOT, 'data', 'url-resolution.json');
const LOGS_DIR = path.join(ROOT, 'logs');
const LOG_PATH = process.env.RESOLVER_LOG || path.join(LOGS_DIR, `url-resolution-${new Date().toISOString().slice(0,10)}.log`);
const DRY_RUN = !!args['dry-run'];
const SAMPLE = !!args.sample;

// ============================================================
// Levenshtein distance (iterativo, O(m·n))
// ============================================================
function levenshtein(a, b) {
  a = String(a || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  b = String(b || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = a[i-1] === b[j-1] ? prev : 1 + Math.min(prev, dp[i], dp[i-1]);
      prev = tmp;
    }
  }
  return dp[a.length];
}

function similarity(a, b) {
  const max = Math.max(String(a).length, String(b).length);
  if (!max) return 1;
  return 1 - (levenshtein(a, b) / max);
}

// ============================================================
// Logger simples (stdout + file)
// ============================================================
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
function log(level, msg) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// ============================================================
// Resolver core — uma loja
// ============================================================
class UrlResolver {
  constructor(store) {
    this.store = store;
    this.strategy = store.search_strategy || {};
    this.scraper = new BaseScraper({
      storeSlug: store.id,
      storeName: store.nome,
      baseUrl: store.url,
      minDelayMs: store.id === 'notino' ? 2500 : 2000,
      maxRetries: 2,
      usePlaywright: !!this.strategy.needs_playwright,
      logger: { info: (m) => log('info', m), warn: (m) => log('warn', m), error: (m) => log('error', m), log: (m) => log('info', m) },
    });
  }

  async init() { if (!DRY_RUN) await this.scraper.init(); }
  async close() { if (!DRY_RUN) await this.scraper.close(); }

  /**
   * Tenta resolver o URL canónico para um produto. Retorna o objecto
   * de resolução com confidence, ou null se nenhuma estratégia funcionou.
   */
  async resolve(product) {
    if (DRY_RUN) {
      // simulação para testar pipeline sem rede
      return this._dryRunResult(product);
    }
    if (!this.strategy.type || this.strategy.type === 'auto-discover' || this.strategy.type === 'manual') {
      return this._skipped(product, 'no-strategy');
    }

    // STRATEGY 1: EAN search
    if (this.strategy.supports_ean) {
      const r = await this._searchByQuery(product, product.ean, 'ean-search');
      if (r && r.confidence >= 0.5) return r;
    }

    // STRATEGY 2: nome search (marca + nome curto)
    const nameQuery = `${product.marca} ${this._shortName(product.nome)}`;
    const r2 = await this._searchByQuery(product, nameQuery, 'name-search');
    if (r2 && r2.confidence >= 0.5) return r2;

    // STRATEGY 3: sitemap (não implementado — placeholder)
    // STRATEGY 4: google site: (não implementado — opcional)

    return this._failed(product, 'all-strategies-failed');
  }

  /** Faz a search + extracção do 1º resultado + valida com fetch do PDP. */
  async _searchByQuery(product, query, method) {
    const url = this.strategy.template.replace('{q}', encodeURIComponent(query));
    let html;
    try {
      html = await this.scraper.fetchHTML(url);
    } catch (err) {
      log('warn', `[${this.store.id}] search ${method} falhou (${query}): ${err.message}`);
      return null;
    }
    const candidate = this._extractFirstResult(html);
    if (!candidate) return null;

    // valida buscar o PDP e extrair título
    let pdpHtml;
    try {
      pdpHtml = await this.scraper.fetchHTML(candidate);
    } catch (err) {
      log('warn', `[${this.store.id}] PDP fetch falhou: ${err.message}`);
      return null;
    }
    const title = this._extractTitle(pdpHtml);
    if (!title) {
      // Fallback: aceitar candidate mesmo sem título extraído (PDP existe)
      return {
        canonical_url: this._absolute(candidate),
        method,
        confidence: 0.5,
        title_observed: null,
      };
    }
    const conf = similarity(title, product.nome);
    return {
      canonical_url: this._absolute(candidate),
      method,
      confidence: Number(conf.toFixed(3)),
      title_observed: title,
    };
  }

  _extractFirstResult(html) {
    const sel = this.strategy.result_link_selector;
    if (!sel) return null;
    // Parser MUITO simples por regex — para casos reais usar cheerio.
    // Tomamos o 1º <a … href="…"> que ocorre depois de um marcador
    // que contenha qualquer parte do selector (heurística leve).
    const tokens = sel.split(/[,\s]+/).filter(Boolean).slice(0, 3);
    for (const tok of tokens) {
      const cls = tok.replace(/^a\./, '').replace(/[\[\]"']/g, '');
      const re = new RegExp(`<a[^>]+(?:class|data-testid)="[^"]*${cls.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}[^"]*"[^>]+href="([^"]+)"`, 'i');
      const m = html.match(re);
      if (m) return m[1];
    }
    // último recurso: primeiro <a href="…/produto/…"> ou similar
    const fallback = html.match(/<a[^>]+href="([^"]*\/(?:p|produto|product|products|pt)\/[^"]+)"/i);
    return fallback ? fallback[1] : null;
  }

  _extractTitle(html) {
    const sel = this.strategy.title_selector;
    if (sel) {
      // procurar o conteúdo do 1º elemento que match o selector (heurística leve)
      const tag = sel.split(/[\.\[\s]/)[0] || 'h1';
      const cls = (sel.match(/\.([a-zA-Z0-9-_]+)/) || [])[1];
      let re;
      if (cls) {
        re = new RegExp(`<${tag}[^>]+class="[^"]*${cls}[^"]*"[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      } else {
        re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      }
      const m = html.match(re);
      if (m) return m[1].replace(/<[^>]+>/g, '').trim();
    }
    // fallback: <title>
    const t = html.match(/<title>([\s\S]*?)<\/title>/i);
    return t ? t[1].trim() : null;
  }

  _absolute(url) {
    if (!url) return url;
    if (/^https?:/.test(url)) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return this.store.url.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url);
  }

  _shortName(name) {
    // remover qtd/volumes finais ("50 ml", "100ml", "4.8g", etc.) e bracketed
    return String(name)
      .replace(/\s+\d+(?:[.,]\d+)?\s*(ml|g|gr|oz|amp)\b/gi, '')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .trim();
  }

  _dryRunResult(product) {
    // gera um URL sintético plausível para validar o pipeline
    const slug = String(product.nome).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    return {
      canonical_url: `${this.store.url.replace(/\/$/, '')}/p/${slug}`,
      method: 'dry-run',
      confidence: 0.5 + Math.random() * 0.5,
      title_observed: product.nome,
    };
  }

  _skipped(product, reason) {
    return { canonical_url: null, method: 'skipped', confidence: 0, title_observed: null, skip_reason: reason };
  }
  _failed(product, reason) {
    return { canonical_url: null, method: 'failed', confidence: 0, title_observed: null, fail_reason: reason };
  }
}

// ============================================================
// Selecciona o universo (loja × ean) a resolver
// ============================================================
function buildUniverse() {
  // Universo = ofertas em prices-snapshot (filtra por loja se --store).
  let universe = PRICES.map(pr => ({ ean: pr.ean, store_id: pr.loja_id }));
  // dedup
  const seen = new Set();
  universe = universe.filter(u => {
    const k = `${u.store_id}|${u.ean}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (args.store) universe = universe.filter(u => u.store_id === args.store);
  if (args.ean)   universe = universe.filter(u => u.ean === args.ean);
  if (args['max-per-store']) {
    const limit = Number(args['max-per-store']);
    const perStore = {};
    universe = universe.filter(u => {
      perStore[u.store_id] = (perStore[u.store_id] || 0) + 1;
      return perStore[u.store_id] <= limit;
    });
  }
  if (SAMPLE) {
    // demo: 3 SKUs (Lancôme Génifique, LRP Effaclar, CeraVe Hidratante)
    // × 5 lojas representativas (Notino tier-1, Atida tier-1 farmacia,
    // Wells/Pharma2u tier-3 farmacia, Druni tier-1)
    const eans = ['2000216165027', '2008122273171', '2007714380778']
                .filter(e => PRODUCTS.find(p => p.ean === e));
    const storeIds = ['notino', 'atida', 'wells', 'druni', 'pharma2u'];
    universe = [];
    for (const e of eans) for (const s of storeIds) universe.push({ ean: e, store_id: s });
  }
  return universe;
}

// ============================================================
// Main
// ============================================================
async function main() {
  const universe = buildUniverse();
  log('info', `Universo: ${universe.length} pares (loja × ean) · concurrency=${CONCURRENCY} · dry-run=${DRY_RUN} · sample=${SAMPLE}`);

  const productByEan = Object.fromEntries(PRODUCTS.map(p => [p.ean, p]));
  const storeById = Object.fromEntries(STORES.map(s => [s.id, s]));

  // Agrupar por loja
  const byStore = {};
  for (const u of universe) {
    if (!byStore[u.store_id]) byStore[u.store_id] = [];
    byStore[u.store_id].push(u);
  }
  const storeKeys = Object.keys(byStore);

  const results = [];
  const stats = { ok: 0, fail: 0, skipped: 0, low_confidence: 0 };

  // Processa lojas em paralelo (concurrency limit)
  let cursor = 0;
  async function worker() {
    while (cursor < storeKeys.length) {
      const myIdx = cursor++;
      const sid = storeKeys[myIdx];
      const store = storeById[sid];
      if (!store) { log('warn', `loja ${sid} não encontrada — skip`); continue; }
      const resolver = new UrlResolver(store);
      await resolver.init();
      try {
        for (const u of byStore[sid]) {
          const product = productByEan[u.ean];
          if (!product) { stats.skipped++; continue; }
          let r;
          try { r = await resolver.resolve(product); }
          catch (err) {
            log('error', `[${sid}] ${u.ean}: ${err.message}`);
            r = { canonical_url: null, method: 'error', confidence: 0, title_observed: null };
          }
          const entry = {
            ean: u.ean,
            store_slug: sid,
            canonical_url: r.canonical_url,
            resolution_method: r.method,
            confidence: r.confidence,
            title_observed: r.title_observed,
            resolved_at: new Date().toISOString(),
            needs_review: r.confidence < CONFIDENCE_THRESHOLD,
          };
          results.push(entry);
          if (!r.canonical_url) stats.fail++;
          else if (r.confidence < CONFIDENCE_THRESHOLD) { stats.low_confidence++; stats.ok++; }
          else stats.ok++;
        }
      } finally {
        await resolver.close();
      }
      log('info', `[${sid}] concluído (${byStore[sid].length} produtos)`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, storeKeys.length) }, () => worker()));

  // Persistir
  const output = {
    version: '1.0',
    resolved_at: new Date().toISOString(),
    sample: SAMPLE,
    dry_run: DRY_RUN,
    confidence_threshold: CONFIDENCE_THRESHOLD,
    stats: { ...stats, total: results.length, pct_ok: results.length ? (stats.ok / results.length * 100).toFixed(1) : 0 },
    results,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  log('info', `✔ ${results.length} resoluções escritas em ${OUT_PATH}`);
  log('info', `  ok=${stats.ok} (low-conf=${stats.low_confidence}) · fail=${stats.fail} · skipped=${stats.skipped}`);
  logStream.end();
}

main().catch(err => {
  log('error', `FATAL: ${err.stack || err.message}`);
  process.exit(1);
});
