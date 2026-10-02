#!/usr/bin/env node
/**
 * CosMath — SYNC do catálogo para a BD (Fase 1 do backend, 2026-07-23)
 * ============================================================================
 * Lê data/seed-bundle.json e faz upsert de stores/products/offers no Supabase
 * via PostgREST (bulk, on_conflict=merge). No fim apaga as ofertas que saíram
 * do seed (synced_at < run). O site NÃO lê daqui ainda — a BD nasce ao lado
 * (dual-write); a Fase 2 muda a leitura.
 *
 * Segurança/robustez:
 *   • precisa de SUPABASE_URL + SUPABASE_SERVICE_KEY (secrets do CI); sem
 *     eles sai em silêncio com código 0 — nunca falha um workflow por isso;
 *   • aplica a blocklist ANTES de enviar (a BD só vê ofertas limpas);
 *   • headline apenas (variantes = Fase 2);
 *   • lotes de 1000 linhas; retry simples; --dry-run valida payloads local.
 *
 * Desde 2026-10-02 é INCREMENTAL: só envia o que mudou e apaga pelo nome o
 * que saiu (scripts/lib/db-sync-estado.js; o estado vive na cache do Actions).
 *
 * Uso:
 *   node scripts/push-catalog-to-db.js [--dry-run [--gravar-estado]] [--completo] [--batch=1000]
 */
const fs = require('fs');
const path = require('path');
const { fixCategory } = require('./lib/classify-category');
const { isNonCosmetic } = require('./lib/product-fingerprint');
const { applyVerifiedShipping } = require('./lib/verified-shipping');
const { loadNameTranslations } = require('./lib/name-translations');
const { productSearchNorm } = require('./lib/search-norm');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const BL = path.join(ROOT, 'data', 'offer-ean-blocklist.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DRY = !!args['dry-run'];
const BATCH = args.batch ? parseInt(args.batch, 10) : 1000;

const URL_ = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function upsert(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    let ok = false;
    for (let att = 1; att <= 3 && !ok; att++) {
      try {
        const r = await fetch(`${URL_}/rest/v1/${table}?on_conflict=${onConflict}`, {
          method: 'POST',
          headers: {
            apikey: KEY, Authorization: 'Bearer ' + KEY,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(chunk),
          signal: AbortSignal.timeout(60000),
        });
        if (r.status >= 400) {
          const body = (await r.text()).slice(0, 180);
          // 4xx = determinístico (dado mau) → falhar JÁ, retry só ajuda em 5xx/rede
          if (r.status < 500) throw Object.assign(new Error(`HTTP ${r.status}: ${body}`), { fatal: true });
          throw new Error(`HTTP ${r.status}: ${body}`);
        }
        ok = true;
      } catch (e) {
        if (e.fatal || att === 3) throw new Error(`${table} lote ${i / BATCH}: ${e.message}`);
        await new Promise(s => setTimeout(s, 2000 * att));
      }
    }
    if ((i / BATCH) % 20 === 0) console.log(`  ${table}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log(`  ✓ ${table}: ${rows.length} linhas`);
}

(async function main() {
  // ⏸ PAUSA PREVISTA (2026-10-02): o projeto Supabase está restringido por quota de
  // Storage até 15/10 (registo de correções #26) e TODOS os pedidos dão 402. Sem
  // isto, cada corrida (12×/dia) falhava e mandava um email de "workflow failed".
  // Só vale para ESSE erro e só até 16/10: depois, um 402 volta a fazer o
  // workflow falhar alto, como deve.
  if (URL_ && KEY && Date.now() < Date.parse('2026-10-16T00:00:00Z')) {
    try {
      const r = await fetch(`${URL_}/rest/v1/stores?select=slug&limit=1`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }, signal: AbortSignal.timeout(20000) });
      if (r.status === 402 && /exceed_storage_size_quota/.test(await r.text())) {
        console.log('⏸ Supabase restringido (quota de Storage, até 15/10) — sync adiado. O catálogo está todo no git e entra completo na 1.ª corrida depois do desbloqueio.');
        return;
      }
    } catch { /* segue: o resto do script trata dos erros como sempre */ }
  }
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const blocked = new Set((() => { try { return (JSON.parse(fs.readFileSync(BL, 'utf8')).blocked || []).map(b => b.store_slug + '|' + b.ean); } catch { return []; } })());
  const runTs = new Date().toISOString();

  // PORTES VERIFICADOS (2026-07-28): sem isto a BD ficava com os defaults
  // adivinhados pelos integradores e o app.html mostrava portes errados em 33
  // das 62 lojas — incluindo promessas falsas de "portes grátis". O site já
  // aplicava este overlay; agora o sync usa a MESMA lib.
  {
    const { aplicadas, total } = applyVerifiedShipping(seed, ROOT);
    console.log(`  portes verificados: ${aplicadas}/${total} lojas corrigidas (store-shipping.json)`);
  }

  // ── PARIDADE COM O SITE (2026-07-28) ────────────────────────────────────
  // Medido pelo scripts/audit-db-vs-render.js: a BD mostrava 6.485 produtos e
  // ~13.900 ofertas que o site principal esconde de propósito. Causa: os
  // overlays viviam só no inject. Estes três JÁ eram funções reutilizáveis —
  // aplicam-se aqui pela MESMA ordem do site, sem tocar no inject (portanto
  // sem qualquer risco de alterar o que o site rende).
  // Ficam de fora, por enquanto, os que ainda são inline no inject (ofertas
  // podres e filtro de visibilidade) — próximo passo, com prova por hash.
  {
    // correções às variantes de volume (2026-07-29): faltavam no sync e a BD
    // servia os preços errados que o site já corrigia — 43 variantes com o
    // preço de OUTRO produto e variantes truncadas (29 € em vez de 29,74 €).
    // Correm ANTES do merge de GTIN, como no site.
    const { fixTruncatedVariantPrices, dropWrongProductVariants } = require('./lib/variant-fixes');
    const t = fixTruncatedVariantPrices(seed);
    if (t.fixed) console.log(`  preços de variante truncados corrigidos: ${t.fixed}`);
    const w = dropWrongProductVariants(seed);
    if (w.dropped) console.log(`  variantes de produto-trocado removidas: ${w.dropped}`);
  }
  {
    const { mergeEanVariants } = require('./dedup-ean-variants');
    const r = mergeEanVariants(seed);
    if (r.merged) console.log(`  merge de GTIN (UPC-A↔EAN-13): ${r.merged} produtos · ${r.remapped} ofertas`);
  }
  {
    const { foldPromoVariants } = require('./lib/promo-fold');
    const r = foldPromoVariants(seed);
    if (r.folded) console.log(`  promo-fold: ${r.folded} variantes fundidas · ${r.movedOffers} ofertas movidas`);
  }
  {
    // usa a cache committed data/ghost-check.json (404 já confirmados) — sem rede
    const { dropGhostOffers } = require('./lib/ghost-offers');
    const r = dropGhostOffers(seed);
    if (r.totalGhost) console.log(`  ofertas-fantasma removidas: ${r.totalGhost} (confirmadas 404)`);
  }
  {
    // ofertas podres + filtro de visibilidade: a MESMA lib que o site usa
    // (scripts/lib/catalog-visibility.js). São estes dois que fechavam o grosso
    // da divergência — órfãos, esgotados, stale e ofertas paradas.
    const { dropRottenOffers, applyVisibilityFilter } = require('./lib/catalog-visibility');
    const rp = dropRottenOffers(seed);
    if (rp.hidden) console.log(`  ofertas podres removidas: ${rp.hidden} (>${rp.MAX_LAG_DAYS}d atrás do refresh da loja)`);
    const rv = applyVisibilityFilter(seed, isNonCosmetic);
    console.log(`  filtro de visibilidade: ${rv.hidden} produtos ocultos (${rv.visiveis} publicáveis) · ${rv.hiddenOffers} ofertas`);
  }
  const stores = (seed.stores || []).map(s => ({
    slug: s.slug, name: s.name || s.slug, base_url: s.base_url || null,
    free_shipping_threshold: s.free_shipping_threshold ?? null,
    shipping_mainland: s.shipping_zones?.mainland ?? null,
    shipping_madeira: s.shipping_zones?.madeira ?? null,
    shipping_acores: s.shipping_zones?.acores ?? null,
    pickup_cost: s.pickup_cost ?? null, pickup_note: s.pickup_note ?? null,
    updated_at: runTs,
  }));

  // popularidade por produto (nº lojas com preço em stock + melhor preço) —
  // preenche as colunas da migration 005; se ainda não existirem na BD,
  // degrada graciosamente (ver hasPopCols mais abaixo).
  const pop = {};
  for (const g of seed.store_products || []) {
    for (const it of g.items || []) {
      if (!it.ean || it.in_stock === false || !(it.price > 0)) continue;
      if (blocked.has(g.store_slug + '|' + it.ean)) continue;
      // packs multi-unidade ficam FORA do melhor/pior preço: o preço de um
      // pack de 2 distorce a comparação por unidade (mesma regra do site).
      if (it.promo_pack) continue;
      const e = pop[it.ean] || (pop[it.ean] = { stores: new Set(), min: Infinity, minStore: null, max: 0 });
      e.stores.add(g.store_slug);
      if (it.price < e.min) { e.min = it.price; e.minStore = g.store_slug; }
      if (it.price > e.max) { e.max = it.price; }
    }
  }
  let hasPopCols = false;
  if (URL_ && KEY) {
    try {
      const r = await fetch(`${URL_}/rest/v1/products?select=n_stores&limit=0`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }, signal: AbortSignal.timeout(15000) });
      hasPopCols = r.status < 400;
    } catch { /* mantém false */ }
    console.log(`  colunas de popularidade (migration 005): ${hasPopCols ? 'presentes ✓' : 'ausentes — sync sem elas (aplicar 005)'}`);
  }
  // colunas de promoção/estatística (migration 010) — mesmo padrão.
  let hasPromoCols = false;
  if (URL_ && KEY) {
    try {
      const r = await fetch(`${URL_}/rest/v1/offers?select=promo_note&limit=0`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }, signal: AbortSignal.timeout(15000) });
      hasPromoCols = r.status < 400;
    } catch { /* mantém false */ }
    console.log(`  colunas de promoção/estatística (migration 010): ${hasPromoCols ? 'presentes ✓' : 'ausentes — aplicar 010'}`);
  }
  // coluna de pesquisa sem acentos (migration 009) — mesmo padrão: degrada
  // graciosamente enquanto a migração não estiver aplicada.
  let hasSearchNorm = false;
  if (URL_ && KEY) {
    try {
      const r = await fetch(`${URL_}/rest/v1/products?select=search_norm&limit=0`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }, signal: AbortSignal.timeout(15000) });
      hasSearchNorm = r.status < 400;
    } catch { /* mantém false */ }
    console.log(`  coluna de pesquisa sem acentos (migration 009): ${hasSearchNorm ? 'presente ✓' : 'ausente — aplicar 009 (a pesquisa perde ~6.000 resultados por acentos)'}`);
  }
  // url/image só http(s) — a BD nunca guarda javascript:/data: vindos do
  // scraping (defesa em profundidade; app.html já valida no href) (auditoria).
  const safeUrl = u => { const x = String(u || ''); return /^https?:\/\//i.test(x) ? x : null; };
  // pop-cols inline no mesmo upsert (a reordenação em 2 upserts dava 23502 —
  // o 2º upsert só-pop-cols fazia INSERT sem name quando o ON CONFLICT não
  // batia; e a janela de inconsistência que resolveria é benigna: o app.html
  // usa as ofertas embebidas, não min_price. Auditoria 2026-07-24).
  // fora do catálogo o que não é cosmética (auditado 2026-07-25) — a montra, a
  // pesquisa e as categorias do app.html ficam só com cosmética a sério.
  // Nomes PT (2026-07-28): a BD servia os nomes originais em ES/FR das lojas
  // estrangeiras, que o site já mostra traduzidos. ORDEM CRÍTICA — o
  // isNonCosmetic e o fixCategory abaixo correm sobre o nome ORIGINAL (p.name);
  // a tradução entra só no campo `name` que vai para a BD. Trocar a ordem
  // partiria a classificação (ver scripts/lib/name-translations.js).
  // limpeza de nomes (2026-07-29): entidades HTML, loja colada no fim e
  // reticências — o mesmo overlay que o site aplica. Corre ANTES da tradução e
  // do search_norm, para a BD guardar (e indexar) o nome já limpo.
  // (2026-10-02) com o contexto do catálogo: repara "�" e MAIÚSCULAS como o
  // índice dos cartões, para a ficha mostrar o mesmo nome. A categoria e o
  // filtro de cosmética continuam a ler o nome original.
  const limparNome = require("./lib/name-cleanup").criarLimpezaDeNomes(seed);
  const nomesPT = loadNameTranslations(ROOT);
  let traduzidos = 0;
  const products = (seed.products || []).filter(p => p.ean && p.name && !isNonCosmetic(p.name)).map(p => {
    const nomeLimpo = limparNome(p.name);
    const nomePT = nomesPT[p.ean] && nomesPT[p.ean] !== nomeLimpo ? (traduzidos++, nomesPT[p.ean]) : nomeLimpo;
    const base = {
      ean: p.ean, name: nomePT, brand: p.brand || null, category: fixCategory(p.name, p.category),
      image_url: safeUrl(p.image_url), updated_at: runTs,
    };
    if (hasPopCols) {
      const e = pop[p.ean];
      base.n_stores = e ? e.stores.size : 0;
      base.min_price = e && isFinite(e.min) ? e.min : null;
      base.min_price_store = e ? e.minStore : null;
      if (hasPromoCols) base.max_price = e && e.max > 0 ? e.max : null;
    }
    // texto pesquisável sem acentos — usa o nome JÁ TRADUZIDO (é o que o
    // utilizador vê e escreve) + a marca.
    if (hasSearchNorm) base.search_norm = productSearchNorm({ name: nomePT, brand: p.brand });
    return base;
  });
  if (traduzidos) console.log(`  nomes traduzidos para PT: ${traduzidos} (o site já os mostrava assim)`);
  const eanSet = new Set(products.map(p => p.ean));
  const storeSet = new Set(stores.map(s => s.slug));   // FK offers.store_slug (auditoria)

  const offers = [];
  let semLoja = 0;
  for (const g of seed.store_products || []) {
    if (!storeSet.has(g.store_slug)) { semLoja += (g.items || []).length; continue; }   // FK: loja tem de existir em stores
    for (const it of g.items || []) {
      if (!it.ean || !eanSet.has(it.ean) || !(it.price > 0)) continue;
      if (blocked.has(g.store_slug + '|' + it.ean)) continue;
      offers.push({
        store_slug: g.store_slug, ean: it.ean,
        price: it.price, previous_price: it.previous_price ?? null,
        discount_pct: it.discount_pct != null ? Math.round(it.discount_pct) : null,
        in_stock: it.in_stock !== false, url: safeUrl(it.url),
        verified_at: it.verified_at || null, synced_at: runTs,
        // criados pelo overlay promo-fold (não existem no seed em disco):
        // a etiqueta "🎁 +15ml grátis" e a marca de pack multi-unidade.
        ...(hasPromoCols ? { promo_note: it.promo_note ?? null, promo_pack: !!it.promo_pack } : {}),
      });
    }
  }

  // variantes de volume: melhor preço por (loja, ean, volume) — migration 006;
  // deteção da tabela como as colunas de popularidade (degrada sem ela).
  let hasVariants = false;
  if (URL_ && KEY) {
    try {
      const r = await fetch(`${URL_}/rest/v1/offer_variants?select=ean&limit=0`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }, signal: AbortSignal.timeout(15000) });
      hasVariants = r.status < 400;
    } catch { /* mantém false */ }
    console.log(`  tabela offer_variants (migration 006): ${hasVariants ? 'presente ✓' : 'ausente — sync sem variantes (aplicar 006)'}`);
  }
  const variants = [];
  if (hasVariants) {
    const offerKey = new Set(offers.map(o => o.store_slug + '|' + o.ean));
    const bestVar = new Map();   // store|ean|ml → melhor
    for (const g of seed.store_products || []) {
      for (const it of g.items || []) {
        if (!it.ean || !eanSet.has(it.ean)) continue;
        if (!offerKey.has(g.store_slug + '|' + it.ean)) continue;   // FK: só variantes de ofertas presentes
        for (const v of (it.variants || [])) {
          const ml = Math.round(Number(v.volume_ml) || 0);
          if (!(ml > 0) || !(v.price > 0)) continue;
          const k = g.store_slug + '|' + it.ean + '|' + ml;
          const cur = bestVar.get(k);
          if (!cur || v.price < cur.price) bestVar.set(k, {
            store_slug: g.store_slug, ean: it.ean, volume_ml: ml, price: v.price,
            url: safeUrl(v.url) || safeUrl(it.url), in_stock: v.in_stock !== false, synced_at: runTs,
            // preço riscado / "−X%" ao volume escolhido, dentro da folha de comparação
            ...(hasPromoCols ? { previous_price: v.previous_price ?? null } : {}),
          });
        }
      }
    }
    // ⚠️ NUNCA variants.push(...bestVar.values()): o "..." passa cada elemento
    // como um argumento, e acima de ~120 mil o V8 rebenta com "Maximum call
    // stack size exceeded". Foi o que parou o db-sync a 2026-09-30, quando a
    // Loja do Shampoo (+11 mil ofertas) levou as variantes para lá do limite.
    for (const v of bestVar.values()) variants.push(v);
  }

  // DEDUPE por PK antes de enviar (auditoria 2026-07-24): uma PK repetida no
  // MESMO lote faz o PostgREST abortar ("cannot affect row a second time").
  const dedupe = (rows, keyFn, pick) => {
    const m = new Map();
    for (const r of rows) { const k = keyFn(r); const cur = m.get(k); if (!cur || (pick && pick(r, cur))) m.set(k, r); }
    return [...m.values()];
  };
  const products2 = dedupe(products, p => p.ean);
  const stores2 = dedupe(stores, s => s.slug);
  const offers2 = dedupe(offers, o => o.store_slug + '|' + o.ean, (r, c) => r.price < c.price);
  const variants2 = dedupe(variants, v => v.store_slug + '|' + v.ean + '|' + v.volume_ml, (r, c) => r.price < c.price);
  const dupN = (products.length - products2.length) + (offers.length - offers2.length) + (variants.length - variants2.length);
  if (dupN) console.log(`  dedupe: ${dupN} PKs repetidas removidas`);

  if (semLoja) console.log(`  ⚠ ${semLoja} ofertas de lojas ausentes de seed.stores — ignoradas (FK)`);
  console.log(`📦 payloads: ${stores2.length} lojas · ${products2.length} produtos · ${offers2.length} ofertas · ${variants2.length} variantes (blocklist aplicada)`);
  // ── SYNC INCREMENTAL (2026-10-02) ───────────────────────────────────────
  // Só se envia o que mudou desde o último sync bem-sucedido e apaga-se PELO
  // NOME o que saiu (ver scripts/lib/db-sync-estado.js). --completo força o
  // comportamento antigo (reescrever tudo + limpar por carimbo).
  const E = require('./lib/db-sync-estado');
  const projeto = URL_ || 'sem-projeto';
  const payloads = { stores: stores2, products: products2, offers: offers2, offer_variants: hasVariants ? variants2 : null };
  const PK = { stores: 'slug', products: 'ean', offers: 'store_slug,ean', offer_variants: 'store_slug,ean,volume_ml' };
  let anterior = null, criadoEm = null, modo = 'COMPLETO';
  if (!args.completo) {
    const { estado, motivo } = E.carregar(projeto);
    if (estado) { anterior = estado.tabelas; criadoEm = estado.criado_em; modo = 'incremental (estado do último sync)'; }
    else {
      console.log(`  estado: ${motivo}`);
      if (!DRY && URL_ && KEY) {
        try {
          const colunas = Object.fromEntries(Object.entries(payloads).map(([t, rows]) => [t, rows && rows.length ? Object.keys(rows[0]) : null]));
          anterior = await E.lerDaBD(URL_, KEY, colunas);
          criadoEm = new Date().toISOString(); modo = 'incremental (estado lido da BD)';
        } catch (e) { console.warn(`  ⚠ não consegui ler o estado da BD (${e.message}) — sync COMPLETO desta vez.`); anterior = null; }
      }
    }
  }
  const dif = {};
  for (const [t, rows] of Object.entries(payloads)) if (rows) dif[t] = E.diferencas(t, rows, anterior && anterior[t] ? anterior[t] : null);
  console.log(`🔁 sync ${modo}: ` + Object.entries(dif).map(([t, d]) => `${t} ${d.enviar.length}/${payloads[t].length} a enviar · ${d.apagar.length} a apagar`).join(' | '));

  if (DRY) {
    if (args['gravar-estado']) console.log(`  estado gravado (${(E.guardar(projeto, Object.fromEntries(Object.entries(dif).map(([t, d]) => [t, d.atual]))) / 1048576).toFixed(1)} MB)`);
    console.log('🧪 --dry-run: nada enviado.'); return;
  }
  if (!URL_ || !KEY) { console.log('ℹ Sem SUPABASE_URL/SERVICE_KEY — sync saltado (Fase 1 ainda não ativada).'); return; }

  // GUARDRAIL anti-apagão (auditoria): se o seed vier truncado (scraper de uma
  // loja grande falhou → vaga parcial), a semântica-espelho apagaria milhares
  // de ofertas vivas da BD pública. Se o payload tem < 80% do que a BD já tem,
  // fazemos os UPSERTS mas SALTAMOS as limpezas (ofertas stale sobrevivem 1
  // ciclo — muito melhor que apagar uma loja inteira).
  // FALHA FECHADA (auditoria 2026-07-25): sem count fiável → NÃO se limpa nada
  // e diz-se porquê (este endpoint já devolveu 500 com a BD em apuros).
  // (select=ean em vez de select=count: o agregado obriga a dois varrimentos
  // completos da tabela e é o que provoca os timeouts.)
  let skipPurge = false;
  try {
    const rc = await fetch(`${URL_}/rest/v1/offers?select=ean`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact', Range: '0-0' }, signal: AbortSignal.timeout(20000) });
    const cr = rc.headers.get('content-range');
    const countBD = rc.ok && cr ? (parseInt(cr.split('/')[1], 10) || 0) : NaN;
    if (!Number.isFinite(countBD) || countBD === 0) {
      skipPurge = true;
      console.warn(`  ⛔ GUARDRAIL: não consegui contar as ofertas na BD (HTTP ${rc.status}${cr ? '' : ', sem content-range'}) — limpezas SALTADAS por precaução.`);
    } else if (countBD > 1000 && offers2.length < 0.8 * countBD) {
      skipPurge = true;
      console.log(`  ⛔ GUARDRAIL: payload ${offers2.length} < 80% da BD (${countBD}) — seed truncado? UPSERTS sim, limpezas SALTADAS.`);
    }
  } catch (e) {
    skipPurge = true;
    console.warn(`  ⛔ GUARDRAIL: falha a contar as ofertas na BD (${e.message}) — limpezas SALTADAS por precaução.`);
  }

  for (const t of ['stores', 'products', 'offers', 'offer_variants']) {
    if (dif[t] && dif[t].enviar.length) await upsert(t, dif[t].enviar, PK[t]);
    else if (dif[t]) console.log(`  = ${t}: nada mudou`);
  }

  // o estado a guardar no fim: o que ficou na BD
  const novo = Object.fromEntries(Object.entries(dif).map(([t, d]) => [t, d.atual]));
  const manter = (t, chaves) => { for (const k of chaves) novo[t][k] = anterior[t][k]; };   // continuam na BD

  if (anterior) {
    // incremental: apagar pelo nome. Ordem por FK: variantes → ofertas → produtos.
    // As lojas nunca se apagam (o ON DELETE CASCADE levaria as ofertas todas).
    if (dif.stores) manter('stores', dif.stores.apagar);
    if (skipPurge) {
      console.log('  ⛔ limpezas saltadas pelo guardrail — ficam no estado para a próxima corrida.');
      for (const t of ['offer_variants', 'offers', 'products']) if (dif[t] && anterior[t]) manter(t, dif[t].apagar);
    } else {
      for (const t of ['offer_variants', 'offers', 'products']) {
        if (!dif[t] || !dif[t].apagar.length) continue;
        const n = await E.apagarPorChave(URL_, KEY, t, dif[t].apagar);
        console.log(`  ✓ apagadas de ${t}: ${dif[t].apagar.length} linhas que saíram (${n} pedidos)`);
      }
    }
  } else {
    // completo: tudo foi reescrito com o carimbo deste run → limpar pelo carimbo,
    // como antes. Status VERIFICADO (auditoria 2026-07-24): um DELETE que falha
    // aborta o sync em vez de terminar com "✓ completo".
    async function purge(table, col) {
      const r = await fetch(`${URL_}/rest/v1/${table}?${col}=lt.${encodeURIComponent(runTs)}`, {
        method: 'DELETE', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'return=minimal' }, signal: AbortSignal.timeout(60000),
      });
      if (r.status >= 400) throw new Error(`limpeza ${table}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
      console.log(`  limpeza ${table} saídas: HTTP ${r.status} ✓`);
    }
    if (skipPurge) {
      console.log('  ⛔ limpezas saltadas pelo guardrail (ofertas stale sobrevivem 1 ciclo).');
    } else {
      if (hasVariants) await purge('offer_variants', 'synced_at');
      await purge('offers', 'synced_at');
      // produtos-fantasma: um produto que saiu do seed nunca era apagado e ficava
      // no topo do catálogo com n_stores/min_price congelados (auditoria).
      await purge('products', 'updated_at');
    }
  }

  // Guardar o estado SÓ no fim de um sync que correu todo. Num sync completo com
  // as limpezas saltadas a BD tem linhas que o estado não conhece — não guardar,
  // e a próxima corrida volta a ler a BD.
  if (anterior || !skipPurge) {
    const bytes = E.guardar(projeto, novo, criadoEm);
    console.log(`  estado guardado para o próximo sync: ${(bytes / 1048576).toFixed(1)} MB`);
  }

  // verificação: contagens na BD
  for (const t of ['stores', 'products', 'offers']) {
    const r = await fetch(`${URL_}/rest/v1/${t}?select=count`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact', Range: '0-0' } });
    console.log(`  BD ${t}: ${r.headers.get('content-range')}`);
  }
  console.log('✓ sync completo.');
})().catch(e => { console.error('✗ sync falhou:', e.message); process.exit(1); });
