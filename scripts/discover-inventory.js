#!/usr/bin/env node
/**
 * SmartCartCosmetics — Discovery de inventário por loja
 * ============================================================
 *
 * Para cada loja, descobre os SKUs reais que comercializa, em vez
 * de assumir um catálogo top-down. Fonte primária: sitemap.xml.
 *
 * Arquitectura plug-in: cada loja tem um adapter em STORE_ADAPTERS
 * que sabe como navegar a estrutura específica (sitemap → brand →
 * PDP → JSON-LD).
 *
 * Output: data/inventory/{slug}.json no schema documentado em
 * docs/inventory-schema.md.
 *
 * Uso:
 *   node scripts/discover-inventory.js --store=sweetcare
 *   node scripts/discover-inventory.js --store=sweetcare --limit-brands=10 --limit-products=50
 *   node scripts/discover-inventory.js --store=sweetcare --dry-run
 *   node scripts/discover-inventory.js --store=sweetcare --brand=aderma
 *
 * Variáveis de ambiente:
 *   INVENTORY_DELAY_MS=1500     delay entre requests
 *   INVENTORY_OUT_DIR=data/inventory
 *   INVENTORY_USER_AGENT='Mozilla/5.0 ... Claude-Web (SmartCartCosmetics inventory bot)'
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CLI
// ============================================================
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));

const ROOT = path.resolve(__dirname, '..');
const STORES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stores.json'), 'utf8')).stores;
const STORE_ID = args.store;
if (!STORE_ID) {
  console.error('✗ Uso: node scripts/discover-inventory.js --store=<slug>');
  console.error('  Adapters disponíveis: sweetcare');
  process.exit(1);
}

const store = STORES.find(s => s.id === STORE_ID);
if (!store) { console.error(`✗ Loja ${STORE_ID} não encontrada em data/stores.json`); process.exit(1); }

const OUT_DIR = process.env.INVENTORY_OUT_DIR || path.join(ROOT, 'data', 'inventory');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT_PATH = path.join(OUT_DIR, `${STORE_ID}.json`);

const LOGS_DIR = path.join(ROOT, 'logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
const LOG_PATH = path.join(LOGS_DIR, `inventory-${STORE_ID}-${new Date().toISOString().slice(0,10)}.log`);
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
function log(level, msg) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

const DELAY_MS = Number(process.env.INVENTORY_DELAY_MS || 1500);
const UA = process.env.INVENTORY_USER_AGENT
  || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DRY_RUN = !!args['dry-run'];
const LIMIT_BRANDS = args['limit-brands'] ? Number(args['limit-brands']) : Infinity;
const LIMIT_PRODUCTS = args['limit-products'] ? Number(args['limit-products']) : Infinity;
const FILTER_BRAND = args.brand || null;

// ============================================================
// HTTP helpers (rate-limited + UA realista)
// ============================================================
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function httpGet(url) {
  if (DRY_RUN) {
    log('info', `DRY-RUN fetch ${url}`);
    return '<html><!-- dry run, no content --></html>';
  }
  await sleep(DELAY_MS + Math.random() * 500);  // jitter
  const resp = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.7',
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${url}`);
  return await resp.text();
}

// ============================================================
// Helpers de extracção
// ============================================================
function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch (_) {}
  }
  return out;
}

function findProductLd(html) {
  const ld = extractJsonLd(html);
  return ld.find(n => {
    const t = n['@type'];
    return t === 'Product' || (Array.isArray(t) && t.includes('Product'));
  });
}

function parsePrice(str) {
  if (str == null) return null;
  const m = String(str).replace(/\s+/g, '').match(/(\d+)[.,]?(\d{0,2})/);
  if (!m) return null;
  const decimals = m[2] ? '.' + m[2].padEnd(2, '0') : '';
  return parseFloat(m[1] + decimals);
}

function uniq(arr) { return [...new Set(arr)]; }

// ============================================================
// Adapter: SweetCare
// ============================================================
const STORE_ADAPTERS = {
  sweetcare: {
    name: 'SweetCare',
    base_url: 'https://www.sweetcare.pt',
    sitemap_url: 'https://www.sweetcare.pt/PT-sitemap.xml',

    // Devolve a lista de "brand pages" do sitemap
    async listBrands() {
      const xml = await httpGet(this.sitemap_url);
      // <loc>https://www.sweetcare.pt/b/aderma</loc>
      const matches = [...xml.matchAll(/<loc>\s*(https:\/\/www\.sweetcare\.pt\/b\/[a-z0-9-]+)\s*<\/loc>/g)];
      return uniq(matches.map(m => m[1]));
    },

    // Devolve a lista de URLs de produto numa brand page (com paginação)
    async listProductsInBrand(brandUrl) {
      const html = await httpGet(brandUrl);
      // padrão: /pt/{slug}-p-{code}?st={n}  ou  /pt/{slug}-p-{code}
      const re = /href="(\/pt\/[a-z0-9-]+-p-[a-z0-9]+(?:\?st=\d+)?)"/gi;
      const urls = uniq([...html.matchAll(re)].map(m => 'https://www.sweetcare.pt' + m[1]));
      // TODO: paginação via "Ver Mais Resultados" — para o piloto, ficamos com a primeira página
      return urls;
    },

    // Parse uma PDP → 1 ou mais SKU records (uma PDP pode ter múltiplas variantes)
    async parseProductPage(url) {
      const html = await httpGet(url);
      const ld = findProductLd(html);
      const records = [];

      // Extrair sku_loja_id do URL: /pt/{slug}-p-{code}?st={n}
      const urlMatch = url.match(/-p-([a-z0-9]+)(?:\?st=(\d+))?/i);
      const sku_loja_id = urlMatch ? urlMatch[1].toUpperCase() : null;
      const variant_st = urlMatch && urlMatch[2] ? urlMatch[2] : '01';

      // Marca, nome, categoria, imagem
      let nome = ld?.name || null;
      let marca = ld?.brand?.name || ld?.brand || null;
      let imagem = ld?.image && (Array.isArray(ld.image) ? ld.image[0] : ld.image);
      let ean = ld?.gtin13 || ld?.gtin || null;
      let descricao = ld?.description || null;

      // Categoria via breadcrumb JSON-LD se existir
      const breadcrumb = extractJsonLd(html).find(n => n['@type'] === 'BreadcrumbList');
      const categoria = breadcrumb?.itemListElement?.map(b => b.name).filter(Boolean).join(' > ') || null;

      // Preço(s): JSON-LD offers + tabela de variantes no DOM
      const offers = ld?.offers ? (Array.isArray(ld.offers) ? ld.offers : [ld.offers]) : [];
      // Heurística DOM: tabela de variantes em SweetCare expõe <div class="variant"> com volume + preço
      // Para o piloto, partimos só do JSON-LD primário (variante seleccionada via ?st)
      const offer = offers[0];
      const preco = offer ? parsePrice(offer.price ?? offer.lowPrice) : null;
      const moeda = offer?.priceCurrency || 'EUR';
      const disponivel = offer ? /InStock|LimitedAvailability/i.test(String(offer.availability || '')) : true;

      // Extrair volume do nome (50 ml, 200ml, 400ml, etc.)
      const volMatch = String(nome || '').match(/(\d+(?:[.,]\d+)?)\s*(ml|g|gr|amp|un|cápsulas)\b/i);
      const volume_ml = volMatch ? parseFloat(volMatch[1].replace(',', '.')) : null;
      const volume_unit = volMatch ? volMatch[2].toLowerCase() : null;

      if (sku_loja_id) {
        records.push({
          sku_loja_id: sku_loja_id + (variant_st !== '01' ? `_${variant_st}` : ''),
          url,
          ean,
          nome_raw: nome,
          marca_raw: marca,
          categoria_loja: categoria,
          volume_ml,
          volume_unit,
          imagem_url: imagem,
          preco_observado: preco,
          moeda,
          disponivel,
          descricao_raw: descricao ? descricao.slice(0, 280) : null,
        });
      }
      return records;
    },
  },
};

// ============================================================
// Main
// ============================================================
async function main() {
  const adapter = STORE_ADAPTERS[STORE_ID];
  if (!adapter) {
    log('error', `Sem adapter para loja '${STORE_ID}'. Adapters disponíveis: ${Object.keys(STORE_ADAPTERS).join(', ')}`);
    process.exit(2);
  }

  log('info', `Início discovery loja=${STORE_ID} (${adapter.name}) · dry-run=${DRY_RUN}`);
  log('info', `Limites: brands=${LIMIT_BRANDS} · products=${LIMIT_PRODUCTS} · brand-filter=${FILTER_BRAND || 'none'}`);

  const startTs = Date.now();

  // 1. Descobrir marcas
  let brands;
  try {
    brands = await adapter.listBrands();
  } catch (err) {
    log('error', `Falha no sitemap: ${err.message}`);
    process.exit(3);
  }
  log('info', `${brands.length} páginas de marca encontradas no sitemap`);

  if (FILTER_BRAND) {
    brands = brands.filter(u => u.endsWith('/' + FILTER_BRAND));
    log('info', `Filtro brand=${FILTER_BRAND} → ${brands.length} marcas`);
  }
  brands = brands.slice(0, LIMIT_BRANDS);

  // 2. Para cada marca, listar PDPs
  const allPDPs = [];
  const brandStats = {};
  for (let i = 0; i < brands.length; i++) {
    const brandUrl = brands[i];
    const brandSlug = brandUrl.split('/').pop();
    try {
      const pdps = await adapter.listProductsInBrand(brandUrl);
      brandStats[brandSlug] = pdps.length;
      log('info', `[${i+1}/${brands.length}] brand=${brandSlug} · ${pdps.length} PDPs`);
      for (const url of pdps) {
        allPDPs.push({ brand_slug: brandSlug, url });
        if (allPDPs.length >= LIMIT_PRODUCTS) break;
      }
    } catch (err) {
      log('warn', `[${brandSlug}] falhou: ${err.message}`);
      brandStats[brandSlug] = -1;
    }
    if (allPDPs.length >= LIMIT_PRODUCTS) {
      log('info', `Limite de produtos (${LIMIT_PRODUCTS}) atingido`);
      break;
    }
  }
  log('info', `${allPDPs.length} PDPs únicos para fazer parse`);

  // 3. Parse de cada PDP
  const skus = [];
  const fails = [];
  for (let i = 0; i < allPDPs.length; i++) {
    const { brand_slug, url } = allPDPs[i];
    try {
      const records = await adapter.parseProductPage(url);
      for (const r of records) {
        r.brand_slug_loja = brand_slug;
        r.descoberto_em = new Date().toISOString();
        skus.push(r);
      }
      if ((i+1) % 10 === 0) log('info', `${i+1}/${allPDPs.length} processados · ${skus.length} SKUs até agora`);
    } catch (err) {
      fails.push({ url, error: err.message });
      log('warn', `parse falhou ${url}: ${err.message}`);
    }
  }

  // 4. Stats e persistência
  const elapsed = Math.round((Date.now() - startTs) / 1000);
  const withEan = skus.filter(s => s.ean).length;
  const withPrice = skus.filter(s => s.preco_observado != null).length;
  const inStock = skus.filter(s => s.disponivel).length;
  const stats = {
    brands_scanned: brands.length,
    pdps_discovered: allPDPs.length,
    skus_extracted: skus.length,
    parse_failures: fails.length,
    coverage_ean: skus.length ? Number((withEan / skus.length * 100).toFixed(1)) : 0,
    coverage_price: skus.length ? Number((withPrice / skus.length * 100).toFixed(1)) : 0,
    pct_in_stock: skus.length ? Number((inStock / skus.length * 100).toFixed(1)) : 0,
    elapsed_seconds: elapsed,
  };

  const output = {
    version: '1.0',
    loja_id: STORE_ID,
    loja_nome: adapter.name,
    base_url: adapter.base_url,
    discovered_at: new Date().toISOString(),
    strategy_used: 'sitemap+brand-pages',
    sample: LIMIT_BRANDS !== Infinity || LIMIT_PRODUCTS !== Infinity,
    stats,
    brand_breakdown: brandStats,
    skus,
    failures: fails,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  log('info', `✔ ${skus.length} SKUs persistidos em ${OUT_PATH}`);
  log('info', `  cobertura EAN: ${stats.coverage_ean}% · preço: ${stats.coverage_price}% · stock: ${stats.pct_in_stock}%`);
  log('info', `  tempo: ${elapsed}s · falhas: ${fails.length}`);
  logStream.end();
}

main().catch(err => {
  log('error', `FATAL: ${err.stack || err.message}`);
  process.exit(1);
});
