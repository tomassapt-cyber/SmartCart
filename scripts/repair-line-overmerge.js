#!/usr/bin/env node
/**
 * SmartCart — Reparar produtos FUNDIDOS entre LINHAS diferentes
 * ============================================================
 *
 * Contexto (2026-07-02): entre f1ffd39 (aliases linha→marca-mãe) e o fix
 * LINE_ALIASES, o fingerprint removia o nome da LINHA do nome canónico —
 * Sensibio/Sébium/Hydrabio Gel Moussant colapsavam em 'bioderma|gel-moussant'
 * — e o dedup-audit diário FUNDIU produtos de linhas diferentes num só card
 * (ofertas e variantes misturadas → preços/URLs errados na comparação).
 *
 * Reparação com base no seed PRÉ-BUG (f1ffd39):
 *  1. Para cada produto atual, mapeia cada oferta (store|url) ao produto a
 *     que pertencia no seed pré-bug ("pre-owner").
 *  2. Agrupa os pre-owners por tokens de LINHA (LINE_ALIASES) do nome:
 *     clusters com tokens não-vazios e disjuntos = linhas diferentes fundidas.
 *  3. O cluster cuja linha bate com o nome do produto atual FICA; os outros
 *     voltam para os seus produtos pré-bug (registos restaurados do pré-seed)
 *     com os items pré-bug (variantes limpas) refrescados ao preço do
 *     catálogo raspado ATUAL da loja quando o URL lá está.
 *  4. Ofertas novas (pós-pré-seed, sem mapeamento) são colocadas pelo
 *     fingerprint (lib CORRIGIDA) do nome no catálogo atual da loja; sem
 *     catálogo, ficam onde estão (reportadas).
 *
 * Os merges LEGÍTIMOS do f1ffd39 (resgates de sintéticos da MESMA linha,
 * ex.: 'Densitium Creme' wells → 'Densitium Crème') NÃO são tocados.
 *
 * Uso:
 *   node scripts/repair-line-overmerge.js            # report (dry-run)
 *   node scripts/repair-line-overmerge.js --apply    # aplica ao seed
 *   node scripts/repair-line-overmerge.js --pre=<ficheiro>  # baseline custom
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { productFingerprint, stripAccents, LINE_ALIASES } = require('./lib/product-fingerprint');
const { isBlockedOffer } = require('./lib/store-item-merge');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const PRE_BUG_COMMIT = 'f1ffd39';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const APPLY = !!args.apply;

// ── Vocabulário de tokens de linha ──────────────────────────────────────
const VOCAB = {};
for (const [k, v] of Object.entries(LINE_ALIASES)) {
  for (const w of k.split(/\s+/)) if (w.length > 2 && isNaN(w)) VOCAB[w] = v.token;
  VOCAB[v.token.split('-')[0]] = v.token;
}
function lineSet(name) {
  const s = new Set();
  for (const w of stripAccents(String(name || '').toLowerCase()).split(/[^a-z0-9]+/))
    if (VOCAB[w]) s.add(VOCAB[w]);
  return s;
}
const intersects = (a, b) => [...a].some(t => b.has(t));

// ── Catálogos raspados atuais (preço fresco + fingerprint p/ ofertas novas) ─
const CATALOG_FILE = {
  druni: 'druni-full', wells: 'wells-full', atida: 'atida-full', notino: 'notino-full',
  sweetcare: 'sweetcare-full', 'loja-farmacia': 'lojafarmacia-full', 'bairro-saude': 'bairro-saude-full',
  byfarma: 'byfarma-full', easyfarma: 'easyfarma-full', farmacia365: 'farmacia365-full',
  farmaciapt: 'farmaciapt-full', farmaciavirtual: 'farmaciavirtual-full', cocooncenter: 'cocooncenter-full',
  'pharma-gdd': 'pharmagdd-full', barreiros: 'barreiros-full', aveirofarma: 'aveirofarma-full',
  mycosmetics: 'mycosmetics-full', saudemayor: 'saudemayor-full', manuelaserra: 'manuelaserra-full',
  pharma2you: 'pharma2you-full', farmaciasportuguesas: 'farmaciasportuguesas-full',
  afarmaciaonline: 'afarmaciaonline-full', aminhafarmaciaonline: 'aminhafarmaciaonline-full',
  asuafarmaciaonline: 'asuafarmaciaonline-full', haemiskin: 'haemiskin-full',
};
const _catCache = {};
function catalogByUrl(slug) {
  if (!(slug in _catCache)) {
    _catCache[slug] = null;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalog', CATALOG_FILE[slug] + '.json'), 'utf8'));
      const idx = new Map();
      for (const p of (d.products || d)) if (p.url) idx.set(p.url, p);
      _catCache[slug] = idx;
    } catch { /* sem catálogo local → sem refresh */ }
  }
  return _catCache[slug];
}

// Refresca um item com o preço atual do catálogo da loja (se o URL lá está).
function refreshFromCatalog(slug, item) {
  const idx = catalogByUrl(slug);
  if (!idx) return false;
  const e = item.url && idx.get(item.url);
  if (!e || !(e.price > 0)) return false;
  item.price = Number(e.price.toFixed(2));
  item.in_stock = e.in_stock !== false;
  item.verified_at = e.scraped_at || new Date().toISOString();
  if (e.previous_price && e.previous_price > e.price) {
    item.previous_price = Number(e.previous_price.toFixed(2));
    item.discount_pct = Math.round((1 - e.price / e.previous_price) * 100);
  } else { item.previous_price = null; item.discount_pct = null; }
  for (const v of (item.variants || [])) {
    const ev = v.url && idx.get(v.url);
    if (ev && ev.price > 0) { v.price = Number(ev.price.toFixed(2)); v.in_stock = ev.in_stock !== false; }
  }
  return true;
}

// ── Carregar seeds ──────────────────────────────────────────────────────
const cur = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));
let preRaw;
if (args.pre) {
  preRaw = fs.readFileSync(String(args.pre), 'utf8');
} else {
  preRaw = execSync(`git show ${PRE_BUG_COMMIT}:data/seed-bundle.json`, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024, encoding: 'utf8' });
}
const pre = JSON.parse(preRaw);

const preProd = {}; for (const p of pre.products) preProd[p.ean] = p;
const preItems = {};   // store|url → { ean, item }
const preByStoreEan = {}; // store|ean → [items]
for (const sp of pre.store_products) {
  for (const it of sp.items) {
    if (it.url) preItems[sp.store_slug + '|' + it.url] = { ean: it.ean, item: it };
    (preByStoreEan[sp.store_slug + '|' + it.ean] ||= []).push(it);
  }
}
const curProdByEan = {}; for (const p of cur.products) curProdByEan[p.ean] = p;

// ── Detecção + plano de reparação ───────────────────────────────────────
let repaired = 0, movedOffers = 0, restoredProducts = 0, refreshed = 0, keptUnmapped = 0, blockedSkips = 0;

for (const p of cur.products.slice()) {
  // ofertas atuais deste produto, por loja
  const curOffers = []; // {slug, item}
  for (const sp of cur.store_products)
    for (const it of sp.items) if (it.ean === p.ean) curOffers.push({ slug: sp.store_slug, sp, item: it });
  if (curOffers.length < 2) continue;

  // pre-owners distintos
  const owners = new Map(); // preEan → nº ofertas
  for (const o of curOffers) {
    const pi = o.item.url && preItems[o.slug + '|' + o.item.url];
    if (pi) owners.set(pi.ean, (owners.get(pi.ean) || 0) + 1);
  }
  if (owners.size < 2) continue;

  // clusters por interseção de tokens de linha (union-find simples)
  const ownerList = [...owners.keys()].map(e => ({ ean: e, ls: lineSet(preProd[e] ? preProd[e].name : '') }));
  const clusters = [];
  for (const o of ownerList) {
    let home = null;
    for (const c of clusters) if (o.ls.size && c.ls.size && intersects(o.ls, c.ls)) { home = c; break; }
    if (home) { home.members.push(o.ean); o.ls.forEach(t => home.ls.add(t)); }
    else clusters.push({ members: [o.ean], ls: new Set(o.ls) });
  }
  const nonEmpty = clusters.filter(c => c.ls.size);
  if (nonEmpty.length < 2) continue;   // sem conflito de linhas → merge legítimo, não tocar

  // FICA no produto atual: cluster sem linha conhecida (sem evidência), cluster
  // cuja linha bate com o NOME do produto, ou cluster que contém o próprio EAN
  // (identidade pré-bug). Tudo o resto (linha conhecida ≠ linha do produto) SAI
  // — mesmo quando o produto não tem token de linha conhecido (ex.: Keracnyl):
  // ofertas Cleanance/Lipikar não pertencem a um card Ducray Keracnyl.
  const pLs = lineSet(p.name);
  const moving = clusters.filter(c => {
    if (!c.ls.size) return false;
    if (pLs.size && intersects(c.ls, pLs)) return false;
    if (c.members.includes(p.ean)) return false;
    return true;
  });
  if (!moving.length) continue;
  const stayLs = new Set(pLs);
  for (const c of clusters) if (!moving.includes(c)) c.ls.forEach(t => stayLs.add(t));

  repaired++;
  console.log(`━━ ${p.ean} · ${p.brand || '?'} — ${p.name}`);
  console.log(`   fica: [${[...stayLs].join('+') || '—'}] · sai: ${moving.map(c => '[' + [...c.ls].join('+') + ']').join(' ')}`);

  const ownerOfOffer = (o) => {
    const pi = o.item.url && preItems[o.slug + '|' + o.item.url];
    return pi ? pi.ean : null;
  };
  const movingEans = new Set(moving.flatMap(c => c.members));
  const baseEans = new Set(clusters.filter(c => !moving.includes(c)).flatMap(c => c.members));

  for (const o of curOffers) {
    const owner = ownerOfOffer(o);

    // 1) Oferta mapeada a um pre-owner que SAI → restaurar item pré-bug no produto original
    if (owner && movingEans.has(owner)) {
      if (isBlockedOffer(o.slug, owner)) { blockedSkips++; if (APPLY) o.sp.items = o.sp.items.filter(i => i !== o.item); continue; }
      console.log(`   ← ${o.slug.padEnd(20)} ${String(o.item.price).padStart(7)}€ → ${owner} (${(preProd[owner]?.name || '').slice(0, 45)})`);
      movedOffers++;
      if (!APPLY) continue;
      // restaurar registo do produto original
      if (!curProdByEan[owner]) { cur.products.push(preProd[owner]); curProdByEan[owner] = preProd[owner]; restoredProducts++; }
      // item limpo do pré-seed (variantes sem mistura), refrescado ao catálogo atual
      const cleanItems = (preByStoreEan[o.slug + '|' + owner] || []).map(it => JSON.parse(JSON.stringify(it)));
      o.sp.items = o.sp.items.filter(i => i !== o.item);
      for (const ci of cleanItems) {
        if (refreshFromCatalog(o.slug, ci)) refreshed++;
        if (!o.sp.items.some(i => i.ean === ci.ean && i.url === ci.url)) o.sp.items.push(ci);
      }
      continue;
    }

    // 2) Oferta mapeada à base → repor o item pré-bug (limpa variantes misturadas pós-merge)
    if (owner && baseEans.has(owner)) {
      if (!APPLY) continue;
      const cleanItems = (preByStoreEan[o.slug + '|' + owner] || []).map(it => JSON.parse(JSON.stringify(it)));
      if (cleanItems.length) {
        o.sp.items = o.sp.items.filter(i => i !== o.item);
        for (const ci of cleanItems) {
          ci.ean = p.ean; // fica no card atual
          if (refreshFromCatalog(o.slug, ci)) refreshed++;
          if (!o.sp.items.some(i => i.ean === ci.ean && i.url === ci.url)) o.sp.items.push(ci);
        }
      }
      continue;
    }

    // 3) Oferta NOVA (sem mapeamento pré-bug): decidir pelo catálogo atual da loja
    const idx = catalogByUrl(o.slug);
    const e = idx && o.item.url && idx.get(o.item.url);
    if (e && e.name) {
      const fpE = productFingerprint({ brand: e.brand || p.brand, name: e.name });
      // pertence a um dos produtos que saem?
      let dest = null;
      for (const c of moving) for (const m of c.members) {
        const mp = preProd[m];
        if (mp && productFingerprint(mp) === fpE) dest = m;
      }
      // ou por token de linha do nome do catálogo
      if (!dest) {
        const eLs = lineSet(e.name);
        if (eLs.size && !intersects(eLs, stayLs)) {
          for (const c of moving) if (intersects(eLs, c.ls)) dest = c.members[0];
        }
      }
      if (dest) {
        if (isBlockedOffer(o.slug, dest)) { blockedSkips++; if (APPLY) o.sp.items = o.sp.items.filter(i => i !== o.item); continue; }
        console.log(`   ←ⁿ ${o.slug.padEnd(19)} ${String(o.item.price).padStart(7)}€ → ${dest} (nova, via catálogo: ${e.name.slice(0, 40)})`);
        movedOffers++;
        if (!APPLY) continue;
        if (!curProdByEan[dest]) { cur.products.push(preProd[dest]); curProdByEan[dest] = preProd[dest]; restoredProducts++; }
        o.item.ean = dest;
        if (refreshFromCatalog(o.slug, o.item)) refreshed++;
        continue;
      }
    }
    keptUnmapped++;
  }
}

console.log('\n══════ Resumo ══════');
console.log(`Produtos reparados (linhas separadas): ${repaired}`);
console.log(`Ofertas devolvidas ao produto original: ${movedOffers}`);
console.log(`Registos de produto restaurados do pré-seed: ${restoredProducts}`);
console.log(`Items refrescados ao preço do catálogo atual: ${refreshed}`);
console.log(`Ofertas sem evidência (ficam onde estão): ${keptUnmapped}`);
console.log(`Colocações saltadas por blocklist: ${blockedSkips}`);

if (!APPLY) { console.log('\n[DRY-RUN] Re-corre com --apply para aplicar ao seed.'); process.exit(0); }

fs.writeFileSync(SEED_BUNDLE, JSON.stringify(cur), 'utf8');
console.log(`\n✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')}`);
console.log('  Valida com: node scripts/dedup-audit.js && node scripts/audit-price-outliers.js');
console.log('  E injeta:   node scripts/inject-seed-into-demo.js');
