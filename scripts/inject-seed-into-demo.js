#!/usr/bin/env node
/**
 * Substitui o conteúdo do <script id="seed-data"> em demo.html pelo
 * seed gerado em data/seed-bundle.json. Operação idempotente.
 *
 * Uso: node scripts/inject-seed-into-demo.js
 */
const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const DEMO = path.join(ROOT, 'demo.html');       // TEMPLATE versionado (shell, seed vazio) — só LEITURA
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');

// Modo build de DEPLOY (Vercel): gera o HTML a partir do template + seed já
// committado, SEM correr os sub-builds pesados/de-rede (ghost-verify HTTP,
// build-homepage-data ~274s, build-scan-index). Esses regeneram os data/*.json
// no CI diário; o deploy só embebe o que já está committado (homepage-data.json,
// ghost-check.json, etc.). O Vercel define VERCEL=1 automaticamente;
// COSMATH_DEPLOY_BUILD=1 força o mesmo modo localmente (teste do build).
const DEPLOY = process.env.COSMATH_DEPLOY_BUILD === '1' || process.env.VERCEL === '1';

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

// ── Overlay: PORTES VERIFICADOS (data/store-shipping.json — NÃO-destrutivo) ──
// Os integradores registam lojas novas com defaults adivinhados (49€/3,95€) e
// os limiares reais mudam. store-shipping.json é a fonte de verdade verificada
// à mão site-a-site (auditoria 2026-07-17). Aplica-se ao seed EM MEMÓRIA a cada
// inject: qualquer refresh de bot re-impõe os valores; seed-bundle.json intacto.
// (2026-07-28) A implementação vive agora em scripts/lib/verified-shipping.js,
// partilhada com o push-catalog-to-db.js: enquanto era só aqui, a BD (e o
// app.html) ficavam com os defaults adivinhados — 33 lojas com portes errados.
(function aplicarPortesVerificados() {
  const { applyVerifiedShipping } = require('./lib/verified-shipping');
  const { aplicadas } = applyVerifiedShipping(seedJson, ROOT);
  if (aplicadas) console.log(`🚚 Portes verificados aplicados a ${aplicadas} lojas (store-shipping.json).`);
})();

// ── Overlay: CORRIGIR preços de variante truncados ao inteiro (NÃO-destrutivo) ─
// Bug do scraper da Wells (e afins): a extração de variantes por DOM apanha às
// vezes o preço sem decimais (7,98 € → 7). Como o card usa o preço da VARIANTE
// ao volume de referência (offerPriceAtVol), isso mostra um preço errado (mais
// baixo) do que o real. O preço do item (item.price) vem do JSON-LD e é fiável.
// Recuperamos: numa oferta de UMA só variante, se o preço da variante é um
// inteiro igual ao floor do item.price (não-inteiro), repomos o item.price.
(function corrigirVariantesTruncadas() {
  const { fixTruncatedVariantPrices } = require('./lib/variant-fixes');
  const { fixed } = fixTruncatedVariantPrices(seedJson);
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
(function removerVariantesDeProdutoTrocado() {
  const { dropWrongProductVariants } = require('./lib/variant-fixes');
  const { dropped } = dropWrongProductVariants(seedJson);
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
  // No DEPLOY (Vercel) NÃO se corre a verificação de rede: usa-se a cache
  // committada data/ghost-check.json (dropGhostOffers em baixo lê-a na mesma).
  if (!DEPLOY) {
    try {
      const r = spawnSync('node', [path.join(__dirname, 'verify-ghost-offers.js'), '--quiet', '--max=400'], { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
      if (r.stdout) process.stdout.write(r.stdout);
    } catch { /* offline → usa cache existente */ }
  }
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
// ⚠️ PONTO CEGO CORRIGIDO (2026-07-20): a regra abaixo é RELATIVA — compara
// cada oferta com a mais fresca DA MESMA loja. Isso apanha ofertas esquecidas
// dentro de uma loja activa, mas deixa passar uma loja PARADA POR INTEIRO: se
// tudo é igualmente velho, não há nada mais fresco com que comparar e nada é
// escondido. Medido: 2.964 ofertas visíveis com >7 dias, todas de 4 lojas
// paradas (smartbeauty/beleza37 11d, sobeauty/powerbeauty 6d). Por isso há
// agora também um tecto ABSOLUTO: 14 dias (folgado de propósito — as lojas
// SÓ-PC refrescam à mão e não vale a pena amputar cobertura por 8 dias).
(function esconderOfertasPodres() {
  const { dropRottenOffers } = require('./lib/catalog-visibility');
  const r = dropRottenOffers(seedJson);
  if (r.hidden) console.log(`🥀 Ofertas podres escondidas (>${r.MAX_LAG_DAYS}d atrás do refresh da loja): ${r.hidden} · ${r.perStore.join(', ')}`);
  if (r.hiddenAbs) console.log(`⏳ Destas, por tecto absoluto (>${r.MAX_ABS_DAYS}d — loja parada por inteiro): ${r.hiddenAbs} · ${r.perStoreAbs.join(', ')}`);
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
(function aplicarFiltroDeVisibilidade() {
  const { applyVisibilityFilter } = require('./lib/catalog-visibility');
  const r = applyVisibilityFilter(seedJson, isNonCosmetic);
  console.log(`🙈 Filtro de visibilidade: ${r.hidden} produtos ocultos (${r.visiveis} visíveis) · ${r.hiddenOffers} ofertas removidas do render.`);
})();

// ── Overlay: CATEGORIA corrigida (NÃO-destrutivo) ─────────────────────────
// Assimetria ao contrário das outras (2026-07-29): este overlay só corria no
// push-catalog-to-db.js, por isso a BD tinha as categorias corrigidas e o SITE
// mostrava as cruas da loja — 2.182 produtos em separadores diferentes nos
// dois sítios (um "Hair Serum" em Rosto no site e em Cabelo no /app).
// A correção só promove quando o nome não deixa dúvidas (ver a lib); corre
// sobre o nome ORIGINAL, por isso ANTES da tradução — trocar a ordem partiria
// a classificação.
(function corrigirCategorias() {
  const { fixCategory } = require('./lib/classify-category');
  let n = 0;
  for (const p of seedJson.products) {
    const nova = fixCategory(p.name, p.category);
    if (nova !== (p.category ?? null)) { p.category = nova; n++; }
  }
  if (n) console.log(`🏷️  Categorias corrigidas no render: ${n} (mesma regra da BD)`);
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

// ── Overlay: LIMPEZA de nomes (NÃO-destrutivo) ───────────────────────────
// Lixo dos scrapers que chegava ao ecrã: entidades HTML por descodificar
// ("L&#39;Oréal", "Roger&amp;Gallet"), o nome da LOJA colado no fim
// ("… - Farmácia Barreiros") e reticências de nomes truncados. O
// seed-bundle.json mantém o nome original (é a chave do fingerprint).
(function limparNomes() {
  const { applyNameCleanup } = require('./lib/name-cleanup');
  const { limpos } = applyNameCleanup(seedJson);
  if (limpos) console.log(`🧼 Nomes limpos no render: ${limpos} (entidades HTML, loja colada, reticências)`);
})();

// ── Overlay de NOMES traduzidos PT (NÃO-destrutivo) ──────────────────────
// data/translations.json.names mapeia ean → nome PT limpo (whitelist, sem
// híbridos — ver scripts/build-name-translations.js). Aplicamos SÓ à cópia
// em-memória que vai para o HTML; o seed-bundle.json mantém o nome original
// (fingerprint do dedup). Auto-reverte se o overlay for limpo.
// (2026-07-28) A implementação vive agora em scripts/lib/name-translations.js,
// partilhada com o push-catalog-to-db.js — enquanto era só aqui, a BD (e o
// app.html) serviam os nomes originais em ES/FR das lojas estrangeiras.
const { renamed } = require('./lib/name-translations').applyNameTranslations(seedJson, ROOT);
if (renamed) console.log(`🇵🇹 Nomes traduzidos aplicados ao render: ${renamed} (seed-bundle.json intacto)`);

// Adicionar um comentário identificativo no início do JSON injectado
seedJson._comment = `Catálogo CosMath v1 — gerado em ${new Date().toISOString()} · ${seedJson.products.length} SKUs · ${seedJson.stores.length} lojas · ${seedJson.store_products.reduce((s, sp) => s + sp.items.length, 0)} ofertas.`;

// SEGURANÇA (auditoria 2026-07-25): o JSON.stringify NÃO escapa "<", e o parser
// de HTML fecha o <script> ao ver "</script" mesmo com type="application/json".
// Um nome de produto vindo do scraping com "</script>" partia o bloco e o resto
// do catálogo passava a ser interpretado como HTML na nossa origem (a mesma do
// account.html, onde vive a sessão Supabase). Já há 20 nomes no seed com < > ou
// aspas, e HTML cru de lojas chega mesmo ao seed (ex.: um nome com <span ...>).
// Escapar "<" (e os separadores de linha U+2028/9, que partem o JS) resolve: é
// JSON válido e desarma "</script", "<script" e "<!--".
const jsonSeguro = o => JSON.stringify(o)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const newBlock = '\n' + jsonSeguro(seedJson) + '\n';
let next = html0.slice(0, afterOpen) + newBlock + html0.slice(closeIdx);

// Injectar também homepage-data (10KB) no <script id="hp-data"> se existir
const HP_DATA = path.join(ROOT, 'data', 'homepage-data.json');
const HP_OPEN = '<script type="application/json" id="hp-data">';
if (fs.existsSync(HP_DATA) && next.indexOf(HP_OPEN) !== -1) {
  // mesmo escape do seed: o hp-data também traz nomes de produto do scraping
  const hpData = fs.readFileSync(HP_DATA, 'utf8')
    .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const hpOpenIdx = next.indexOf(HP_OPEN);
  const hpAfterOpen = hpOpenIdx + HP_OPEN.length;
  const hpCloseIdx = next.indexOf(CLOSE, hpAfterOpen);
  if (hpCloseIdx !== -1) {
    next = next.slice(0, hpAfterOpen) + '\n' + hpData + '\n' + next.slice(hpCloseIdx);
  }
}
const html = html0;

// OUTPUTS (git-ignored): index.html (homepage) + catalogo.html (alias). O
// demo.html NÃO é reescrito — é o TEMPLATE versionado (shell com seed vazio),
// editado à mão. O HTML final com o seed embebido é construído aqui (CI local
// e/ou build do Vercel) e nunca committado — ver .gitignore + vercel.json.
const INDEX = path.join(ROOT, 'index.html');
const CATALOGO = path.join(ROOT, 'catalogo.html');
fs.writeFileSync(INDEX, next, 'utf8');
fs.writeFileSync(CATALOGO, next, 'utf8');

const before = (html.length / 1024).toFixed(1);
const after = (next.length / 1024).toFixed(1);
console.log(`✔ ${INDEX} (homepage principal com catálogo)`);
console.log(`✔ ${CATALOGO} (alias /catalogo.html)`);
console.log(`  template demo.html: ${before} KB (shell) → output: ${after} KB (com seed)`);
console.log(`  seed: ${seedJson.products.length} produtos · ${seedJson.stores.length} lojas · ${seedJson.store_products.reduce((s,sp)=>s+sp.items.length,0)} ofertas`);


// ── Homepage curada SEMPRE em sincronia (2026-07-03) ────────────────────────
// O bloco "Homepage curated data" (hero/em-alta/bestsellers) era gerado à mão
// e ficou semanas parado — mostrava preços que o render já escondia (fantasma
// Effaclar 11.61). Agora regenera-se em CADA inject com os mesmos overlays
// (o build-homepage-data.js aplica blocklist+fantasmas+podres) e injeta-se.
if (!DEPLOY) {
  // NOTA: scripts/inject-homepage-data.js é LEGADO (escreve index.html a
  // partir do template homepage.html antigo — destruiria o site). O bloco
  // <script id="hp-data"> vive DENTRO de demo/index/catalogo — substituímos
  // in-place nos 3 ficheiros.
  const { spawnSync } = require('child_process');
  // timeout 900s (2026-07-25): o build cresceu para ~274s com 140k ofertas e,
  // com a verificação ao vivo das descidas, passou dos 420s no CI — o run das
  // 03h de 2026-07-25 morreu por timeout (stderr VAZIO, a assinatura de um
  // spawnSync morto) e o hp-data ficou por regenerar SEM ninguém dar por isso.
  // O build em si já foi acelerado (verificação concorrente + orçamento de
  // 120s), isto é a margem de segurança. COSMATH_SKIP_HP=1 salta o rebuild —
  // landing rápido na vaga de refreshes; o hp aterra num passo separado.
  const r1 = process.env.COSMATH_SKIP_HP === '1'
    ? { status: 1, stderr: 'saltado (COSMATH_SKIP_HP=1)' }
    : spawnSync('node', [path.join(__dirname, 'build-homepage-data.js')], { cwd: ROOT, encoding: 'utf8', timeout: 900000 });
  if (r1.status === 0) {
    try {
      // MESMO escape do caminho de cima (linha ~277). Faltava aqui, e este é o
      // caminho que corre TODOS OS DIAS no CI: o hp-data traz nomes vindos do
      // scraping, e bastava um nome com "</script>" para fechar o bloco a meio
      // e deixar a homepage sem showcase — exactamente a avaria de 2026-07-2x.
      // U+2028/U+2029 são quebras de linha invisíveis que o JSON aceita e o
      // JavaScript não. Escritos como sequências \u… de propósito: pôr os
      // caracteres literais no código já deu asneira uma vez.
      const hp = fs.readFileSync(path.join(ROOT, 'data', 'homepage-data.json'), 'utf8')
        .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      const HP_OPEN = '<script type="application/json" id="hp-data">';
      let done = 0;
      for (const f of ['index.html', 'catalogo.html']) {
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
  } else {
    // Diagnóstico explícito (2026-07-25): quando o spawnSync é morto por
    // timeout, o stderr vem VAZIO — e o aviso genérico não dizia porquê, pelo
    // que o hp ficou 3 dias sem regenerar sem ninguém perceber a causa.
    const porTimeout = r1.error && r1.error.code === 'ETIMEDOUT';
    const motivo = porTimeout ? 'TIMEOUT (excedeu o tempo permitido)'
      : (r1.stderr || '').trim() ? (r1.stderr || '').slice(0, 300)
      : `saiu com status ${r1.status}${r1.signal ? ' / sinal ' + r1.signal : ''} e stderr vazio (provável timeout)`;
    console.warn(`⚠ build-homepage-data NÃO regenerou o hp-data — ${motivo}`);
    console.warn('   → o "Em alta" fica com o conteúdo anterior; a guarda de frescura do daily-scrape torna isto vermelho se persistir.');
  }
}

// ── Índice de descrições p/ o scan por foto (data/scan-index.json) ──
// Regenera-se aqui para acompanhar produtos novos do seed (o scan cruza o texto
// OCR com estes tokens distintivos das descrições). Falha = não-fatal.
if (!DEPLOY) {
  const { spawnSync } = require('child_process');
  const r = spawnSync('node', [path.join(__dirname, 'build-scan-index.js')], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  if (r.status === 0) console.log('🔎 scan-index (descrições) regenerado.');
  else console.warn('⚠ build-scan-index falhou:', (r.stderr || '').slice(0, 160));
}
