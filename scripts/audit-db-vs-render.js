#!/usr/bin/env node
/**
 * Auditor de paridade: a BD (que alimenta o app.html) mostra o mesmo que o
 * site principal mostra?
 * ============================================================================
 * PORQUÊ (2026-07-28): existem hoje DUAS definições de "o que é visível" —
 * os 11 overlays do scripts/inject-seed-into-demo.js (site) e um subconjunto
 * no scripts/push-catalog-to-db.js (BD). Enquanto forem duas, a BD mostra
 * coisas que o site esconde de propósito: ofertas-fantasma (404 confirmados),
 * ofertas podres (a loja já refrescou e aquela ficou para trás), produtos
 * órfãos/esgotados e duplicados de GTIN.
 *
 * Este script MEDE essa divergência. É a régua: enquanto não for 0, o /app
 * está a mentir ao utilizador. Só LÊ — nunca escreve nada.
 *
 * Uso:
 *   node scripts/audit-db-vs-render.js              # compara com index.html
 *   node scripts/audit-db-vs-render.js --json       # saída para o CI
 *   node scripts/audit-db-vs-render.js --max=0      # falha se divergir (gate)
 *
 * Precisa do index.html construído (o output do inject). Sem ele, explica.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));

const SB = process.env.SUPABASE_URL || 'https://sqjtkwtoaudmfmexreqk.supabase.co';
// chave ANON (leitura pública) — a mesma que o app.html usa; nunca a service_role
const KEY = process.env.SUPABASE_ANON_KEY || (() => {
  try {
    const app = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
    const m = app.match(/const KEY = '([^']+)'/);
    return m ? m[1] : null;
  } catch { return null; }
})();

function lerSeedDoHtml(ficheiro) {
  const h = fs.readFileSync(ficheiro, 'utf8');
  const OPEN = '<script type="application/json" id="seed-data">';
  const o = h.indexOf(OPEN);
  if (o === -1) throw new Error('bloco seed-data não encontrado em ' + ficheiro);
  const a = o + OPEN.length;
  const c = h.indexOf('</' + 'script>', a);
  const bloco = h.slice(a, c).trim();
  if (!bloco) throw new Error('bloco seed-data VAZIO em ' + ficheiro);
  return JSON.parse(bloco);   // se rebentar aqui, o inject corrompeu o bloco
}

async function contaBD(tabela) {
  const r = await fetch(`${SB}/rest/v1/${tabela}?select=ean`, {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact', Range: '0-0' },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`${tabela}: HTTP ${r.status}`);
  const cr = r.headers.get('content-range');
  if (!cr) throw new Error(`${tabela}: sem content-range`);
  return parseInt(cr.split('/')[1], 10);
}

// Puxa TODAS as chaves de uma tabela, paginado.
// ARMADILHA (2026-07-28): o PostgREST tem um TECTO de 1000 linhas por resposta
// (medido) e IGNORA limit=10000 em silêncio. Um loop que pare quando
// `linhas.length < limitPedido` para logo na 1ª página e dá a ilusão de ter
// lido a tabela toda — foi assim que uma primeira análise reportou 203
// divergências em vez das milhares reais. Usa-se o header Range e pára-se só
// quando a página vem VAZIA ou abaixo do tecto real observado.
const PAG = 1000;
async function chavesBD(tabela, campos, chave) {
  const out = new Set();
  for (let off = 0; ; off += PAG) {
    const r = await fetch(`${SB}/rest/v1/${tabela}?select=${campos}&order=ean.asc`, {
      headers: {
        apikey: KEY, Authorization: 'Bearer ' + KEY,
        Range: `${off}-${off + PAG - 1}`, 'Range-Unit': 'items',
      },
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok && r.status !== 206) throw new Error(`${tabela}: HTTP ${r.status}`);
    const linhas = await r.json();
    for (const l of linhas) out.add(chave(l));
    if (linhas.length === 0 || linhas.length < PAG) break;
  }
  return out;
}

(async function main() {
  if (!KEY) { console.error('✗ sem chave anon (define SUPABASE_ANON_KEY ou garante o app.html)'); process.exit(1); }

  const HTML = path.join(ROOT, args.html || 'index.html');
  if (!fs.existsSync(HTML)) {
    console.error(`✗ ${HTML} não existe. Constrói primeiro:\n    COSMATH_DEPLOY_BUILD=1 node scripts/inject-seed-into-demo.js`);
    process.exit(1);
  }

  const seed = lerSeedDoHtml(HTML);
  const prodSite = new Set(seed.products.map(p => p.ean));
  const ofertasSite = new Set();
  for (const g of seed.store_products) for (const it of g.items) ofertasSite.add(g.store_slug + '|' + it.ean);

  const [nProdBD, nOfBD] = await Promise.all([contaBD('products'), contaBD('offers')]);

  const res = {
    site: { produtos: prodSite.size, ofertas: ofertasSite.size },
    bd: { produtos: nProdBD, ofertas: nOfBD },
    divergencia: { produtos: nProdBD - prodSite.size, ofertas: nOfBD - ofertasSite.size },
  };

  // detalhe: QUE produtos é que a BD tem a mais (só se houver divergência)
  if (res.divergencia.produtos > 0 && !args.rapido) {
    const prodBD = await chavesBD('products', 'ean', l => l.ean);
    const aMais = [...prodBD].filter(e => !prodSite.has(e));
    res.exemplos_produtos_a_mais = aMais.slice(0, 10);
    res.divergencia.produtos_confirmada = aMais.length;
  }

  if (args.json) { console.log(JSON.stringify(res, null, 2)); }
  else {
    console.log('── paridade BD ↔ site ──');
    console.log(`  site (após overlays): ${res.site.produtos} produtos · ${res.site.ofertas} ofertas`);
    console.log(`  BD   (o que /app vê): ${res.bd.produtos} produtos · ${res.bd.ofertas} ofertas`);
    const d = res.divergencia;
    const sinal = (d.produtos === 0 && d.ofertas === 0) ? '✓ EM PARIDADE' : '⚠ A BD MOSTRA A MAIS';
    console.log(`  ${sinal}: ${d.produtos} produtos · ${d.ofertas} ofertas`);
    if (res.exemplos_produtos_a_mais) {
      console.log('  exemplos (EANs que o site esconde e o /app mostra):');
      for (const e of res.exemplos_produtos_a_mais) console.log('    · ' + e);
    }
  }

  if (args.max != null) {
    const lim = Number(args.max);
    const pior = Math.max(res.divergencia.produtos, res.divergencia.ofertas);
    if (pior > lim) {
      console.error(`✗ divergência ${pior} acima do limite ${lim}`);
      process.exit(1);
    }
  }
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
