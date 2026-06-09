#!/usr/bin/env node
// Tenta recolher info de portes/envio de uma loja: testa caminhos típicos,
// extrai frases com palavras-chave de envio + valores em €. Uso:
//   node scripts/probe-shipping.js <base_url> [base_url2 ...]
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const PATHS = [
  '/envios', '/envio', '/portes', '/portes-de-envio', '/entregas', '/entrega', '/shipping',
  '/envios-e-devolucoes', '/envios-devolucoes', '/condicoes-de-envio', '/condicoes-envio',
  '/apoio-ao-cliente', '/ajuda', '/faq', '/perguntas-frequentes', '/customer-service',
  '/pt/envios', '/pt/portes', '/pages/envios', '/pages/shipping', '/info/envios',
  '/condicoes-gerais', '/termos-e-condicoes', '/delivery', '/devolucoes-e-trocas',
];
async function txt(u, ms = 12000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: c.signal }); return { s: r.status, b: await r.text() }; }
  catch (e) { return { s: 0, b: '' }; } finally { clearTimeout(t); }
}
function clean(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&euro;|&#8364;/g, '€').replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}
function sentences(text) {
  const kw = /(portes?|envio|entrega|gr[áa]tis|gratuit|free shipping|encomenda m[íi]nima|valor m[íi]nimo|a partir de|acima de|custo de envio)/i;
  const out = [];
  for (const s of text.split(/(?<=[.!?])\s+|•|\n/)) {
    if (kw.test(s) && /\d/.test(s) && s.length < 240) out.push(s.trim());
    if (out.length >= 8) break;
  }
  return [...new Set(out)];
}
function discoverLinks(html, root) {
  const kw = /(envi|portes?|entrega|shipping|delivery|frete|devolu)/i;
  const urls = new Set();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1]; const txt2 = m[2].replace(/<[^>]+>/g, ' ');
    if (kw.test(href) || kw.test(txt2)) {
      let u = href;
      if (u.startsWith('//')) u = 'https:' + u;
      else if (u.startsWith('/')) u = root + u;
      else if (!/^https?:/i.test(u)) continue;
      if (u.startsWith(root)) urls.add(u.split('#')[0]);
    }
  }
  return [...urls];
}
async function probe(base) {
  const root = base.replace(/\/$/, '');
  console.log(`\n══════ ${root} ══════`);
  const home = await txt(root);
  const links = home.s === 200 ? discoverLinks(home.b, root) : [];
  const cands = [...new Set([...links, ...PATHS.map(p => root + p)])];
  let found = 0;
  for (const u of cands) {
    const r = await txt(u);
    if (r.s !== 200 || r.b.length < 500) continue;
    const sents = sentences(clean(r.b));
    if (sents.length) {
      console.log(`  [${u.replace(root, '') || '/'}]`);
      sents.forEach(s => console.log('    · ' + s.slice(0, 200)));
      if (++found >= 2) break;
    }
  }
  if (!found) console.log('  (nenhuma info de envio encontrada)');
}
(async () => { for (const b of process.argv.slice(2)) await probe(b).catch(e => console.log('ERRO', e.message)); })();
