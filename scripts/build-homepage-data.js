#!/usr/bin/env node
/**
 * Build homepage data — extrai ~25 produtos curados do seed completo
 * (18 577 produtos) para injectar na homepage estática.
 *
 * Output: data/homepage-data.json (~50 KB em vez de 10 MB)
 *
 * Estrutura:
 * {
 *   hero_sponsored: [Product × 5],     // EANs curados
 *   bestsellers:    [Product × 5],     // Top 5 por nº de lojas
 *   skincare_kits:  [Product × 5],     // Filtrar kit/cofre/set/pack
 *   em_alta:        [Product × 5],     // 1 featured + 4 patrocinados
 *   top_brands:     [String × 6],      // Top 6 marcas por contagem
 * }
 *
 * Cada Product traz: ean, name, brand, image_url, best_offer (price, store, url)
 */

const fs = require('fs');
const path = require('path');
const { isNonCosmetic } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const OUT = path.join(ROOT, 'data', 'homepage-data.json');

// EANs validados — todos têm ofertas scraped reais (verificado 2026-05-22).
// Quando integrarmos Notino/Sephora (perfumarias), trocar para EANs YSL/Dior reais.
const SPONSORED_EANS = [
  '3337875863377', // LRP Effaclar Duo +M (Druni + Easyfarma)
  '3614274772012', // Lancôme Cofre Génifique Ultimate Serum (Druni)
  '0887167667501', // Estée Lauder ANR Edición Limitada (Druni)
  '3337875762908', // Vichy Minéral 89 Probiotic Fractions (Druni)
  '3401395614172', // Bioderma Sensibio H2O Água Micelar (Druni + Easyfarma + Sweetcare)
];

const EM_ALTA_EANS = [
  '3401395614172', // Bioderma Sensibio H2O (featured big)
  '3337875798181', // LRP Anthelios 100 Ka+Med
  '8431567644116', // Vichy Cofre Mineral 89
  '3337875549493', // LRP Effaclar Duo+ SPF30
  '3337875863377', // LRP Effaclar Duo +M
];

const KIT_KEYWORDS = /\b(kit|cofre|set|pack|estuche|conjunto|coffret|bundle|trio|duo)\b/i;

function stripVolume(name) {
  return String(name || '').replace(/\s*\d+(?:[.,]\d+)?\s*(?:ml|gr|g|kg|l)\b/gi, '').trim();
}

// ── Consistência de VOLUME (réplica de refVolumeFor/offerPriceAtVol do demo) ─
// Sem isto, um produto multi-tamanho mostrava "desde 3.49€" (100ml da atida)
// na hero de um frasco de 500ml. Mostramos SEMPRE o preço ao volume de
// referência (o do nome do produto, senão o mais oferecido pelas lojas).
function _volFromName(name) {
  if (!name) return null;
  const m = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.')), u = m[2].toLowerCase();
  return (u === 'l' || u === 'kg') ? n * 1000 : n;
}
function refVolumeFor(seed, ean) {
  const p = seed.products.find(x => x.ean === ean);
  const fromName = _volFromName(p && p.name);
  if (fromName) return fromName;
  const vc = {};
  for (const sp of seed.store_products)
    for (const it of sp.items)
      if (it.ean === ean && it.in_stock)
        for (const v of (it.variants || []))
          if (v.price > 0 && v.volume_ml) vc[v.volume_ml] = (vc[v.volume_ml] || 0) + 1;
  const top = Object.entries(vc).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  return top ? Number(top[0]) : null;
}
function offerPriceAtVol(item, refVol) {
  if (!refVol || !item.variants || !item.variants.length) return item.price;
  const ex = item.variants.find(v => v.volume_ml === refVol && v.price > 0 && v.in_stock !== false);
  return ex ? ex.price : null;
}

function bestOfferFor(seed, ean) {
  // MÍNIMO ABSOLUTO (qualquer volume) — decisão do user 2026-07-03: o "desde"
  // é o preço mais baixo real da oferta viva, mesmo que seja o tamanho pequeno
  // (estratégia de marketing). A comparação por volume vive no modal.
  let best = null;
  for (const sp of seed.store_products) {
    const item = sp.items.find(i => i.ean === ean && i.in_stock);
    if (!item || item.price == null) continue;
    const hasReal = item.verified === true
      || /scraped|canonical/i.test(item.source || '')
      || (item.variants && item.variants.some(v => v.price > 0));
    if (!hasReal) continue;
    const cands = [];
    if (item.price > 0) cands.push({ price: item.price, url: item.url });
    for (const v of (item.variants || [])) if (v.price > 0 && v.in_stock !== false) cands.push({ price: v.price, url: v.url || item.url });
    for (const c of cands) {
      if (!best || c.price < best.price) {
        const store = seed.stores.find(s => s.slug === sp.store_slug);
        best = { price: c.price, store_slug: sp.store_slug, store_name: store?.name || sp.store_slug, url: c.url };
      }
    }
  }
  return best;
}

function countStores(seed, ean) {
  let n = 0;
  for (const sp of seed.store_products) {
    if (sp.items.some(i => i.ean === ean && i.in_stock)) n++;
  }
  return n;
}

function condenseProduct(seed, p) {
  if (!p) return null;
  const best = bestOfferFor(seed, p.ean);
  return {
    ean: p.ean,
    name: stripVolume(p.name),
    brand: p.brand,
    image_url: p.image_url || null,
    best_price: best?.price ?? null,
    best_store: best?.store_name ?? null,
    best_store_slug: best?.store_slug ?? null,
    best_url: best?.url ?? null,
  };
}

function condenseByEan(seed, eans) {
  return eans
    .map(ean => seed.products.find(p => p.ean === ean))
    .filter(Boolean)
    .map(p => condenseProduct(seed, p))
    .filter(p => p && p.best_price != null); // só com oferta válida
}

// ── Verificação AO VIVO de um candidato (caso Sensilis/Wells 2026-07-22) ─────
// A Wells serviu 9.36€ durante ~1 dia (flash/erro de backend; página real
// 19.06€) e o "Em alta" publicou a descida falsa. Antes de publicar, vamos à
// página da loja confirmar o preço (JSON-LD + metas, tolerância ±10%). Lojas
// que bloqueiam fetch simples não são verificáveis → candidato NÃO entra
// (só publicamos o que conseguimos provar).
const FETCH_BLOCKED = new Set(['sweetcare', 'atida', 'notino', 'perfumesclub', 'powerbeauty', 'sobeauty', 'smartbeauty', 'beleza37', 'druni']);
const LIVE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
async function livePricesFor(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': LIVE_UA, 'Accept-Language': 'pt-PT,pt;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const h = await r.text();
    const prices = [];
    for (const m of h.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
      try {
        const j = JSON.parse(m[1]);
        for (const o of (Array.isArray(j) ? j : [j])) {
          const offs = o && o.offers;
          if (!offs) continue;
          for (const of_ of (Array.isArray(offs) ? offs : [offs])) {
            for (const v of [of_.price, of_.lowPrice, of_.highPrice]) { const p = parseFloat(String(v).replace(',', '.')); if (p > 0) prices.push(p); }
          }
        }
      } catch { /* ld inválido */ }
    }
    for (const re of [/property=["']product:price:amount["'][^>]*content=["']([\d.,]+)/, /itemprop=["']price["'][^>]*content=["']([\d.,]+)/, /content=["']([\d.,]+)["'][^>]*itemprop=["']price["']/]) {
      const m = h.match(re); if (m) { const p = parseFloat(m[1].replace(',', '.')); if (p > 0) prices.push(p); }
    }
    return prices.length ? prices : null;
  } catch { return null; }
}

// ── "Em alta" = DESCIDAS DE PREÇO recentes (pedido do user 2026-07-21) ────────
// Lê data/price-history.json (séries [[dia, cêntimos, lojaIdx]] por EAN,
// gravado 1×/dia por record-price-history.js). Uma descida = a última entrada é
// menor que a anterior. FILTRAGEM ROBUSTA — as "maiores descidas" cruas são
// LIXO (a ampola laCabine bloqueada dava -84%; colisões de formato e lojas
// novas a aparecer dão -90%+). Só deixamos passar descidas CREDÍVEIS:
//   • chave é EAN real (ignora séries legadas por-URL);
//   • recente (≤ RECENT_DAYS);
//   • magnitude na banda 8–60% (fora = quase sempre artefacto de dados);
//   • o produto existe, tem imagem e uma oferta viva/fresca/não-bloqueada;
//   • a descida ainda está VIVA (o melhor preço atual ≈ o preço pós-descida —
//     senão já reverteu). Devolve previous_price + discount_pct para o render.
// Reforço SÓ para a montra (2026-07-25): o isNonCosmetic deixa passar
// puericultura/aparelhos — apareceu "Chicco Bomba de extração de leite
// elétrica" a -30% entre os candidatos. Num comparador de COSMÉTICA isso não
// pode encabeçar o "Em alta". Lista curta e literal de propósito (nada de
// palavras ambíguas que apanhem cosmética a sério).
const FORA_DA_MONTRA = /\b(bomba(s)? (de |tira[- ]?)?leite|tira[- ]?leite|extra(c|ç)[aã]o de leite|biber[aã]o|biberon|chupeta|tetina|term[oó]metro|esterilizador|fralda(s)?|leite infantil|papa infantil|teste de gravidez|preservativo(s)?|nebulizador|tensi[oó]metro|compressa(s)?|ligadura(s)?|gaze|penso(s)? r[aá]pido(s)?|seringa(s)?|agulha(s)?|algod[aã]o hidr[oó]filo|soro fisiol[oó]gico|luva(s)? (de |cir[uú]rgica)|m[aá]scara(s)? cir[uú]rgica(s)?|canadiana|meia(s)? de compress[aã]o|penso(s)?|adesivo(s)?|gummies|gomas|p[oó] de prote[ií]na|poudre de prot|prote[ií]nas? em p[oó]|gel nasal|spray nasal|soro nasal|descongestionante|afta(s)?|bolsa (de )?gel|quente\/frio|(faixa|cinta|banda|almofada|saco|bolsa|manta)s? t[ée]rmica?s?|joelheira|cotoveleira|tornozeleira|cinta abdominal|b[aá]lsamo peitoral|articula[çc][õo]es e m[uú]sculos)\b/i;

async function computeEmAlta(seed) {
  const HIST = path.join(ROOT, 'data', 'price-history.json');
  let hist;
  try { hist = JSON.parse(fs.readFileSync(HIST, 'utf8')); } catch { return null; }
  if (!hist || !hist.series) return null;
  const today = Math.floor(Date.now() / 86400000);
  const RECENT_DAYS = 10, MIN_PCT = 0.08, MAX_PCT = 0.55;
  // índice ean → ofertas (com o pool a 200, varrer o seed por candidato saía caro)
  const itensPorEan = new Map();
  for (const g of seed.store_products)
    for (const it of (g.items || [])) {
      if (!it.ean) continue;
      let a = itensPorEan.get(it.ean); if (!a) itensPorEan.set(it.ean, a = []);
      a.push(it);
    }
  // preços vivos ordenados por EAN (seed já sem blocklist neste ponto do main)
  const pricesFor = (ean) => {
    const a = [];
    for (const it of (itensPorEan.get(ean) || [])) {
      if (it.in_stock === false) continue;
      if (it.price > 0) a.push(it.price);
      for (const v of (it.variants || [])) if (v.price > 0 && v.in_stock !== false) a.push(v.price);
    }
    return a.sort((x, y) => x - y);
  };
  // melhor preço vivo NUM volume concreto (null se ninguém o vende)
  const precoNoVolume = (ean, ml) => {
    let min = null;
    for (const it of (itensPorEan.get(ean) || [])) {
      if (it.in_stock === false) continue;
      for (const v of (it.variants || [])) {
        if (v.in_stock === false || !(v.price > 0)) continue;
        if (Math.round(Number(v.volume_ml) || 0) !== ml) continue;
        if (min == null || v.price < min) min = v.price;
      }
    }
    return min;
  };
  // volumes com série própria no histórico (hist.vseries["ean|ml"])
  const volsPorEan = new Map();
  for (const k of Object.keys(hist.vseries || {})) {
    const i = k.lastIndexOf('|'); if (i < 0) continue;
    const ean = k.slice(0, i), ml = Number(k.slice(i + 1));
    if (!(ml > 0)) continue;
    let a = volsPorEan.get(ean); if (!a) volsPorEan.set(ean, a = []);
    a.push(ml);
  }
  // CONSISTÊNCIA DE VOLUME (2026-07-25, pedido do user): a hist.series[ean]
  // guarda o melhor preço do EAN entre TODOS os volumes — se a oferta mais
  // barata saltar do 400ml para o 100ml de viagem, isso aparece como "descida"
  // quando é só uma mudança de tamanho. Nas fichas MULTI-VOLUME passamos a ler
  // a hist.vseries["ean|ml"] (uma série por volume) e a comparar sempre dentro
  // do MESMO volume; mais abaixo exige-se ainda que o preço em montra seja
  // desse volume. Fichas de volume único mantêm a série global.
  const drops = [];
  const registaDescida = (ean, serie, ml) => {
    if (!Array.isArray(serie) || serie.length < 2) return;
    const last = serie[serie.length - 1], prev = serie[serie.length - 2];
    if (!last || !prev || last[0] < today - RECENT_DAYS) return;
    if (!(last[1] < prev[1])) return;
    const pct = 1 - last[1] / prev[1];
    if (pct < MIN_PCT || pct > MAX_PCT) return;
    drops.push({ ean, day: last[0], fromCents: prev[1], toCents: last[1], pct, volume_ml: ml || null });
  };
  for (const [ean, serie] of Object.entries(hist.series)) {
    if (!/^\d{12,14}$/.test(ean)) continue;
    const vols = volsPorEan.get(ean) || [];
    if (vols.length >= 2) {
      for (const ml of vols) registaDescida(ean, (hist.vseries || {})[ean + '|' + ml], ml);
    } else {
      registaDescida(ean, serie, null);
    }
  }
  // mais recentes primeiro; dentro do mesmo dia, maior descida primeiro
  // pedido do user (2026-07-25): "as maiores promoções têm de estar lá".
  // Antes ordenava por RECÊNCIA e o pool (40) enchia-se com as mais recentes —
  // as maiores descidas do dia nunca chegavam sequer a ser candidatas.
  drops.sort((a, b) => b.pct - a.pct || b.day - a.day);
  // 1ª passagem: candidatos que passam TODOS os filtros estáticos (até 14 —
  // alguns vão cair na verificação ao vivo)
  const cands = [], seen = new Set();
  for (const d of drops) {
    if (cands.length >= 200) break;  // pool larga: muitos caem na verificação ao vivo (lojas não-fetcháveis) ou na diversidade de marca
    if (seen.has(d.ean)) continue;
    const p = seed.products.find(x => x.ean === d.ean);
    if (!p || !p.image_url) continue;
    if (isNonCosmetic(p.name)) continue;             // sem brinquedos/puericultura
    if (FORA_DA_MONTRA.test(p.name)) continue;       // reforço da montra (ver topo)
    // pedido do user 2026-07-22: só entra quem é COMPARADO em ≥5 lojas — uma
    // descida validada por comparação ampla é muito mais fiável (e mais útil).
    if (countStores(seed, d.ean) < 5) continue;
    const cp = condenseProduct(seed, p);
    if (!cp || cp.best_price == null) continue;
    const liveCents = Math.round(cp.best_price * 100);
    if (liveCents > d.toCents * 1.15) continue;      // já reverteu/subiu
    const prevPrice = d.fromCents / 100;
    if (!(cp.best_price < prevPrice)) continue;
    // guarda anti-colisão de formato: se há ≥2 vendedores e o mais barato é
    // < 55% do 2º mais barato, o "preço" é quase de certeza um mini/amostra
    // colado ao EAN do tamanho grande (não uma descida real).
    const prices = pricesFor(d.ean);
    if (prices.length >= 2 && cp.best_price < 0.55 * prices[1]) continue;
    // descida medida num volume concreto → o preço que vamos MOSTRAR tem de
    // ser desse mesmo volume, senão anunciávamos a descida de um tamanho com
    // o preço de outro (era exactamente a queixa do user).
    if (d.volume_ml) {
      const pv = precoNoVolume(d.ean, d.volume_ml);
      if (pv == null) continue;
      if (Math.abs(pv - cp.best_price) / pv > 0.02) continue;
      cp.volume_ml = d.volume_ml;
    }
    cp.previous_price = Number(prevPrice.toFixed(2));
    cp.discount_pct = Math.round(d.pct * 100);
    cp.dropped_day = d.day;
    cands.push(cp); seen.add(d.ean);
  }
  // 2ª passagem: VERIFICAÇÃO AO VIVO do preço reclamado (caso Sensilis/Wells:
  // a loja serviu um preço-fantasma 1 dia e nós publicámo-lo). Só entra quem
  // conseguimos confirmar na página da loja (±10%). Loja não-fetchável → fora.
  // ANTES isto era um PORTEIRO: com < 3 confirmados ao vivo devolvia null e a
  // montra caía nos 5 EANs curados. Como a maioria das lojas não é fetchável no
  // CI, ficou meses nos MESMOS 5 produtos (queixa do user, 2026-07-25). Agora é
  // uma PREFERÊNCIA:
  //   • quem FALHA a verificação ao vivo continua a ser DESCARTADO (a defesa
  //     anti-preço-fantasma do caso Sensilis/Wells mantém-se intacta);
  //   • quem nunca chegou a ser tentado (loja não-fetchável ou orçamento de
  //     rede esgotado) fica em RESERVA e pode preencher os lugares restantes —
  //     já passou os filtros estáticos, que são exigentes: >=5 lojas, 8-55%,
  //     não-revertido, anti-colisão de formato, e main() já deitou fora ofertas
  //     podres (>=7d) e fantasmas ANTES de chegarmos aqui;
  //   • os verificados vêm sempre primeiro, por isso o slot 0 (o que dá o
  //     título "promoções verificadas" à secção) é verificado sempre que exista.
  const ALVO = 5, MAX_POR_MARCA = 2, MAX_FETCHES = 25;
  const cabe = (cp, lista) => lista.length < ALVO &&
    lista.filter(x => String(x.brand || '').toLowerCase() === String(cp.brand || '').toLowerCase()).length < MAX_POR_MARCA;
  const verificados = [], reserva = [];
  let fetches = 0;
  for (const cp of cands) {
    if (verificados.length >= ALVO) break;
    if (!cp.best_url || FETCH_BLOCKED.has(cp.best_store_slug) || fetches >= MAX_FETCHES) { reserva.push(cp); continue; }
    fetches++;
    const lp = await livePricesFor(cp.best_url);
    const ok = lp && lp.some(p => Math.abs(p - cp.best_price) / cp.best_price <= 0.10);
    if (!ok) {
      console.log(`    em-alta: ✗ ${cp.ean} @${cp.best_store_slug} seed=${cp.best_price}€ live=[${(lp || []).slice(0, 3).join(',')}] — descartado`);
      continue;   // falhou a prova → fora de vez (NÃO vai para reserva)
    }
    cp.verified_live = true;
    if (cabe(cp, verificados)) verificados.push(cp);
  }
  const out = verificados.slice();
  for (const cp of reserva) { if (!cabe(cp, out)) continue; out.push(cp); }
  console.log(`    em-alta: ${verificados.length} verificados ao vivo + ${out.length - verificados.length} de reserva = ${out.length}/${ALVO}`);
  return out.length ? out : null;   // só sem NENHUM candidato é que cai no curado
}

(async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));

  // ── UNIFORMIDADE com o render (2026-07-03): aplicar os MESMOS overlays do
  // inject antes de escolher best offers — sem isto a homepage mostrava
  // preços-fantasma/podres que o site principal já esconde (ex.: Effaclar
  // 11.61 do bairro, produto removido da loja).
  try {
    const BL = path.join(ROOT, 'data', 'offer-ean-blocklist.json');
    if (fs.existsSync(BL)) {
      const blocked = new Set((JSON.parse(fs.readFileSync(BL, 'utf8')).blocked || []).map(b => `${b.store_slug}|${b.ean}`));
      for (const sp of seed.store_products) sp.items = sp.items.filter(it => !blocked.has(`${sp.store_slug}|${it.ean}`));
    }
  } catch { /* sem blocklist */ }
  try {
    const { dropGhostOffers } = require('./lib/ghost-offers');
    dropGhostOffers(seed);
  } catch { /* sem cache de fantasmas */ }
  (function dropRotten() {   // oferta >=7d atrás do refresh da própria loja
    const DAY = 864e5;
    const ageOf = it => { let t = +new Date(it.verified_at || 0); for (const v of (it.variants || [])) { const tv = +new Date(v.verified_at || 0); if (tv > t) t = tv; } return t; };
    for (const sp of seed.store_products) {
      let freshest = 0;
      for (const it of sp.items) { const t = ageOf(it); if (t > freshest) freshest = t; }
      if (!freshest) continue;
      sp.items = sp.items.filter(it => { const t = ageOf(it); if (!t) return true; return (freshest - t) <= 7 * DAY; });
    }
  })();
  console.log(`📦 Seed: ${seed.products.length} produtos`);

  // 1) Hero = TOP MAIS PROCURADOS (pedido do user 2026-07-21). Semeado por
  // data/popular-searches.json (Google Suggest PT → build-popular-searches.js,
  // 2×/semana; substituído pelo tracking real quando o site tiver tráfego).
  // Re-condensado contra o seed atual p/ preços frescos. Fallback aos curados.
  let popularEans = null;
  try {
    const pj = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'popular-searches.json'), 'utf8'));
    popularEans = (pj.products || []).map(p => p.ean).filter(Boolean);
  } catch { /* sem ficheiro → fallback */ }
  const heroSponsored = popularEans && popularEans.length ? condenseByEan(seed, popularEans).slice(0, 5) : [];
  const nPopular = heroSponsored.length;
  // Guardamos 8 EANs populares mas alguns podem perder oferta viva num refresh
  // futuro — TOPAR sempre até 5 com os curados p/ o hero nunca ficar curto.
  if (heroSponsored.length < 5) {
    const have = new Set(heroSponsored.map(p => p.ean));
    for (const p of condenseByEan(seed, SPONSORED_EANS)) {
      if (heroSponsored.length >= 5) break;
      if (!have.has(p.ean)) { heroSponsored.push(p); have.add(p.ean); }
    }
  }
  console.log(`  Hero: ${heroSponsored.length}/5 (${nPopular} mais-procurados${nPopular < 5 ? ` + ${heroSponsored.length - nPopular} curados` : ''})`);

  // 1b) Em alta — DESCIDAS DE PREÇO recentes (fallback aos EANs curados se o
  // histórico não der ≥3 descidas credíveis). Computado cedo p/ excluir dos
  // bestsellers/kits.
  const emAlta = (await computeEmAlta(seed)) || condenseByEan(seed, EM_ALTA_EANS);
  const emAltaSource = emAlta && emAlta[0] && emAlta[0].discount_pct != null ? 'descidas' : 'curado (fallback)';
  console.log(`  Em alta: ${emAlta.length}/5 (${emAltaSource})`);

  // 2) Bestsellers — top 5 por nº de lojas (excluindo já no hero/em-alta)
  const usedEans = new Set([...heroSponsored.map(p => p.ean), ...emAlta.map(p => p.ean)]);
  const candidates = seed.products
    .filter(p => !usedEans.has(p.ean) && p.image_url) // só com imagem
    .map(p => ({ p, n: countStores(seed, p.ean) }))
    .sort((a, b) => b.n - a.n);
  const bestsellersRaw = candidates.slice(0, 5).map(c => c.p);
  bestsellersRaw.forEach(p => usedEans.add(p.ean));
  const bestsellers = bestsellersRaw.map(p => condenseProduct(seed, p)).filter(p => p?.best_price != null);
  console.log(`  Bestsellers: ${bestsellers.length}/5`);

  // 3) Skincare kits — filtrar por keyword + ter imagem
  const kitCandidates = seed.products
    .filter(p => !usedEans.has(p.ean) && KIT_KEYWORDS.test(p.name) && p.image_url)
    .map(p => ({ p, n: countStores(seed, p.ean) }))
    .sort((a, b) => b.n - a.n);
  const kitsRaw = kitCandidates.slice(0, 5).map(c => c.p);
  kitsRaw.forEach(p => usedEans.add(p.ean));
  const skincareKits = kitsRaw.map(p => condenseProduct(seed, p)).filter(p => p?.best_price != null);
  console.log(`  Skincare kits: ${skincareKits.length}/5`);

  // 5) Top brands — top 6 por nº de produtos
  const brandCount = {};
  for (const p of seed.products) brandCount[p.brand] = (brandCount[p.brand] || 0) + 1;
  const topBrands = Object.entries(brandCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([brand, n]) => ({ name: brand, products: n }));
  console.log(`  Top brands: ${topBrands.length}`);

  // 6) Telegram alerts — top 3 produtos com desconto real
  // Filtra ofertas com discount_pct > 0, escolhe 3 diferentes (1 produto cada)
  const discountAlerts = [];
  const seenProductsForAlerts = new Set();
  for (const sp of seed.store_products) {
    for (const item of sp.items) {
      if (!item.in_stock || !item.discount_pct || item.discount_pct < 10) continue;
      if (!item.previous_price || item.previous_price <= item.price) continue;
      if (seenProductsForAlerts.has(item.ean)) continue;
      const product = seed.products.find(p => p.ean === item.ean);
      if (!product) continue;
      const store = seed.stores.find(s => s.slug === sp.store_slug);
      discountAlerts.push({
        ean: item.ean,
        brand: product.brand,
        name: stripVolume(product.name),
        store: store?.name || sp.store_slug,
        price: item.price,
        previous_price: item.previous_price,
        discount_pct: Math.round(item.discount_pct),
      });
      seenProductsForAlerts.add(item.ean);
      if (discountAlerts.length >= 12) break;
    }
    if (discountAlerts.length >= 12) break;
  }
  discountAlerts.sort((a, b) => b.discount_pct - a.discount_pct);
  const telegramAlerts = discountAlerts.slice(0, 3);
  console.log(`  Telegram alerts: ${telegramAlerts.length}/3 (de ${discountAlerts.length} candidatos com >=10% desconto)`);

  const out = {
    generated_at: new Date().toISOString(),
    seed_total_products: seed.products.length,
    hero_sponsored: heroSponsored,
    bestsellers,
    skincare_kits: skincareKits,
    em_alta: emAlta,
    top_brands: topBrands,
    telegram_alerts: telegramAlerts,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`\n✓ ${OUT.replace(ROOT, '.')} (${kb} KB)`);
})();
