#!/usr/bin/env node
/**
 * Aplica a origem pública (config/site.json ou COSMATH_SITE) ao que o build
 * publica — 2026-10-16. Corre no build DEPOIS do frontend/prepare-pages.cjs:
 *
 *   index.html, catalogo.html  → <meta name="cm-site"> (o frontend lê-o para o
 *                                canonical/og das fichas abertas em JS) e os
 *                                og:url / og:image com a origem configurada;
 *   robots.txt                 → linha Sitemap:;
 *   restantes *.html da raiz   → canonical relativo passa a absoluto (páginas
 *                                legais: o Google recomenda absolutos).
 *
 * NÃO mexe no seo-shell.html: a função das fichas tira-lhe o canonical e os og
 * e põe os seus, com a origem do manifesto — e o seu próprio cm-site, que
 * ficaria duplicado. Nem no demo.html: só nos ficheiros gerados.
 * Uso: node scripts/aplicar-origem.js [--root=<pasta>]
 */
const fs = require('fs');
const path = require('path');
const { siteOrigin } = require('./lib/site-origin');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const ROOT = path.resolve(args.root || path.join(__dirname, '..'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function aplicarNaShell(html, origem) {
  let n = 0;
  if (/<meta\b[^>]*name=["']cm-site["']/i.test(html)) {
    html = html.replace(/(<meta\b[^>]*name=["']cm-site["'][^>]*content=["'])[^"']*(["'])/i, (_, a, b) => { n++; return a + esc(origem) + b; });
  } else {
    html = html.replace(/<head\b[^>]*>/i, h => { n++; return h + '\n<meta name="cm-site" content="' + esc(origem) + '" />'; });
  }
  // og:url / og:image: troca só a origem, mantém o caminho
  html = html.replace(/<meta\b[^>]*id=["']seo-og-(url|image)["'][^>]*>/gi, tag =>
    tag.replace(/content=["']([^"']*)["']/i, (all, valor) => {
      let caminho = '/';
      try { const u = new URL(valor, origem); caminho = u.pathname + u.search; } catch {}
      n++;
      return 'content="' + esc(origem + caminho) + '"';
    }));
  return { html, n };
}

function main() {
  const origem = siteOrigin();
  const feito = [];
  for (const f of ['index.html', 'catalogo.html']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) throw new Error(`falta ${f} — o inject e o prepare-pages correm antes`);
    const r = aplicarNaShell(fs.readFileSync(p, 'utf8'), origem);
    fs.writeFileSync(p, r.html);
    feito.push(`${f} (${r.n})`);
  }
  const robots = path.join(ROOT, 'robots.txt');
  if (fs.existsSync(robots)) {
    const t = fs.readFileSync(robots, 'utf8');
    const novo = /^Sitemap:/m.test(t) ? t.replace(/^Sitemap:.*$/m, `Sitemap: ${origem}/sitemap.xml`) : t.replace(/\s*$/, `\n\nSitemap: ${origem}/sitemap.xml\n`);
    fs.writeFileSync(robots, novo);
    feito.push('robots.txt');
  }
  for (const f of fs.readdirSync(ROOT).filter(x => /\.html$/i.test(x) && !['index.html', 'catalogo.html', 'seo-shell.html', 'demo.html'].includes(x))) {
    const p = path.join(ROOT, f);
    const t = fs.readFileSync(p, 'utf8');
    const novo = t.replace(/(<link\b[^>]*rel=["']canonical["'][^>]*href=["'])(\/[^"']*)(["'])/gi, (_, a, c, b) => a + esc(origem + c) + b);
    if (novo !== t) { fs.writeFileSync(p, novo); feito.push(f); }
  }
  console.log(`🌐 origem ${origem} aplicada: ${feito.join(', ')}`);
}

module.exports = { aplicarNaShell };
if (require.main === module) {
  try { main(); } catch (e) { console.error('✗ aplicar-origem:', e.message); process.exit(1); }
}
