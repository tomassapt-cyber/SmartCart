#!/usr/bin/env node
/**
 * SmartCart — Audit de IMAGENS dos produtos mais visíveis
 * ============================================================
 *
 * O Top-50 da homepage ordena por nº de lojas → são os cards mais vistos.
 * Uma imagem em falta (placeholder de letra) ou MORTA (404/CDN removeu)
 * degrada logo a primeira dobra do site.
 *
 * Para os N produtos com mais lojas (+ EANs passados via --ean=):
 *   1. image_url em falta → procura substituta nos catálogos raspados
 *      (qualquer loja que venda o mesmo URL de oferta e tenha image_url).
 *   2. image_url presente → verifica por HTTP (status < 400). Morta →
 *      substitui como em (1). Erro de rede → mantém (não decide às cegas).
 *
 * Prioridade de substituição (qualidade típica): farmaciapt > sweetcare >
 * druni > notino > wells > bairro-saude > mycosmetics > resto.
 * Escreve image_url no seed (sticky — integradores não sobrescrevem).
 *
 * Uso:
 *   node scripts/audit-product-images.js               # top 100, dry-run
 *   node scripts/audit-product-images.js --top=200
 *   node scripts/audit-product-images.js --ean=3401381507565,340…
 *   node scripts/audit-product-images.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const APPLY = !!args.apply;
const TOP = args.top ? parseInt(args.top, 10) : 100;
const ONLY_EANS = args.ean ? String(args.ean).split(',').map(s => s.trim()) : null;

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

async function headOk(url, timeoutMs = 8000) {
  // GET com Range (alguns CDNs recusam HEAD); seguimos redirects.
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'GET', redirect: 'follow', signal: ctl.signal,
      headers: { Range: 'bytes=0-256', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    clearTimeout(t);
    if (r.body) { try { await r.body.cancel(); } catch { /* noop */ } }
    if (r.status >= 400) return { ok: false, status: r.status };
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) return { ok: false, status: r.status, ct };
    return { ok: true, status: r.status };
  } catch (e) {
    clearTimeout(t);
    return { ok: null, error: e.name === 'AbortError' ? 'timeout' : e.message }; // rede → desconhecido
  }
}

(async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));

  // ofertas por EAN (para achar substitutas e ordenar por nº de lojas)
  const offersByEan = {};
  for (const sp of seed.store_products)
    for (const it of sp.items)
      (offersByEan[it.ean] ||= []).push({ slug: sp.store_slug, item: it });

  let selected;
  if (ONLY_EANS) {
    selected = seed.products.filter(p => ONLY_EANS.includes(p.ean));
  } else {
    selected = seed.products
      .map(p => ({ p, n: new Set((offersByEan[p.ean] || []).filter(o => o.item.in_stock).map(o => o.slug)).size }))
      .filter(x => x.n >= 2)
      .sort((a, b) => b.n - a.n)
      .slice(0, TOP)
      .map(x => x.p);
  }
  console.log(`🖼  A verificar imagens de ${selected.length} produtos…\n`);

  function replacementFor(ean) {
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
    cands.sort((a, b) => prio(a.slug) - prio(b.slug));
    return cands[0] || null;
  }

  let missing = 0, dead = 0, fixed = 0, unknown = 0, okCount = 0;
  const CONC = 8;
  const queue = [...selected];
  const report = [];

  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      if (!p.image_url) {
        missing++;
        const r = replacementFor(p.ean);
        if (r) {
          report.push(`✚ SEM imagem  ${p.ean} · ${String(p.name).slice(0, 50)} → ${r.slug}`);
          if (APPLY) { p.image_url = r.img; fixed++; }
          else fixed++;
        } else report.push(`✗ SEM imagem, SEM substituta  ${p.ean} · ${String(p.name).slice(0, 50)}`);
        continue;
      }
      const chk = await headOk(p.image_url);
      if (chk.ok === true) { okCount++; continue; }
      if (chk.ok === null) { unknown++; continue; }   // rede/timeout → não decidir
      dead++;
      const r = replacementFor(p.ean);
      if (r && r.img !== p.image_url) {
        report.push(`↻ MORTA (${chk.status}${chk.ct ? ' ' + chk.ct : ''})  ${p.ean} · ${String(p.name).slice(0, 46)} → ${r.slug}`);
        if (APPLY) { p.image_url = r.img; fixed++; }
        else fixed++;
      } else report.push(`✗ MORTA (${chk.status}) SEM substituta  ${p.ean} · ${String(p.name).slice(0, 46)}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));

  for (const l of report.sort()) console.log(l);
  console.log(`\n══════ Resumo ══════`);
  console.log(`OK: ${okCount} · em falta: ${missing} · mortas: ${dead} · rede-desconhecido: ${unknown}`);
  console.log(`${APPLY ? 'Corrigidas' : 'Corrigíveis'}: ${fixed}`);

  if (APPLY && fixed) {
    fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
    console.log(`✓ Escrito ${SEED_BUNDLE.replace(ROOT, '.')} — corre inject-seed-into-demo.js para publicar.`);
  } else if (!APPLY) {
    console.log('[DRY-RUN] Re-corre com --apply para gravar as substituições.');
  }
})();
