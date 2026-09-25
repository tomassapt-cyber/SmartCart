#!/usr/bin/env node
/**
 * CosMath — catalogo da smartbeauty.pt (Shopkit, a granel)
 * ============================================================
 * Antes: ficha a ficha. As fichas desta plataforma pesam centenas de KB (medido:
 * ate 1.005 KB numa delas), e uma passagem gastava tempo e trafego a mais para
 * trazer menos produtos do que a loja tem.
 *
 * Agora: /products.json?limit=250 e seguir o paging.next. Medido a 2026-09-25:
 * 8108 produtos no total. Toda a logica esta em lib/shopkit-granel.js,
 * partilhada com as outras duas lojas Shopkit -- duplica-la era garantir que
 * divergiam na primeira correccao.
 *
 * ⚠️ Esta loja RECUSA A LIGACAO a IPs de datacenter (HTTP 000 dos runners do
 * GitHub, verificado). Corre do PC do dono, por agendador de tarefas.
 *
 * Uso:
 *   node scripts/scrape-smartbeauty-catalog.js
 *   node scripts/scrape-smartbeauty-catalog.js --limit=100    # teste, NAO escreve
 */

const fs = require('fs');
const path = require('path');
const { recolherCatalogo } = require('./lib/shopkit-granel');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_DIR = path.join(ROOT, 'data', 'catalog');
const OUT_FILE = path.join(CATALOG_DIR, 'smartbeauty-full.json');
const BASE = 'https://www.smartbeauty.pt';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const LIMITE = args.limit ? parseInt(args.limit, 10) : Infinity;

(async () => {
  if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });
  console.log('📦 A buscar o catalogo smartbeauty.pt a granel (/products.json)…');

  const r = await recolherCatalogo(BASE, {
    limite: LIMITE,
    ua: UA,
    aoProgresso: ({ paginas, guardados, total, bytes }) => {
      if (paginas % 10 === 0 || guardados >= total) {
        console.log(`  pagina ${paginas} · ${guardados}/${total} guardados · ${(bytes / 1048576).toFixed(1)} MB`);
      }
    },
  });

  const comEan = r.produtos.filter(p => p.ean).length;
  const comCnp = r.produtos.filter(p => p.cnp).length;
  const comPromo = r.produtos.filter(p => p.previous_price).length;
  const emStock = r.produtos.filter(p => p.in_stock).length;

  console.log(`\n══════ smartbeauty.pt — resumo ══════`);
  console.log(`  total na loja:   ${r.total}`);
  console.log(`  paginas lidas:   ${r.paginas} · ${(r.bytes / 1048576).toFixed(1)} MB`);
  console.log(`  produtos brutos: ${r.brutos} · guardados: ${r.produtos.length} · sem EAN/CNP: ${r.semChave}`);
  console.log(`  com EAN: ${comEan} · com CNP: ${comCnp} · em stock: ${emStock} · em promocao: ${comPromo}`);

  // Guarda: com 0 produtos NAO se escreve. Um catalogo vazio committado apagava
  // a loja do site, e isso nao se desfaz com um re-scrape -- as ofertas ja tinham
  // sido removidas do seed pela integracao seguinte.
  if (!r.produtos.length) {
    console.error('✗ 0 produtos — NAO sobrescrevo o catalogo existente.');
    process.exit(1);
  }
  if (LIMITE !== Infinity) {
    console.log(`[--limit=${LIMITE}] smoke-test: catalogo de producao NAO escrito.`);
    return;
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify({
    scraped_at: new Date().toISOString(),
    source: 'smartbeauty.pt (Shopkit /products.json a granel; barcode=EAN, reference=CNP)',
    in_progress: false,
    products: r.produtos,
  }), 'utf8');
  console.log(`✓ ${OUT_FILE} (${Math.round(fs.statSync(OUT_FILE).size / 1024)} KB)`);
})().catch(e => {
  console.error('FATAL ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
