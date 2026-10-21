#!/usr/bin/env node
/**
 * Metadados das fichas para a função /api/seo-product (contrato v1, 2026-10-16)
 * ============================================================================
 * A função do Codex (frontend/product-page.mjs) desenha o <head> e o resumo de
 * cada ficha a partir de três ficheiros que este script escreve no build:
 *
 *   seo-meta/manifest.json          {"v":1,"version":"<hash>","site":"<origem>"}
 *   seo-meta/<version>/<0..511>.json  { "<id>": {e,n,b,s,lo,i?}, … }
 *
 * Tudo vem do ÍNDICE DE PESQUISA DESTE BUILD (data/idx/search-<versao>.json),
 * que já passou pelas mesmas camadas que a página (blocklist, fantasmas,
 * podres, visibilidade). Assim a ficha sem JavaScript diz o mesmo que a ficha
 * com JavaScript:
 *   s  — lojas com a oferta em stock (o mesmo `s` do índice);
 *   lo — o «desde» da UI, pela função de referência indexMinimum() do próprio
 *        frontend (absBest ?? bestPrice; NÃO o menor de mn e ab — há fichas
 *        em que o mínimo absoluto é maior do que o do volume de referência);
 *   i  — a mesma imagem que o índice dá ao cartão (image_url do produto).
 * O pedaço de cada ficha sai do bucket() do frontend, para os dois lados nunca
 * divergirem. A versão é o hash do conteúdo: muda quando um preço muda.
 *
 * Corre no build DEPOIS do build-search-index.js e ANTES da limpeza (lê o seed
 * para as imagens). Uso: node scripts/build-seo-meta.js [--out=<pasta>]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { siteOrigin } = require('./lib/site-origin');

const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const OUT = path.resolve(ROOT, args.out || 'seo-meta');
const BUCKETS = 512;

function indiceDesteBuild() {
  const dir = path.join(ROOT, 'data', 'idx');
  const versao = fs.readFileSync(path.join(dir, 'versao.txt'), 'utf8').trim();
  const f = path.join(dir, `search-${versao}.json`);
  if (!fs.existsSync(f)) throw new Error(`o versao.txt aponta para ${path.basename(f)}, que não existe`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

async function main() {
  const { bucket, indexMinimum } = await import(pathToFileURL(path.join(ROOT, 'frontend', 'product-page.mjs')).href);
  const site = siteOrigin();
  const d = indiceDesteBuild();
  const n = d.e.length;
  for (const k of ['nm', 'b', 's', 'mn']) if (!Array.isArray(d[k]) || d[k].length !== n) throw new Error(`índice sem a lista paralela «${k}»`);
  if (n < 1000) throw new Error(`índice com só ${n} fichas — build partido, não publicar metadados`);

  // imagens: a mesma fonte que o build-search-index.js usa para o cartão
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
  const imagem = new Map();
  for (const p of seed.products || []) if (p.image_url && /^https?:\/\//i.test(p.image_url)) imagem.set(String(p.ean), p.image_url);

  const pedacos = Array.from({ length: BUCKETS }, () => Object.create(null));
  const c = { fichas: 0, semLojas: 0, semPreco: 0, comImagem: 0, absAcimaDoRef: 0 };
  for (let i = 0; i < n; i++) {
    const e = String(d.e[i]);
    const s = d.s[i];
    // a função recusa s<1 (seria uma ficha sem nada para comparar): fica de fora → 404
    if (!Number.isInteger(s) || s < 1) { c.semLojas++; continue; }
    const lo = indexMinimum(d, i);
    if (lo < 0) c.semPreco++;
    if (Array.isArray(d.ab) && d.ab[i] > 0 && d.mn[i] > 0 && d.ab[i] > d.mn[i]) c.absAcimaDoRef++;
    const reg = { e, n: String(d.nm[i]), b: (d.brands && d.brands[d.b[i]]) || '', s, lo };
    const img = imagem.get(e);
    if (img) { reg.i = img; c.comImagem++; }
    pedacos[bucket(e)][e] = reg;
    c.fichas++;
  }

  const textos = pedacos.map(o => JSON.stringify(o));
  const version = crypto.createHash('sha256').update(textos.join('\n')).digest('hex').slice(0, 16);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, version), { recursive: true });
  textos.forEach((t, k) => fs.writeFileSync(path.join(OUT, version, `${k}.json`), t));
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ v: 1, version, site }));

  const bytes = textos.reduce((a, t) => a + Buffer.byteLength(t), 0);
  const tamanhos = textos.map(t => Buffer.byteLength(t)).sort((a, b) => a - b);
  console.log(`🔎 seo-meta ${version}: ${c.fichas} fichas em ${BUCKETS} pedaços (${(bytes / 1e6).toFixed(1)} MB; pedaço mediano ${(tamanhos[BUCKETS >> 1] / 1024).toFixed(0)} KB, maior ${(tamanhos[BUCKETS - 1] / 1024).toFixed(0)} KB) · origem ${site}`);
  console.log(`   sem lojas (fora): ${c.semLojas} · sem preço (lo=-1): ${c.semPreco} · com imagem: ${c.comImagem} · «desde» acima do mínimo ao volume de referência: ${c.absAcimaDoRef}`);
}

main().catch(e => { console.error('✗ build-seo-meta:', e.message); process.exit(1); });
