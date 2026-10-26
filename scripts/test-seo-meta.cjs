'use strict';
// Metadados das fichas (contrato v1) e origem única — 2026-10-16. Sem rede.
// Precisa do índice deste checkout: corre depois de build-search-index.js e
// build-sitemap.js (o teste gera os metadados numa pasta temporária).
// Uso: node scripts/test-seo-meta.cjs
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const ROOT = path.resolve(__dirname, '..');

(async () => {
  const { bucket, indexMinimum, productPath } = await import(pathToFileURL(path.join(ROOT, 'frontend', 'product-page.mjs')).href);
  const { validar, siteOrigin } = require('./lib/site-origin');
  const { aplicarNaShell } = require('./aplicar-origem');

  // 1. a origem: só esquema+anfitrião, falha alto no resto
  assert.equal(validar('https://cosmath.pt/', 't'), 'https://cosmath.pt');
  assert.equal(validar('http://cosmath.localhost:5190', 't'), 'http://cosmath.localhost:5190');
  for (const mau of ['cosmath.pt', 'ftp://cosmath.pt', 'https://cosmath.pt/loja', 'https://cosmath.pt/?a=1', 'https://u:p@cosmath.pt', 'https://cosmath.pt/#x'])
    assert.throws(() => validar(mau, 't'), undefined, mau);
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'site.json'), 'utf8')).origin;
  const antes = process.env.COSMATH_SITE;
  delete process.env.COSMATH_SITE;
  assert.equal(siteOrigin(), validar(config, 'config'));
  process.env.COSMATH_SITE = 'https://cosmath.example';
  assert.equal(siteOrigin(), 'https://cosmath.example');
  if (antes === undefined) delete process.env.COSMATH_SITE; else process.env.COSMATH_SITE = antes;

  // 2. o domínio não está escrito à mão nos scripts do build
  for (const f of ['build-sitemap.js', 'build-seo-meta.js', 'aplicar-origem.js', 'portes-vigia.js'])
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'scripts', f), 'utf8'), /smart-cart-zx55/, f);

  // 3. a shell: um só cm-site, og com a origem, idempotente
  const shell = '<html><head><title>T</title><meta property="og:url" content="https://velho.example/" id="seo-og-url" /><meta property="og:image" content="https://velho.example/apple-touch-icon-v4.png" id="seo-og-image" /></head><body></body></html>';
  const um = aplicarNaShell(shell, 'https://cosmath.example').html;
  const dois = aplicarNaShell(um, 'https://cosmath.example').html;
  assert.equal(um, dois, 'aplicar duas vezes dá o mesmo');
  assert.equal((um.match(/name="cm-site"/g) || []).length, 1);
  assert.match(um, /content="https:\/\/cosmath\.example\/" id="seo-og-url"/);
  assert.match(um, /content="https:\/\/cosmath\.example\/apple-touch-icon-v4\.png"/);
  assert.doesNotMatch(um, /velho\.example/);

  // 4. os metadados, gerados com uma origem alternativa
  const dirIdx = path.join(ROOT, 'data', 'idx');
  const d = JSON.parse(fs.readFileSync(path.join(dirIdx, `search-${fs.readFileSync(path.join(dirIdx, 'versao.txt'), 'utf8').trim()}.json`), 'utf8'));
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-meta-'));
  execFileSync(process.execPath, ['--max-old-space-size=4096', path.join(ROOT, 'scripts', 'build-seo-meta.js'), `--out=${out}`],
    { env: { ...process.env, COSMATH_SITE: 'https://cosmath.example' }, stdio: 'pipe' });
  const m = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  assert.deepEqual(Object.keys(m).sort(), ['site', 'v', 'version']);
  assert.equal(m.v, 1); assert.equal(m.site, 'https://cosmath.example'); assert.match(m.version, /^\w{8,64}$/);
  const ficheiros = fs.readdirSync(path.join(out, m.version));
  assert.equal(ficheiros.length, 512, 'um ficheiro por pedaço, mesmo vazio');
  let total = 0, abAcima = 0;
  const lo = new Map();
  for (let k = 0; k < 512; k++) {
    const o = JSON.parse(fs.readFileSync(path.join(out, m.version, `${k}.json`), 'utf8'));
    for (const [id, p] of Object.entries(o)) {
      total++;
      assert.equal(bucket(id), k, `${id} no pedaço certo`);
      assert.equal(p.e, id);
      assert.equal(typeof p.n, 'string'); assert.equal(typeof p.b, 'string');
      assert.ok(Number.isInteger(p.s) && p.s >= 1, `${id} s`);
      assert.ok(Number.isInteger(p.lo), `${id} lo`);
      if (p.i !== undefined) assert.match(p.i, /^https?:\/\//);
      lo.set(id, p);
    }
  }
  assert.equal(total, d.e.length, 'todas as fichas do índice');
  for (let i = 0; i < d.e.length; i++) {
    const p = lo.get(String(d.e[i]));
    assert.equal(p.lo, indexMinimum(d, i), `${d.e[i]} lo = indexMinimum`);
    assert.equal(p.s, d.s[i]); assert.equal(p.n, d.nm[i]);
    if (d.ab[i] > 0 && d.mn[i] > 0 && d.ab[i] > d.mn[i]) { abAcima++; assert.equal(p.lo, d.ab[i], `${d.e[i]}: o «desde» é o absoluto, não o menor`); }
  }
  assert.ok(abAcima > 0, 'há casos ab>mn para provar a regra');
  // mesma entrada → mesma versão; versão muda quando o conteúdo muda
  const out2 = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-meta-'));
  execFileSync(process.execPath, ['--max-old-space-size=4096', path.join(ROOT, 'scripts', 'build-seo-meta.js'), `--out=${out2}`],
    { env: { ...process.env, COSMATH_SITE: 'https://outro.example' }, stdio: 'pipe' });
  assert.equal(JSON.parse(fs.readFileSync(path.join(out2, 'manifest.json'), 'utf8')).version, m.version, 'a versão é do conteúdo, não da origem');
  fs.rmSync(out, { recursive: true, force: true }); fs.rmSync(out2, { recursive: true, force: true });

  // 5. o sitemap aponta para o MESMO endereço que o canonical da função
  const sm = fs.readdirSync(ROOT).filter(f => /^sitemap-produtos-\d+\.xml$/.test(f));
  assert.ok(sm.length > 0, 'falta correr build-sitemap.js');
  const noSitemap = new Set();
  for (const f of sm) for (const x of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/<loc>[^<]*?(\/produto\/[^<]*)<\/loc>/g)) noSitemap.add(x[1].replace(/&amp;/g, '&'));
  let iguais = 0;
  for (let i = 0; i < d.e.length; i++) if (noSitemap.has(productPath(d.e[i], d.nm[i]))) iguais++;
  assert.equal(iguais, d.e.length, `sitemap e canonical divergem em ${d.e.length - iguais} fichas`);

  console.log(`test-seo-meta: origem única, shell, ${total} fichas em 512 pedaços (lo = indexMinimum; ${abAcima} com o absoluto acima do de referência), sitemap = canonical — tudo passou`);
})().catch(e => { console.error(e); process.exit(1); });
