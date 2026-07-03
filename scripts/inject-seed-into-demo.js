#!/usr/bin/env node
/**
 * Substitui o conteúdo do <script id="seed-data"> em demo.html pelo
 * seed gerado em data/seed-bundle.json. Operação idempotente.
 *
 * Uso: node scripts/inject-seed-into-demo.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEMO = path.join(ROOT, 'demo.html');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');

const html0 = fs.readFileSync(DEMO, 'utf8');
const seed = fs.readFileSync(SEED, 'utf8');

const OPEN = '<script type="application/json" id="seed-data">';
const CLOSE = '</script>';

const openIdx = html0.indexOf(OPEN);
if (openIdx === -1) { console.error('✗ Tag <script id="seed-data"> não encontrada em demo.html'); process.exit(1); }
const afterOpen = openIdx + OPEN.length;
const closeIdx = html0.indexOf(CLOSE, afterOpen);
if (closeIdx === -1) { console.error('✗ </script> de fecho não encontrado'); process.exit(1); }

const seedJson = JSON.parse(seed);

// ── Overlay: CORRIGIR preços de variante truncados ao inteiro (NÃO-destrutivo) ─
// Bug do scraper da Wells (e afins): a extração de variantes por DOM apanha às
// vezes o preço sem decimais (7,98 € → 7). Como o card usa o preço da VARIANTE
// ao volume de referência (offerPriceAtVol), isso mostra um preço errado (mais
// baixo) do que o real. O preço do item (item.price) vem do JSON-LD e é fiável.
// Recuperamos: numa oferta de UMA só variante, se o preço da variante é um
// inteiro igual ao floor do item.price (não-inteiro), repomos o item.price.
(function fixTruncatedVariantPrices() {
  let fixed = 0;
  for (const sp of seedJson.store_products) {
    for (const it of sp.items) {
      if (!Array.isArray(it.variants) || it.variants.length !== 1 || !(it.price > 0)) continue;
      const v = it.variants[0];
      if (v.price != null && Number.isInteger(v.price) && !Number.isInteger(it.price) && Math.floor(it.price) === v.price) {
        v.price = it.price;
        if (it.previous_price) v.previous_price = it.previous_price;
        fixed++;
      }
    }
  }
  if (fixed) console.log(`🔧 Preços de variante truncados corrigidos: ${fixed} (ex.: 7→7.98)`);
})();

// ── Overlay: REMOVER variantes de PRODUTO TROCADO (NÃO-destrutivo) ────────────
// Bug de scrapers (SweetCare/Druni/Wells): a extração de variantes por DOM às
// vezes apanha um PRODUTO RELACIONADO diferente como se fosse uma "variante" de
// volume. Ex.: Bioderma Sensibio H2O (água micelar) trazia uma "variante 40ml"
// a 24€ que era na verdade o Sensibio AR BB Cream (produto diferente) — o card,
// ao escolher 40ml, mostrava o preço errado. Assinatura fiável e conservadora:
// a variante intrusa tem um URL DIFERENTE da maioria das variantes E viola a
// monotonia de volume (volume MENOR mas preço MAIOR que uma variante de volume
// MAIOR que partilha o URL-maioria). Só assim se apaga — evita apanhar tamanhos
// legítimos (que partilham o URL) ou promoções (que não têm URL discordante).
(function dropWrongProductVariants() {
  let dropped = 0;
  for (const sp of seedJson.store_products) {
    for (const it of sp.items) {
      const vs = (it.variants || []).filter(v => v.url && v.volume_ml > 0 && v.price > 0);
      if (vs.length < 2) continue;
      const cnt = {};
      for (const v of vs) cnt[v.url] = (cnt[v.url] || 0) + 1;
      const mode = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      if (mode[1] < 2) continue;                       // sem URL-maioria clara
      const majVars = vs.filter(v => v.url === mode[0]);
      const toDrop = new Set();
      for (const v of vs) {
        if (v.url === mode[0]) continue;               // parte da maioria → mantém
        // URL discordante: apaga se um volume MAIOR da maioria custa MENOS.
        if (majVars.some(w => w.volume_ml > v.volume_ml && w.price < v.price * 0.95)) toDrop.add(v);
      }
      if (toDrop.size) {
        it.variants = it.variants.filter(v => !toDrop.has(v));
        dropped += toDrop.size;
      }
    }
  }
  if (dropped) console.log(`🧹 Variantes de produto-trocado removidas: ${dropped} (ex.: BB cream 40ml numa água micelar)`);
})();

// ── Overlay: FUNDIR variantes de GTIN (UPC-A ↔ EAN-13 com zero) ────────────
// O mesmo GTIN codificado com padding diferente (850… vs 0850…) partia o
// produto em 2 cards e os preços não comparavam. Funde por núcleo canónico
// (só zeros à esquerda — seguro; ver scripts/dedup-ean-variants.js). Corre a
// cada refresh para apanhar variantes novas que os scrapes vão trazendo.
(function applyEanVariantMerge() {
  const { mergeEanVariants } = require('./dedup-ean-variants');
  const r = mergeEanVariants(seedJson);
  if (r.merged) console.log(`🔗 Variantes de GTIN fundidas (UPC-A↔EAN-13): ${r.merged} produtos · ${r.remapped} ofertas`);
})();

// ── Overlay: FUNDIR variantes promocionais no produto-base (NÃO-destrutivo) ─
// Um MESMO produto listado com promo/oferta ("+100ml grátis", "Edição
// Limitada", "−50% 2ª unidade", "PROMO") vem no seed como produto separado.
// Aqui movemos as suas ofertas para o produto-base com uma nota de promoção e
// escondemos o card duplicado. seed-bundle.json fica intacto (auto-reverte).
(function applyPromoFold() {
  const { foldPromoVariants } = require('./lib/promo-fold');
  const r = foldPromoVariants(seedJson);
  if (r.folded) console.log(`🎁 Promo-fold: ${r.folded} variantes fundidas no produto-base · ${r.movedOffers} ofertas movidas · ${r.annotated} anotadas em loja existente`);
})();

// ── Overlay: ESCONDER ofertas na blocklist de EAN-errado (NÃO-destrutivo) ─
// data/offer-ean-blocklist.json lista ofertas (store_slug, ean) confirmadas
// como PRODUTO ERRADO no EAN — a loja publica o mesmo EAN para outro produto
// (ver scripts/audit-price-outliers.js). A guarda principal vive em
// scripts/lib/store-item-merge.js (os integradores não as re-adicionam ao
// seed); esta é a última defesa no render, para o caso de uma oferta
// bloqueada re-entrar por outro caminho (merge manual, dedup-by-similarity).
(function dropBlocklistedOffers() {
  const BL_FILE = path.join(ROOT, 'data', 'offer-ean-blocklist.json');
  if (!fs.existsSync(BL_FILE)) return;
  let blocked;
  try {
    blocked = new Set((JSON.parse(fs.readFileSync(BL_FILE, 'utf8')).blocked || [])
      .map(b => `${b.store_slug}|${b.ean}`));
  } catch { return; }
  if (!blocked.size) return;
  let dropped = 0;
  for (const sp of seedJson.store_products) {
    const before = sp.items.length;
    sp.items = sp.items.filter(it => !blocked.has(`${sp.store_slug}|${it.ean}`));
    dropped += before - sp.items.length;
  }
  if (dropped) console.log(`🚫 Ofertas em blocklist (EAN errado da loja) fora do render: ${dropped}`);
})();

// ── Overlay: ESCONDER ofertas-fantasma (produto removido da loja) ─────────
// Os integradores nunca removem ofertas → quando uma loja tira um produto do
// site, a oferta fica no seed com o preço velho e o link dá 404. Dois sinais
// OBRIGATÓRIOS para esconder (ver scripts/lib/ghost-offers.js):
//   1. URL ausente do catálogo raspado fresco da loja (candidato);
//   2. confirmação HTTP 404/410 em cache (data/ghost-check.json, mantida por
//      scripts/verify-ghost-offers.js — corrido aqui de forma bounded).
// NÃO-destrutivo (seed intacto; auto-recupera se o produto voltar). Corre
// ANTES do filtro de visibilidade: produtos cujas ofertas fiquem TODAS
// fantasma tornam-se órfãos e são escondidos por esse filtro.
(function applyGhostOffers() {
  const { spawnSync } = require('child_process');
  // Actualizar a cache de verificação (bounded; falha de rede não bloqueia —
  // o overlay usa a cache existente e nunca esconde sem confirmação).
  try {
    const r = spawnSync('node', [path.join(__dirname, 'verify-ghost-offers.js'), '--quiet', '--max=400'], { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
    if (r.stdout) process.stdout.write(r.stdout);
  } catch { /* offline → usa cache existente */ }
  const { dropGhostOffers } = require('./lib/ghost-offers');
  const r = dropGhostOffers(seedJson);
  if (r.totalGhost) {
    const detail = r.perStore.filter(s => s.ghosts).sort((a, b) => b.ghosts - a.ghosts)
      .map(s => `${s.slug}:${s.ghosts}`).join(', ');
    console.log(`👻 Ofertas-fantasma escondidas: ${r.totalGhost} (confirmadas 404; ${r.totalUnconfirmed} candidatas por confirmar mantêm-se) · ${detail}`);
  } else {
    console.log(`👻 Ofertas-fantasma: 0 confirmadas (${r.totalUnconfirmed} candidatas por confirmar; ${r.storesProcessed} lojas verificadas)`);
  }
})();

// ── Overlay: ESCONDER ofertas PODRES (loja fresca, oferta parada) ──────────
// Auditoria 2026-07-03: ~1.900 ofertas com verified_at >7d em lojas que raspam
// diariamente — produto removido (fantasma pendente), fora do filtro --dermo,
// ou a falhar extração. O preço destas ofertas apodrece e "não bate certo"
// (reportado pelo user 3×). Regra: se a oferta está ≥7 dias mais velha que o
// refresh mais recente DA MESMA loja → esconder do render (seed intacto;
// volta sozinha quando o scrape a re-verificar). Lojas-snapshot (Notino) não
// são afetadas: a diferença interna é ~0.
(function dropRottenOffers() {
  const DAY = 864e5, MAX_LAG_DAYS = 7;
  const ageOf = (it) => {
    let t = +new Date(it.verified_at || 0);
    for (const v of (it.variants || [])) { const tv = +new Date(v.verified_at || 0); if (tv > t) t = tv; }
    return t;
  };
  let hidden = 0; const perStore = [];
  for (const sp of seedJson.store_products) {
    let freshest = 0;
    for (const it of sp.items) { const t = ageOf(it); if (t > freshest) freshest = t; }
    if (!freshest) continue;
    const before = sp.items.length;
    sp.items = sp.items.filter(it => { const t = ageOf(it); if (!t) return true; return (freshest - t) <= MAX_LAG_DAYS * DAY; });
    const n = before - sp.items.length;
    if (n) { hidden += n; perStore.push(`${sp.store_slug}:${n}`); }
  }
  if (hidden) console.log(`🥀 Ofertas podres escondidas (>${7}d atrás do refresh da loja): ${hidden} · ${perStore.join(', ')}`);
})();

// ── Filtro de visibilidade (NÃO-destrutivo) ──────────────────────────────
// Esconde do HTML publicado produtos que não fazem sentido mostrar, SEM
// alterar data/seed-bundle.json. Os scrapers continuam a manter o seed
// completo; isto só afecta o que é renderizado e auto-corrige no próximo
// rebuild (produto volta a stock / é re-verificado → reaparece sozinho).
//
// Critérios de OCULTAÇÃO (qualquer um esconde o produto):
//   1. Órfão     — sem nenhuma oferta de loja (sem preço nem link).
//   2. Fora-site — TODAS as ofertas não verificadas há > STALE_DAYS dias.
//   3. Esgotado  — TODAS as ofertas com in_stock === false.
const STALE_DAYS = 14;
(function applyVisibilityFilter() {
  const offersByEan = {};
  for (const sp of seedJson.store_products)
    for (const it of sp.items) (offersByEan[it.ean] ||= []).push(it);

  // "Agora" robusto = verified_at mais recente do seed (evita marcar tudo
  // stale se o relógio do CI divergir do horário real do utilizador).
  let maxTs = Date.now();
  for (const offs of Object.values(offersByEan))
    for (const o of offs) { const t = +new Date(o.verified_at || 0); if (t > maxTs) maxTs = t; }
  const ageDays = (o) => o.verified_at ? (maxTs - new Date(o.verified_at)) / 864e5 : Infinity;

  // Comparabilidade: nº de lojas distintas com preço (>=2 = comparável).
  const storesWithPrice = {};
  for (const sp of seedJson.store_products)
    for (const it of sp.items)
      if (it.price > 0) (storesWithPrice[it.ean] ||= new Set()).add(sp.store_slug);
  const comparable = (ean) => (storesWithPrice[ean] ? storesWithPrice[ean].size : 0) >= 2;

  const visibleEans = new Set();
  for (const p of seedJson.products) {
    const offs = offersByEan[p.ean] || [];
    if (offs.length === 0) continue;                          // 1. órfão
    if (offs.every(o => o.in_stock === false)) continue;      // 2. esgotado → SEMPRE esconde
    // 3. fora-de-site (todas as ofertas stale >14d): só esconde os NÃO-comparáveis;
    //    um produto comparável (>=2 lojas c/ preço) e em stock mantém-se visível.
    if (!comparable(p.ean) && offs.every(o => ageDays(o) > STALE_DAYS)) continue;
    visibleEans.add(p.ean);
  }

  const totalProducts = seedJson.products.length;
  const totalOffers = seedJson.store_products.reduce((s, sp) => s + sp.items.length, 0);

  // Manter só produtos visíveis + as ofertas desses produtos (remover as
  // ofertas dos ocultos evita contagens infladas e links partidos).
  seedJson.products = seedJson.products.filter(p => visibleEans.has(p.ean));
  for (const sp of seedJson.store_products)
    sp.items = sp.items.filter(it => visibleEans.has(it.ean));

  const hidden = totalProducts - seedJson.products.length;
  const hiddenOffers = totalOffers - seedJson.store_products.reduce((s, sp) => s + sp.items.length, 0);
  console.log(`🙈 Filtro de visibilidade: ${hidden} produtos ocultos (${seedJson.products.length} visíveis) · ${hiddenOffers} ofertas removidas do render.`);
})();

// ── Strip de descrições do render (NÃO-destrutivo) ───────────────────────
// As descrições vivem no seed-bundle.json (a "base de dados") e servem para
// recomendação/indexação, mas NÃO são renderizadas hoje. Mantê-las no HTML
// publicado somava ~5MB a cada page-load sem benefício visível. Removemo-las
// só da cópia em-memória que é injectada. Auto-reverte se algum dia o front
// passar a mostrá-las (basta apagar este bloco).
let strippedDesc = 0;
for (const p of seedJson.products) {
  if (p.description != null) { delete p.description; delete p.description_source; strippedDesc++; }
}
if (strippedDesc) console.log(`✂  Descrições removidas do render: ${strippedDesc} (ficam só no seed-bundle.json)`);

// ── Overlay de NOMES traduzidos PT (NÃO-destrutivo) ──────────────────────
// data/translations.json.names mapeia ean → nome PT limpo (whitelist, sem
// híbridos — ver scripts/build-name-translations.js). Aplicamos SÓ à cópia
// em-memória que vai para o HTML; o seed-bundle.json mantém o nome original
// (fingerprint do dedup). Auto-reverte se o overlay for limpo.
let renamed = 0;
const TR_FILE = path.join(ROOT, 'data', 'translations.json');
if (fs.existsSync(TR_FILE)) {
  try {
    const names = (JSON.parse(fs.readFileSync(TR_FILE, 'utf8')).names) || {};
    for (const p of seedJson.products) {
      if (names[p.ean] && names[p.ean] !== p.name) { p.name = names[p.ean]; renamed++; }
    }
  } catch (e) { console.warn('⚠  translations.json names não aplicado:', e.message); }
}
if (renamed) console.log(`🇵🇹 Nomes traduzidos aplicados ao render: ${renamed} (seed-bundle.json intacto)`);

// Adicionar um comentário identificativo no início do JSON injectado
seedJson._comment = `Catálogo GirlMath v1 — gerado em ${new Date().toISOString()} · ${seedJson.products.length} SKUs · ${seedJson.stores.length} lojas · ${seedJson.store_products.reduce((s, sp) => s + sp.items.length, 0)} ofertas.`;

const newBlock = '\n' + JSON.stringify(seedJson) + '\n';
let next = html0.slice(0, afterOpen) + newBlock + html0.slice(closeIdx);

// Injectar também homepage-data (10KB) no <script id="hp-data"> se existir
const HP_DATA = path.join(ROOT, 'data', 'homepage-data.json');
const HP_OPEN = '<script type="application/json" id="hp-data">';
if (fs.existsSync(HP_DATA) && next.indexOf(HP_OPEN) !== -1) {
  const hpData = fs.readFileSync(HP_DATA, 'utf8');
  const hpOpenIdx = next.indexOf(HP_OPEN);
  const hpAfterOpen = hpOpenIdx + HP_OPEN.length;
  const hpCloseIdx = next.indexOf(CLOSE, hpAfterOpen);
  if (hpCloseIdx !== -1) {
    next = next.slice(0, hpAfterOpen) + '\n' + hpData + '\n' + next.slice(hpCloseIdx);
  }
}
const html = html0;
fs.writeFileSync(DEMO, next, 'utf8');

// Mirror para BOTH index.html (homepage) e catalogo.html (alias).
// O user quer o catálogo dinâmico com todas as features como homepage principal.
const INDEX = path.join(ROOT, 'index.html');
const CATALOGO = path.join(ROOT, 'catalogo.html');
fs.writeFileSync(INDEX, next, 'utf8');
fs.writeFileSync(CATALOGO, next, 'utf8');

const before = (html.length / 1024).toFixed(1);
const after = (next.length / 1024).toFixed(1);
console.log(`✔ ${DEMO}`);
console.log(`✔ ${INDEX} (homepage principal com catálogo)`);
console.log(`✔ ${CATALOGO} (alias /catalogo.html)`);
console.log(`  demo.html: ${before} KB → ${after} KB`);
console.log(`  seed: ${seedJson.products.length} produtos · ${seedJson.stores.length} lojas · ${seedJson.store_products.reduce((s,sp)=>s+sp.items.length,0)} ofertas`);


// ── Homepage curada SEMPRE em sincronia (2026-07-03) ────────────────────────
// O bloco "Homepage curated data" (hero/em-alta/bestsellers) era gerado à mão
// e ficou semanas parado — mostrava preços que o render já escondia (fantasma
// Effaclar 11.61). Agora regenera-se em CADA inject com os mesmos overlays
// (o build-homepage-data.js aplica blocklist+fantasmas+podres) e injeta-se.
{
  // NOTA: scripts/inject-homepage-data.js é LEGADO (escreve index.html a
  // partir do template homepage.html antigo — destruiria o site). O bloco
  // <script id="hp-data"> vive DENTRO de demo/index/catalogo — substituímos
  // in-place nos 3 ficheiros.
  const { spawnSync } = require('child_process');
  const r1 = spawnSync('node', [path.join(__dirname, 'build-homepage-data.js')], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  if (r1.status === 0) {
    try {
      const hp = fs.readFileSync(path.join(ROOT, 'data', 'homepage-data.json'), 'utf8');
      const HP_OPEN = '<script type="application/json" id="hp-data">';
      let done = 0;
      for (const f of ['demo.html', 'index.html', 'catalogo.html']) {
        const fp = path.join(ROOT, f);
        const h = fs.readFileSync(fp, 'utf8');
        const o = h.indexOf(HP_OPEN);
        if (o === -1) continue;
        const a = o + HP_OPEN.length;
        const c = h.indexOf('</'+'script>', a);
        if (c === -1) continue;
        fs.writeFileSync(fp, h.slice(0, a) + String.fromCharCode(10) + hp + String.fromCharCode(10) + h.slice(c), 'utf8');
        done++;
      }
      console.log(`🏠 Homepage curada regenerada (mínimo absoluto + overlays) em ${done} ficheiros.`);
    } catch (e) { console.warn('⚠ substituição hp-data falhou:', e.message); }
  } else console.warn('⚠ build-homepage-data falhou:', (r1.stderr || '').slice(0, 200));
}
