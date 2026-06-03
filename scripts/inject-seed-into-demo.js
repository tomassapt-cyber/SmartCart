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

  const visibleEans = new Set();
  for (const p of seedJson.products) {
    const offs = offersByEan[p.ean] || [];
    if (offs.length === 0) continue;                          // 1. órfão
    if (offs.every(o => ageDays(o) > STALE_DAYS)) continue;   // 2. fora-site
    if (offs.every(o => o.in_stock === false)) continue;      // 3. esgotado
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
