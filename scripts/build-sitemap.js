#!/usr/bin/env node
/**
 * CosMath — gerador do sitemap
 * ============================================================
 * PORQUÊ: até 2026-09-26 não havia `sitemap.xml` (o pedido devolvia 404) e as
 * fichas de produto não tinham endereço nenhum — abriam em sobreposição sem
 * tocar no URL. Resultado: nenhum dos ~48 mil produtos podia ser indexado, e o
 * canal de aquisição de um site de comparação de preços é alguém procurar
 * «<produto> preço» no Google.
 *
 * Agora cada produto tem `/produto/<ean>/<slug>` (ver o módulo
 * «ENDERECO E SEO DA FICHA» no demo.html) e este script escreve o mapa.
 *
 * FONTE: o índice de pesquisa (`data/idx/search-<hash>.json`), porque é
 * exactamente o conjunto de produtos que o site serve — já passou pelo filtro de
 * visibilidade e pelas ofertas podres. Um sitemap com produtos que o site não
 * mostra é pior do que não ter sitemap: ensina o Google a desconfiar.
 *
 * ⚠️ CORRE DEPOIS do build-search-index.js. Sem o índice não há o que listar.
 *
 * ⚠️ SEM `lastmod`. Os preços mudam todos os dias, logo a data de build seria
 * tecnicamente verdadeira — mas um sitemap que diz «tudo mudou hoje» todos os
 * dias faz o Google ignorar o campo. Melhor não afirmar nada do que afirmar algo
 * em que ninguém acredita.
 *
 * Os ficheiros são gerados no build e NÃO entram no git (ver .gitignore), como
 * o data/idx/ e o data/p/.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = (process.env.COSMATH_SITE || 'https://smart-cart-zx55.vercel.app').replace(/\/$/, '');
const POR_FICHEIRO = 20000;   // o limite do protocolo são 50.000; 20.000 dá folga

/**
 * ⚠️ TEM de ser igual ao `seoSlug` do demo.html. Se divergirem, o sitemap
 * aponta para um endereço e a página declara outro no `canonical` — o Google vê
 * conteúdo duplicado e não indexa nenhum dos dois. Qualquer mudança aqui tem de
 * ser feita nos dois sítios.
 */
function seoSlug(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
}

function caminhoDoProduto(ean, nome) {
  const slug = seoSlug(nome);
  return '/produto/' + encodeURIComponent(ean) + (slug ? '/' + slug : '');
}

const escapar = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function urlset(caminhos) {
  const linhas = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const c of caminhos) linhas.push('  <url><loc>' + escapar(SITE + c) + '</loc></url>');
  linhas.push('</urlset>');
  return linhas.join('\n') + '\n';
}

function indice(ficheiros, quando) {
  const linhas = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const f of ficheiros) {
    linhas.push('  <sitemap><loc>' + escapar(SITE + '/' + f) + '</loc><lastmod>' + quando + '</lastmod></sitemap>');
  }
  linhas.push('</sitemapindex>');
  return linhas.join('\n') + '\n';
}

function acharIndice() {
  const dir = path.join(ROOT, 'data', 'idx');
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).filter(x => /^search-[0-9a-f]+\.json$/.test(x));
  if (!f.length) return null;
  // o mais recente, se por algum motivo houver mais do que um
  f.sort((a, b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs);
  return path.join(dir, f[0]);
}

(function main() {
  const p = acharIndice();
  if (!p) {
    console.error('✗ sem data/idx/search-*.json — o build-search-index.js corre ANTES deste script.');
    process.exit(1);
  }

  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!Array.isArray(d.e) || !Array.isArray(d.nm) || d.e.length !== d.nm.length) {
    console.error('✗ o índice não tem as listas paralelas e/nm — mudou de forma.');
    process.exit(1);
  }

  const produtos = [];
  const vistos = new Set();
  let semEan = 0, repetidos = 0;
  for (let i = 0; i < d.e.length; i++) {
    const ean = d.e[i];
    if (!ean) { semEan++; continue; }
    if (vistos.has(ean)) { repetidos++; continue; }
    vistos.add(ean);
    produtos.push(caminhoDoProduto(ean, d.nm[i]));
  }

  // guarda: um sitemap quase vazio publicado por cima de um bom diz ao Google
  // que o site encolheu. Melhor falhar o build.
  if (produtos.length < 1000) {
    console.error(`✗ só ${produtos.length} produtos no índice — não escrevo o sitemap (esperava milhares).`);
    process.exit(1);
  }

  const quando = new Date().toISOString().slice(0, 10);
  const escritos = [];

  // páginas fixas
  fs.writeFileSync(path.join(ROOT, 'sitemap-paginas.xml'), urlset(['/', '/catalogo']), 'utf8');
  escritos.push('sitemap-paginas.xml');

  for (let i = 0, n = 1; i < produtos.length; i += POR_FICHEIRO, n++) {
    const nome = `sitemap-produtos-${n}.xml`;
    fs.writeFileSync(path.join(ROOT, nome), urlset(produtos.slice(i, i + POR_FICHEIRO)), 'utf8');
    escritos.push(nome);
  }

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), indice(escritos, quando), 'utf8');

  const kb = escritos.reduce((a, f) => a + fs.statSync(path.join(ROOT, f)).size, 0) / 1024;
  console.log(`🗺️  sitemap: ${produtos.length} produtos em ${escritos.length - 1} ficheiro(s) + páginas · ${kb.toFixed(0)} KB`);
  if (semEan || repetidos) console.log(`   ignorados: ${semEan} sem EAN, ${repetidos} repetidos`);
  console.log(`   índice: ${SITE}/sitemap.xml`);
})();
