#!/usr/bin/env node
/**
 * CosMath — Audit de IMAGENS dos produtos
 * ============================================================
 * v2 (2026-07-22, pedido do user): auditoria ao catálogo INTEIRO — produtos
 * sem imagem E imagens "desformatadas" (mortas, não-imagem, minúsculas,
 * placeholders, rácio absurdo). v1 (2026-07-14) cobria só o top-N visível.
 *
 * Fontes de substituição:
 *   1. catálogos por URL de oferta (v1 — qualidade curada por loja);
 *   2. NOVO: índice por EAN de TODOS os data/catalog/*.json (fallback amplo).
 * Prioridade (qualidade típica): farmaciapt > sweetcare > druni > notino >
 * wells > bairro-saude > mycosmetics > resto. image_url no seed é sticky.
 *
 * Verificação live (com cache incremental data/image-check.json — nunca
 * re-verifica um OK com <30 dias; qualquer veredicto <7 dias não repete):
 *   GET Range 0-16KB → status, content-type, magic bytes (JPEG/PNG/GIF/WebP/
 *   AVIF) e DIMENSÕES (SOF/IHDR/…) → veredicto:
 *     dead | not-image | placeholder (<1200B) | tiny (<60px) |
 *     distorted (rácio >3.5) | ok | error (rede — não decidir)
 *
 * Uso:
 *   node scripts/audit-product-images.js                    # top 100 (v1)
 *   node scripts/audit-product-images.js --all              # estática completa
 *   node scripts/audit-product-images.js --all --live --max=6000
 *   node scripts/audit-product-images.js --all --apply      # aplica substituições
 *   node scripts/audit-product-images.js --ean=…,…
 * Escreve data/image-audit.json (relatório) sempre.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const CACHE_FILE = path.join(ROOT, 'data', 'image-check.json');
const OUT_FILE = path.join(ROOT, 'data', 'image-audit.json');
const DAY = 864e5;

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const APPLY = !!args.apply;
const ALL = !!args.all;
const LIVE = !!args.live || !ALL;   // no modo v1 (top-N) verifica sempre como antes
const TOP = args.top ? parseInt(args.top, 10) : 100;
const MAX = args.max ? parseInt(args.max, 10) : 6000;
const ONLY_EANS = args.ean ? String(args.ean).split(',').map(s => s.trim()) : null;
const CONC = args.concurrency ? parseInt(args.concurrency, 10) : 8;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const BAD_URL_RE = /placeholder|no-?image|noimage|default\.(png|jpg)|image-coming|sem-?imagem|blank\.|spacer\./i;

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
const PRIORITY = ['farmaciapt', 'sweetcare', 'druni', 'notino', 'wells', 'bairro-saude', 'mycosmetics',
  'atida', 'cocooncenter', 'farmacia365', 'saudemayor', 'aveirofarma'];
const prio = (slug) => { const i = PRIORITY.indexOf(slug); return i === -1 ? 99 : i; };

const _cat = {};
function catalogByUrl(slug) {
  if (!(slug in _cat)) {
    _cat[slug] = null;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalog', CATALOG_FILE[slug] + '.json'), 'utf8'));
      const idx = new Map();
      for (const p of (d.products || d)) if (p.url) idx.set(p.url, p);
      _cat[slug] = idx;
    } catch { /* sem catálogo */ }
  }
  return _cat[slug];
}

// NOVO: índice EAN→[{slug, img}] de TODOS os ficheiros de catálogo (fallback)
let _eanIdx = null;
function eanImgIndex() {
  if (_eanIdx) return _eanIdx;
  _eanIdx = new Map();
  if (!fs.existsSync(CATALOG_DIR)) return _eanIdx;
  for (const f of fs.readdirSync(CATALOG_DIR).filter(f => f.endsWith('.json'))) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, f), 'utf8')); } catch { continue; }
    const slug = f.replace(/(-full|-chunk-\d+-\d+)?\.json$/, '');
    for (const p of ((d && (d.products || d.items)) || [])) {
      const ean = p.ean || p.gtin13;
      const img = p.image_url || p.image;
      if (!ean || !img || !/^https?:\/\//i.test(img) || BAD_URL_RE.test(img)) continue;
      const arr = _eanIdx.get(ean) || [];
      arr.push({ slug, img });
      _eanIdx.set(ean, arr);
    }
  }
  return _eanIdx;
}

// dimensões a partir dos primeiros bytes (best-effort; null = indeterminado)
function dimsFromBuffer(buf) {
  if (buf.length < 26) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), fmt: 'png' };
  if (buf[0] === 0x47 && buf[1] === 0x49) return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8), fmt: 'gif' };
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC)
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), fmt: 'jpeg' };
      const len = buf.readUInt16BE(i + 2);
      if (len < 2) break;
      i += 2 + len;
    }
    return { w: null, h: null, fmt: 'jpeg' };
  }
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    const four = buf.slice(12, 16).toString('ascii');
    if (four === 'VP8X' && buf.length >= 30) return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), fmt: 'webp' };
    if (four === 'VP8 ' && buf.length >= 30) return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff, fmt: 'webp' };
    if (four === 'VP8L' && buf.length >= 25) { const b = buf.readUInt32LE(21); return { w: 1 + (b & 0x3FFF), h: 1 + ((b >> 14) & 0x3FFF), fmt: 'webp' }; }
    return { w: null, h: null, fmt: 'webp' };
  }
  if (buf.slice(4, 8).toString('ascii') === 'ftyp') return { w: null, h: null, fmt: 'avif' };
  return null;
}

async function checkUrl(url, timeoutMs = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'GET', redirect: 'follow', signal: ctl.signal,
      headers: { Range: 'bytes=0-16383', 'User-Agent': UA, Accept: 'image/*,*/*' },
    });
    clearTimeout(t);
    if (r.status >= 400) { try { r.body?.cancel(); } catch {} return { v: 'dead', http: r.status }; }
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    const cr = r.headers.get('content-range');
    const total = cr ? parseInt((cr.split('/')[1] || ''), 10) : parseInt(r.headers.get('content-length') || '0', 10);
    const buf = Buffer.from(await r.arrayBuffer());
    const dims = dimsFromBuffer(buf);
    if (!dims && !ct.startsWith('image/')) return { v: 'not-image', http: r.status, ct: ct.slice(0, 40) };
    const size = total || buf.length;
    if (size > 0 && size < 1200) return { v: 'placeholder', bytes: size };
    if (dims && dims.w && dims.h) {
      if (Math.min(dims.w, dims.h) < 60) return { v: 'tiny', w: dims.w, h: dims.h };
      const ratio = Math.max(dims.w, dims.h) / Math.min(dims.w, dims.h);
      if (ratio > 3.5) return { v: 'distorted', w: dims.w, h: dims.h };
      return { v: 'ok', w: dims.w, h: dims.h };
    }
    return { v: 'ok' };
  } catch (e) {
    clearTimeout(t);
    return { v: 'error', err: (e && e.name === 'AbortError') ? 'timeout' : String(e && e.message || e).slice(0, 40) };
  }
}

(async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));
  const cache = (() => { try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { return { v: 1, checked: {} }; } })();

  const offersByEan = {};
  for (const sp of seed.store_products)
    for (const it of sp.items)
      (offersByEan[it.ean] ||= []).push({ slug: sp.store_slug, item: it });

  let selected;
  if (ONLY_EANS) selected = seed.products.filter(p => ONLY_EANS.includes(p.ean));
  else if (ALL) selected = seed.products;
  else selected = seed.products
    .map(p => ({ p, n: new Set((offersByEan[p.ean] || []).filter(o => o.item.in_stock).map(o => o.slug)).size }))
    .filter(x => x.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, TOP)
    .map(x => x.p);

  console.log(`🖼  Auditoria de imagens — ${selected.length} produtos (${ALL ? 'TODOS' : ONLY_EANS ? 'EANs dados' : 'top ' + TOP})…`);

  function replacementFor(ean, avoidUrl) {
    const cands = [];
    for (const { slug, item } of (offersByEan[ean] || [])) {
      const idx = catalogByUrl(slug);
      const e = idx && item.url && idx.get(item.url);
      const img = e && (e.image_url || e.image);
      if (img && /^https?:\/\//.test(img)) cands.push({ slug, img });
      for (const v of (item.variants || [])) {
        const ev = idx && v.url && idx.get(v.url);
        const vimg = ev && (ev.image_url || ev.image);
        if (vimg && /^https?:\/\//.test(vimg)) cands.push({ slug, img: vimg });
      }
    }
    for (const c of (eanImgIndex().get(ean) || [])) cands.push(c);   // fallback EAN
    const seen = new Set();
    const uniq = cands.filter(c => { if (c.img === avoidUrl || seen.has(c.img)) return false; seen.add(c.img); return true; });
    uniq.sort((a, b) => prio(a.slug) - prio(b.slug));
    return uniq[0] || null;
  }

  // ── ESTÁTICA: sem imagem + URLs suspeitos ──────────────────────────────────
  const semImagem = selected.filter(p => !p.image_url || !String(p.image_url).trim());
  const urlSuspeito = selected.filter(p => p.image_url && (BAD_URL_RE.test(p.image_url) || !/^https?:\/\//i.test(p.image_url) || /\s/.test(String(p.image_url))));
  let fixedMissing = 0, semSubstituta = 0;
  for (const p of semImagem) {
    const r = replacementFor(p.ean);
    if (r) { if (APPLY) p.image_url = r.img; fixedMissing++; }
    else semSubstituta++;
  }
  console.log(`  SEM imagem: ${semImagem.length} · ${APPLY ? 'preenchidas' : 'preenchíveis'} dos catálogos: ${fixedMissing} · sem substituta: ${semSubstituta}`);
  // suspeitos (placeholder da loja / URL relativo / malformado): substituir por
  // imagem real de outra fonte; sem substituta → LIMPAR (o fallback da inicial
  // da marca renderiza melhor que uma imagem partida/placeholder).
  let fixedSusp = 0, clearedSusp = 0;
  for (const p of urlSuspeito) {
    const r = replacementFor(p.ean, p.image_url);
    if (r) { if (APPLY) p.image_url = r.img; fixedSusp++; }
    else { if (APPLY) p.image_url = null; clearedSusp++; }
  }
  console.log(`  URL suspeito (placeholder/malformado): ${urlSuspeito.length} · ${APPLY ? 'substituídas' : 'substituíveis'}: ${fixedSusp} · ${APPLY ? 'limpas p/ fallback' : 'a limpar'}: ${clearedSusp}`);

  // ── LIVE (com cache incremental) ───────────────────────────────────────────
  const liveStats = { ok: 0, dead: 0, 'not-image': 0, tiny: 0, placeholder: 0, distorted: 0, error: 0 };
  let fixedBad = 0;
  if (LIVE) {
    const now = Date.now();
    const jobs = [];
    const seenUrl = new Set();
    for (const p of selected) {
      const u = p.image_url;
      if (!u || !/^https?:\/\//i.test(u) || seenUrl.has(u)) continue;
      seenUrl.add(u);
      const c = cache.checked[u];
      if (c && c.v === 'ok' && (now - c.at) < 30 * DAY) continue;
      if (c && (now - c.at) < 7 * DAY) continue;
      jobs.push(p);
      if (jobs.length >= MAX) break;
    }
    console.log(`  LIVE: ${jobs.length} URLs na fila (únicos no lote: ${seenUrl.size} · cache: ${Object.keys(cache.checked).length})`);
    let i = 0, done = 0; const t0 = Date.now();
    async function worker() {
      while (i < jobs.length) {
        const p = jobs[i++];
        const res = await checkUrl(p.image_url);
        cache.checked[p.image_url] = { ...res, at: Date.now() };
        liveStats[res.v] = (liveStats[res.v] || 0) + 1;
        if (['dead', 'not-image', 'placeholder', 'tiny'].includes(res.v)) {
          const r = replacementFor(p.ean, p.image_url);
          if (r) { if (APPLY) p.image_url = r.img; fixedBad++; }
        }
        done++;
        if (done % 400 === 0) {
          fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf8');
          console.log(`  [${done}/${jobs.length}] ${JSON.stringify(liveStats)} · ${(done / ((Date.now() - t0) / 1000)).toFixed(1)}/s`);
        }
        await new Promise(s => setTimeout(s, 50));
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf8');
    console.log(`  LIVE final: ${JSON.stringify(liveStats)}`);
  }

  // ── RELATÓRIO (tudo o que a cache sabe sobre o lote) ──────────────────────
  const bad = { dead: [], 'not-image': [], tiny: [], placeholder: [], distorted: [] };
  for (const p of selected) {
    const c = p.image_url && cache.checked[p.image_url];
    if (c && bad[c.v]) bad[c.v].push({ ean: p.ean, name: String(p.name || '').slice(0, 50), url: p.image_url, w: c.w, h: c.h, http: c.http, bytes: c.bytes });
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify({
    generated_at: new Date().toISOString(),
    lote: ALL ? 'todos' : ONLY_EANS ? 'eans' : 'top' + TOP,
    produtos_no_lote: selected.length,
    sem_imagem: semImagem.length,
    preencheveis: fixedMissing,
    sem_substituta: semSubstituta,
    url_suspeito: urlSuspeito.slice(0, 50).map(p => ({ ean: p.ean, url: p.image_url })),
    live_stats_desta_corrida: LIVE ? liveStats : null,
    cache_total: Object.keys(cache.checked).length,
    problemas: Object.fromEntries(Object.entries(bad).map(([k, v]) => [k, { n: v.length, amostra: v.slice(0, 25) }])),
  }, null, 2), 'utf8');

  console.log(`\n══════ Resumo ══════`);
  for (const [k, v] of Object.entries(bad)) console.log(`  ${k}: ${v.length}`);
  console.log(`  ${APPLY ? 'Corrigidas' : 'Corrigíveis'}: sem-imagem ${fixedMissing} + suspeitas ${fixedSusp} + limpas ${clearedSusp} + más-live ${fixedBad}`);
  console.log(`✓ relatório: ${OUT_FILE.replace(ROOT, '.')}`);
  if (APPLY && (fixedMissing || fixedBad || fixedSusp || clearedSusp)) {
    fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
    console.log(`✓ seed-bundle atualizado — corre inject-seed-into-demo.js para publicar.`);
  } else if (!APPLY) console.log('[DRY-RUN] Re-corre com --apply para gravar as substituições.');
})();
