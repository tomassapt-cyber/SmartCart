#!/usr/bin/env node
/**
 * GirlMath — Integrate Atida catalog into seed
 * ============================================================
 *
 * Lê data/catalog/atida-full.json e funde no seed-bundle:
 *  1. Match por fingerprint (brand+name canónico — multilang).
 *  2. Se não houver match, ADICIONA como novo produto com EAN sintético.
 *
 * Atida é Shopify → não expõe `barcode` na API pública. Tudo o
 * matching é por fingerprint. O `sku` Shopify é apenas referência
 * interna da loja, não GTIN.
 *
 * Em ambos os casos, faz upsert da oferta Atida como store_product
 * com variantes (volume_ml + price + previous_price + in_stock + url).
 *
 * Side-effects:
 *  - Quando match por fingerprint encontra produto com EAN sintético
 *    de outra loja (wells-X, druni-X, sweetcare-X), NÃO mexe no EAN
 *    porque não temos GTIN-real para upgradear (ao contrário de Druni).
 *  - Imagens são "sticky" — só preenche image_url se em falta.
 *
 * Uso:
 *   node scripts/integrate-atida-catalog.js
 *   node scripts/integrate-atida-catalog.js --dry-run
 *   node scripts/integrate-atida-catalog.js --max=200
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { productFingerprint, displayBrand, fuzzyMatch, normalizeBrand } = require('./lib/product-fingerprint');
const { upsertStoreItem } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const ATIDA_FULL = path.join(ROOT, 'data', 'catalog', 'atida-full.json');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const DRY_RUN = !!args['dry-run'];
const MAX_PRODUCTS = args.max ? parseInt(args.max, 10) : Infinity;

const STORE_SLUG = 'atida';

function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function isRealEan(ean) {
  return /^\d{8,14}$/.test(ean || '');
}

function syntheticEan(p) {
  // EAN sintético derivado do URL slug (Atida não tem 'handle', usa URL).
  // Estável entre runs — URL é o ID único do produto.
  const url = p.url || '';
  const slug = url.split('/').pop().slice(0, 50).replace(/[^a-z0-9-]/g, '');
  return `atida-${slug}`;
}

(function main() {
  if (!fs.existsSync(ATIDA_FULL)) {
    console.error('✗ Não existe', ATIDA_FULL);
    console.error('  Corre primeiro: node scripts/scrape-atida-catalog.js');
    process.exit(1);
  }
  if (!fs.existsSync(SEED_BUNDLE)) {
    console.error('✗ Não existe', SEED_BUNDLE);
    process.exit(1);
  }

  const efData = loadJSON(ATIDA_FULL);
  const seed = loadJSON(SEED_BUNDLE);

  if (!efData?.products || !seed?.products) {
    console.error('✗ Ficheiros com estrutura inválida.');
    process.exit(1);
  }

  console.log(`📦 Atida catalog: ${efData.products.length} produtos`);
  console.log(`📦 Seed actual:       ${seed.products.length} produtos, ${seed.stores.length} lojas\n`);

  // Filtrar categorias fora do foco dermo/farmácia (decisão 2026-05-25)
  // makeup + perfume excluídos. Mantemos: skincare, hair, body.
  const ALLOWED_CATEGORIES = new Set(['skincare', 'hair', 'haircare', 'body']);
  const beforeFilter = efData.products.length;
  let efToIntegrate = efData.products.filter(p => ALLOWED_CATEGORIES.has(p.category));
  console.log(`🎯 Filtro categoria (dermo focus): ${beforeFilter} → ${efToIntegrate.length} produtos`);
  console.log(`   (skip ${beforeFilter - efToIntegrate.length} de makeup/perfume/outros)\n`);

  efToIntegrate = efToIntegrate.slice(0, MAX_PRODUCTS);
  if (MAX_PRODUCTS !== Infinity && efToIntegrate.length < beforeFilter) {
    console.log(`📋 --max=${MAX_PRODUCTS}: ${efToIntegrate.length} retidos\n`);
  }

  // ── Índices ──
  // EAN: indexar tanto reais como sintéticos para acelerar lookups.
  // Fingerprint: principal mecanismo de match para Atida.
  // productsByBrand: usado pelo fuzzyMatch para shortlist de candidatos
  // (evita iterar todo o seed em cada produto).
  const eanIndex = {};
  const fpIndex = {};
  const productsByBrand = {};
  for (const p of seed.products) {
    eanIndex[p.ean] = p;
    const fp = productFingerprint(p);
    if (fp && !fpIndex[fp]) fpIndex[fp] = p;
    const b = normalizeBrand(p.brand);
    if (b) {
      if (!productsByBrand[b]) productsByBrand[b] = [];
      productsByBrand[b].push(p);
    }
  }

  let efSp = seed.store_products.find(sp => sp.store_slug === STORE_SLUG);
  if (!efSp) {
    efSp = { store_slug: STORE_SLUG, items: [] };
    seed.store_products.push(efSp);
  }

  // Limpar ofertas Atida com preço "fake" (placeholder do build-catalog
  // inicial). Detectamos isso porque essas ofertas têm `source: undefined`
  // ou `source: 'manual'` e EANs que estão noutras lojas com preço idêntico.
  // Estratégia conservadora: SÓ remover ofertas Atida cujos EANs vão
  // ser re-inseridos por este integrate. Isto evita matar ofertas válidas
  // por engano.
  const efItemByEan = {};
  for (const item of efSp.items) efItemByEan[item.ean] = item;

  let matchedByFp = 0;
  let matchedByFuzzy = 0;
  let createdNew = 0;
  let storeProductsAdded = 0;
  let storeProductsUpdated = 0;
  const productsBefore = seed.products.length;
  // Para debug — guardar 20 amostras de fuzzy match para o user inspeccionar
  const fuzzySamples = [];

  // Atida expõe GTIN-13 real → matching por EAN funciona forte (cross-store)
  let matchedByEan = 0;
  let upgradedFromSynthetic = 0;

  for (const ep of efToIntegrate) {
    // ── 0. Match por EAN real (preferencial — Atida dá GTIN-13) ──
    let targetProduct = null;
    if (isRealEan(ep.ean) && eanIndex[ep.ean]) {
      targetProduct = eanIndex[ep.ean];
      matchedByEan++;
    }

    // ── 1. Match por fingerprint exacto (fallback se EAN não bater) ──
    if (!targetProduct) {
      const fp = productFingerprint(ep);
      if (fp && fpIndex[fp]) {
        targetProduct = fpIndex[fp];
        matchedByFp++;
        // Side-effect: se target tem EAN sintético e Atida tem EAN real,
        // upgrade do produto para o EAN real (igual ao padrão Druni)
        if (isRealEan(ep.ean) && !isRealEan(targetProduct.ean)) {
          const oldEan = targetProduct.ean;
          targetProduct.ean = ep.ean;
          eanIndex[ep.ean] = targetProduct;
          delete eanIndex[oldEan];
          for (const sp of seed.store_products) {
            for (const item of sp.items) {
              if (item.ean === oldEan) item.ean = ep.ean;
            }
          }
          upgradedFromSynthetic++;
        }
      }
    }

    // ── 2. Match por fuzzy DESLIGADO — causava false positives perigosos ──
    // Caso 'Effaclar Duo +M' a ser fundido com 'Effaclar Duo+' mostrou que
    // o fuzzy 0.65 + Jaccard agrupa produtos da mesma linha que NÃO são
    // o mesmo SKU. Sem barcode/EAN público no Shopify (Atida),
    // só podemos confiar no fingerprint exacto. Produtos sem match exacto
    // entram como novos (preferimos catálogo ligeiramente inflado a preços
    // errados a apresentar ao utilizador).
    //
    // (manter o código abaixo comentado para referência caso queiramos
    //  reactivar com threshold ≥0.90 + signature tokens no futuro)
    //
    // if (!targetProduct) {
    //   const fz = fuzzyMatch(ep, productsByBrand[normalizeBrand(ep.brand)] || [], 0.65);
    //   if (fz) { targetProduct = fz.product; matchedByFuzzy++; }
    // }

    // ── 3. Não match → criar como novo (preferir EAN real Atida) ──
    if (!targetProduct) {
      const newEan = isRealEan(ep.ean) ? ep.ean : syntheticEan(ep);
      // Se já existe com este EAN/slug, reusa.
      if (eanIndex[newEan]) {
        targetProduct = eanIndex[newEan];
      } else {
        targetProduct = {
          ean: newEan,
          name: ep.name,
          brand: displayBrand(ep.brand) || ep.brand,
          category: ep.category === 'haircare' ? 'hair' : ep.category,
          image_url: ep.image_url || null,
          _source: 'atida-catalog',
        };
        seed.products.push(targetProduct);
        eanIndex[newEan] = targetProduct;
        const newFp = productFingerprint(ep);
        if (newFp && !fpIndex[newFp]) fpIndex[newFp] = targetProduct;
        createdNew++;
      }
    } else {
      // Match: enriquece campos em falta sem sobrescrever (sticky)
      if (!targetProduct.image_url && ep.image_url) targetProduct.image_url = ep.image_url;
    }

    // ── Upsert da oferta Atida com variant merge ──
    // upsertStoreItem trata da união de variantes: se já existe um item
    // Atida para este EAN, mantém variantes antigas + acrescenta novas.
    // Para Atida o "produto" do Shopify geralmente é 1 variante (volume).
    const added = { value: 0 }, updated = { value: 0 };
    const result = upsertStoreItem(
      { storeSp: efSp, itemByEan: efItemByEan, addedCounter: added, updatedCounter: updated },
      targetProduct.ean, ep, efData.scraped_at
    );
    if (result.action === 'added') storeProductsAdded++;
    else storeProductsUpdated++;
  }

  console.log('══════ Resumo da integração ══════');
  console.log(`  Match por fingerprint exacto:           ${matchedByFp}`);
  console.log(`  Match por fuzzy (mesma marca + Jaccard):${matchedByFuzzy}`);
  console.log(`  Produtos novos criados:                 ${createdNew}`);
  console.log(`  Atida store_products:               +${storeProductsAdded} adicionados, ${storeProductsUpdated} actualizados`);
  console.log('');
  console.log(`  Produtos seed antes: ${productsBefore}`);
  console.log(`  Produtos seed agora: ${seed.products.length}`);
  console.log(`  Δ: +${seed.products.length - productsBefore}`);

  if (fuzzySamples.length) {
    console.log(`\n══════ Amostra de fuzzy matches (validar manualmente) ══════`);
    fuzzySamples.forEach((s, i) => {
      console.log(`  ${i+1}. score=${s.score}`);
      console.log(`     EF:   ${s.ef}`);
      console.log(`     SEED: ${s.seed}`);
    });
  }

  // Stats — ofertas Atida agora vs antes
  console.log(`\n  Ofertas Atida totais: ${efSp.items.length}`);
  const withDiscount = efSp.items.filter(i => i.previous_price && i.previous_price > i.price).length;
  console.log(`    com desconto activo:   ${withDiscount}`);

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] Nada escrito.');
    return;
  }

  fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
  console.log(`\n✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')} (${(fs.statSync(SEED_BUNDLE).size / 1024).toFixed(0)} KB)`);

  // Pós-processo: dedup-audit catch-all
  console.log('\n▶ A correr dedup-audit (catch-all)...');
  const dedup = spawnSync('node', [path.join(ROOT, 'scripts', 'dedup-audit.js'), '--apply'], {
    cwd: ROOT, stdio: 'inherit',
  });
  if (dedup.status !== 0) {
    console.warn('⚠ dedup-audit falhou — continuar mesmo assim.');
  }

  console.log('\n▶ Re-injectando no demo.html + index.html...');
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'inject-seed-into-demo.js')], {
    cwd: ROOT, stdio: 'inherit',
  });
  if (r.status === 0) {
    console.log('\n✅ Integração Atida completa.');
  }
})();
