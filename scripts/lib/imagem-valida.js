/**
 * Imagem do produto: só endereços que um browser consegue abrir
 * ============================================================
 * PORQUÊ (auditoria 2026-10-02): 48 produtos do site tinham image_url
 * estragado e o cartão aparecia sem foto:
 *   • "[object Object]" (20) — 25 scrapers liam o JSON-LD com
 *     `Array.isArray(n.image) ? n.image[0] : …`; quando a loja publica
 *     `image: [{ "@type": "ImageObject", url }]` o n.image[0] é um objeto e o
 *     String() dava "[object Object]". A perfumes4you tinha 1.235 de 1.236.
 *   • relativos (15) — "/api/api.php/getImage/…" (pharmee) e
 *     "/image-not-available.jpg" (farmaciarodrigues & co.): sem domínio.
 *   • placeholders (wells product-placeholder.svg, image-not-available).
 *   • com espaços (12) — abrem, mas só se forem codificados.
 *
 * imagemDoJsonLd(img)      → o URL dentro de string | ImageObject | array
 * imagemValida(u, base)    → URL absoluto http(s) utilizável, ou null
 * repararImagens(seed)     → corrige no seed (em memória) os image_url
 *                            estragados: codifica, ou vai buscar a imagem ao
 *                            catálogo de uma loja que vende o produto (pelo
 *                            URL da oferta), ou deixa null para outra fonte
 *                            preencher (integradores / audit-product-images).
 */
const fs = require('fs');
const path = require('path');

// o critério do audit-product-images (BAD_URL_RE) + os placeholders vistos no
// seed: image-not-available, imagem_indisponivel (farmacia.pt) e o da
// PrestaShop "pt-default-home_default.jpg" (farmaciabarata)
const PLACEHOLDER_RE = /placeholder|no-?image|noimage|image-not-available|imagem[_-]?indisponivel|\/[a-z]{2}-default-[a-z_]+_default\.|default\.(png|jpg)|image-coming|sem-?imagem|blank\.|spacer\./i;

function imagemDoJsonLd(img) {
  if (!img) return null;
  if (Array.isArray(img)) {
    for (const x of img) { const u = imagemDoJsonLd(x); if (u) return u; }
    return null;
  }
  if (typeof img === 'string') return img;
  if (typeof img === 'object') return imagemDoJsonLd(img.url || img.contentUrl || null);
  return null;
}

function imagemValida(u, base) {
  u = imagemDoJsonLd(u);
  if (!u) return null;
  u = String(u).trim().replace(/\\\//g, '/');
  if (!u || /\[object /i.test(u)) return null;
  if (u.startsWith('//')) u = 'https:' + u;
  if (!/^https?:\/\//i.test(u)) {
    if (!base) return null;
    try { u = new URL(u, base).href; } catch { return null; }
  }
  if (PLACEHOLDER_RE.test(u)) return null;
  if (/\s/.test(u)) {                       // só os que precisam: não reescrever os bons
    try { u = new URL(u).href; } catch { return null; }
  }
  return u;
}

const FICHEIRO = { 'loja-farmacia': 'lojafarmacia', 'pharma-gdd': 'pharmagdd' };
const normUrl = u => String(u || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');

function repararImagens(seed, opts = {}) {
  const dir = opts.catalogDir || path.join(__dirname, '..', '..', 'data', 'catalog');
  const estragados = (seed.products || []).filter(p =>
    p.image_url != null && p.image_url !== '' && imagemValida(p.image_url) !== p.image_url);
  const r = { codificadas: 0, doCatalogo: 0, retiradas: 0 };
  if (!estragados.length) return r;

  const porEan = new Map(estragados.map(p => [p.ean, p]));
  const ofertas = new Map();                // ean → [{ loja, url }]
  for (const sp of seed.store_products || []) {
    for (const it of sp.items || []) {
      if (!it.url || !porEan.has(it.ean)) continue;
      (ofertas.get(it.ean) || ofertas.set(it.ean, []).get(it.ean)).push({ loja: sp.store_slug, url: it.url });
    }
  }
  const catalogos = new Map();              // loja → Map(urlNormalizado → imagem do catálogo)
  const imagemNoCatalogo = (loja, url) => {
    if (!catalogos.has(loja)) {
      const m = new Map();
      const f = path.join(dir, `${FICHEIRO[loja] || loja}-full.json`);
      try {
        for (const ep of JSON.parse(fs.readFileSync(f, 'utf8')).products || []) {
          if (ep && ep.url && ep.image_url) m.set(normUrl(ep.url), ep.image_url);
        }
      } catch { /* sem catálogo */ }
      catalogos.set(loja, m);
    }
    return catalogos.get(loja).get(normUrl(url)) || null;
  };

  for (const p of estragados) {
    const direta = imagemValida(p.image_url);
    if (direta) { p.image_url = direta; r.codificadas++; continue; }
    let nova = null;
    for (const o of ofertas.get(p.ean) || []) {
      nova = imagemValida(imagemNoCatalogo(o.loja, o.url), o.url);
      if (nova) break;
    }
    if (nova) { p.image_url = nova; r.doCatalogo++; } else { p.image_url = null; r.retiradas++; }
  }
  return r;
}

module.exports = { imagemDoJsonLd, imagemValida, repararImagens };
