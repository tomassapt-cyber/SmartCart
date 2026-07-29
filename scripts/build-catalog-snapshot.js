#!/usr/bin/env node
/**
 * Snapshot do catálogo em PEDAÇOS (uma shard por loja) — Fase 2 da migração.
 * ============================================================================
 * PORQUÊ (2026-07-29): o site precisa do catálogo INTEIRO em memória (o
 * rebuildCatalogIndexes constrói 8 índices globais e ~15 funcionalidades
 * varrem tudo). Medido: trazê-lo da BD por PostgREST são 303.514 linhas =
 * ~305 pedidos (tecto de 1000 por resposta) e ~55 MB — PIOR que os 8,8 MB
 * comprimidos do HTML de hoje.
 *
 * O snapshot resolve isso: os mesmos dados, mas em ficheiros grandes e
 * CACHEÁVEIS. Uma shard por loja significa que um refresh da Wells invalida
 * ~60 KB, não o catálogo todo — e um visitante que volta só volta a
 * descarregar o que mudou.
 *
 * Corre a partir do MESMO objecto em memória que o sync envia para a BD, já
 * com todos os overlays aplicados — por construção, snapshot e BD são iguais.
 *
 * Nesta fase SÓ GERA E MEDE (para ficheiros locais). O site ainda não lê nada.
 *
 * Uso:
 *   node scripts/build-catalog-snapshot.js [--out=<dir>] [--quiet]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const OUT = path.resolve(args.out || path.join(ROOT, '.snapshot'));
const QUIET = !!args.quiet;

const hash8 = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
const gz = buf => zlib.gzipSync(buf, { level: 9 }).length;

/**
 * Constrói o snapshot a partir de um seed JÁ com os overlays aplicados.
 * @param {object} seed  o mesmo objecto que o sync envia para a BD
 * @returns {{manifest:object, ficheiros:Array<{nome:string,buf:Buffer}>}}
 */
function buildSnapshot(seed) {
  const ficheiros = [];
  const add = (nome, obj) => {
    const buf = Buffer.from(JSON.stringify(obj), 'utf8');
    const nomeHash = nome.replace(/\.json$/, `.${hash8(buf)}.json`);
    ficheiros.push({ nome: nomeHash, buf, bytes: buf.length, gzip: gz(buf) });
    return nomeHash;
  };

  const stores = add('stores.json', seed.stores || []);
  // produtos sem as descrições (não são renderizadas; ver o strip do inject)
  const produtos = (seed.products || []).map(p => ({
    ean: p.ean, name: p.name, brand: p.brand || null,
    category: p.category || null, image_url: p.image_url || null,
  }));
  const products = add('products.json', produtos);

  // uma shard por loja — é isto que torna um refresh barato
  const shards = [];
  for (const g of (seed.store_products || [])) {
    if (!g.items || !g.items.length) continue;
    const nome = add(`offers/${g.store_slug}.json`, { store_slug: g.store_slug, items: g.items });
    const f = ficheiros[ficheiros.length - 1];
    shards.push({ store_slug: g.store_slug, url: nome, bytes: f.bytes, gzip: f.gzip, items: g.items.length });
  }

  const manifest = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    counts: {
      stores: (seed.stores || []).length,
      products: produtos.length,
      offers: (seed.store_products || []).reduce((s, g) => s + (g.items || []).length, 0),
    },
    stores_url: stores,
    products_url: products,
    shards,
  };
  return { manifest, ficheiros };
}

// ── CLI: gera a partir do seed + overlays (o mesmo caminho do sync) ──────────
if (require.main === module) {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
  const { isNonCosmetic } = require('./lib/product-fingerprint');

  // MESMA cadeia e MESMA ordem do push-catalog-to-db.js — se divergirem, o
  // snapshot deixa de bater certo com a BD.
  require('./lib/verified-shipping').applyVerifiedShipping(seed, ROOT);
  const vf = require('./lib/variant-fixes');
  vf.fixTruncatedVariantPrices(seed);
  vf.dropWrongProductVariants(seed);
  require('./dedup-ean-variants').mergeEanVariants(seed);
  require('./lib/promo-fold').foldPromoVariants(seed);
  require('./lib/ghost-offers').dropGhostOffers(seed);
  const cv = require('./lib/catalog-visibility');
  cv.dropRottenOffers(seed);
  cv.applyVisibilityFilter(seed, isNonCosmetic);
  require('./lib/name-cleanup').applyNameCleanup(seed);

  const { manifest, ficheiros } = buildSnapshot(seed);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'offers'), { recursive: true });
  for (const f of ficheiros) fs.writeFileSync(path.join(OUT, f.nome), f.buf);
  const manBuf = Buffer.from(JSON.stringify(manifest, null, 1), 'utf8');
  fs.writeFileSync(path.join(OUT, 'manifest.json'), manBuf);

  if (!QUIET) {
    const bytes = ficheiros.reduce((s, f) => s + f.bytes, 0);
    const gzip = ficheiros.reduce((s, f) => s + f.gzip, 0);
    const shardGz = manifest.shards.map(s => s.gzip).sort((a, b) => a - b);
    const mediana = shardGz[Math.floor(shardGz.length / 2)];
    console.log(`📦 snapshot em ${OUT}`);
    console.log(`   ${manifest.counts.products} produtos · ${manifest.counts.offers} ofertas · ${manifest.shards.length} shards`);
    console.log(`   total: ${(bytes / 1048576).toFixed(1)} MB  →  ${(gzip / 1048576).toFixed(1)} MB comprimido`);
    console.log(`   produtos: ${(ficheiros.find(f => f.nome.startsWith('products'))?.gzip / 1048576).toFixed(1)} MB gz`);
    console.log(`   shard mediana: ${(mediana / 1024).toFixed(0)} KB gz · maior: ${(Math.max(...shardGz) / 1024).toFixed(0)} KB gz`);
    console.log(`   pedidos p/ carregar tudo: ${ficheiros.length + 1} (vs ~305 pela BD)`);
  }
}

module.exports = { buildSnapshot };
