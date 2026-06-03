#!/usr/bin/env node
/**
 * SmartCart — Recomendações por conteúdo (Fase 3)
 * ============================================================
 *
 * Pré-computa, para cada produto, uma lista de "produtos similares" a
 * partir do conteúdo textual (descrição limpa + nome canónico + marca),
 * usando TF-IDF + similaridade do cosseno. NÃO usa LLM.
 *
 * Escala: 34k produtos tornam o O(n²) (633M pares só em skincare)
 * impraticável. Em vez disso usamos geração de candidatos por índice
 * invertido: cada produto só é comparado com outros que partilham tokens
 * distintivos E pertencem à MESMA categoria. Isto reduz o trabalho real
 * em ~2 ordens de grandeza mantendo a qualidade.
 *
 * Output: escreve um índice derivado em data/recommendations.json no
 * formato { generated_at, k, map: { ean: [ean,...topK] } }. Fica FORA do
 * seed-bundle.json de propósito — é dado relacional/derivado, mantém o seed
 * leve (~33MB) e o git limpo, e o front-end carrega-o on-demand quando
 * passar a mostrar similares. Não-destrutivo e idempotente. Como salvaguarda,
 * remove qualquer `product.similar` herdado de versões antigas do seed.
 *
 * Uso:
 *   node scripts/build-recommendations.js
 *   node scripts/build-recommendations.js --dry-run
 *   node scripts/build-recommendations.js --k=8
 */

const fs = require('fs');
const path = require('path');
const { stripAccents, normalizeBrand } = require('./lib/product-fingerprint');

const ROOT = path.resolve(__dirname, '..');
const SEED_BUNDLE = path.join(ROOT, 'data', 'seed-bundle.json');
const RECS_FILE = path.join(ROOT, 'data', 'recommendations.json');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const DRY_RUN = !!args['dry-run'];
const K = args.k ? parseInt(args.k, 10) : 8;
// Tuning de candidatos: ignora tokens demasiado genéricos (aparecem em
// muitos docs → não distinguem) e limita o tamanho de cada posting list.
const MAX_DF_RATIO = 0.25;     // token presente em >25% dos docs = stopword de facto
const MIN_DF = 2;              // token único não liga nada
const MAX_POSTING = 400;       // candidatos por token (os de maior peso TF-IDF)
const MIN_SIM = 0.04;          // similaridade mínima para sugerir

// Stopwords PT/EN/ES/FR + ruído de marketing que sobra das descrições.
const STOP = new Set((
  'a o e de da do das dos para com sem que uma um uns umas as os no na nos nas ' +
  'pele rosto corpo cabelo produto pode ajuda ajudar efeito accao acao aspecto ' +
  'mais muito sua seu seus suas este esta estes estas pela pelo todos todas ' +
  'the and for with your you skin hair care our this that from are has have ' +
  'los las una uno por con sin que del para como muy piel cabello ' +
  'le la les des une pour avec sans qui votre vous peau ' +
  'produto formula formulado especialmente ideal proporciona deixa graças ' +
  'ml gr kg utilizar utilizacao aplicar aplique modo uso'
).split(/\s+/));

function tokenize(text) {
  if (!text) return [];
  return stripAccents(String(text).toLowerCase())
    .replace(/[^a-z0-9+]+/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
}

(function main() {
  const t0 = Date.now();
  const seed = JSON.parse(fs.readFileSync(SEED_BUNDLE, 'utf8'));
  const products = seed.products;
  const N = products.length;
  console.log(`📦 Seed: ${N} produtos · K=${K}\n`);

  // ── 1) Tokenizar cada produto + document frequency ───────────────────
  const docTf = new Array(N);        // Map token→count
  const df = new Map();              // token→nº docs
  const cat = new Array(N);
  for (let i = 0; i < N; i++) {
    const p = products[i];
    cat[i] = p.category || '(none)';
    // Nome conta a dobrar (sinal mais limpo que a descrição).
    const toks = tokenize(p.name).concat(tokenize(p.name)).concat(tokenize(p.description));
    const brand = normalizeBrand(p.brand);
    if (brand) toks.push('brand_' + brand);     // marca como token dedicado
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    docTf[i] = tf;
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  }

  // ── 2) IDF + vectores TF-IDF normalizados (unit length) ──────────────
  const idf = new Map();
  for (const [t, d] of df) idf.set(t, Math.log(N / d));
  const vec = new Array(N);          // Map token→weight (normalizado)
  for (let i = 0; i < N; i++) {
    const v = new Map();
    let norm = 0;
    for (const [t, c] of docTf[i]) {
      const w = (1 + Math.log(c)) * idf.get(t);
      v.set(t, w); norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of v) v.set(t, w / norm);
    vec[i] = v;
  }

  // ── 3) Índice invertido (token→docs) só com tokens distintivos ───────
  const maxDf = Math.floor(N * MAX_DF_RATIO);
  const postings = new Map();        // token→[{i, w}]
  for (let i = 0; i < N; i++) {
    for (const [t, w] of vec[i]) {
      const d = df.get(t);
      if (d < MIN_DF || d > maxDf) continue;
      (postings.get(t) || postings.set(t, []).get(t)).push({ i, w });
    }
  }
  // Manter só os candidatos de maior peso por token (limita custo).
  for (const [t, arr] of postings) {
    if (arr.length > MAX_POSTING) {
      arr.sort((a, b) => b.w - a.w);
      postings.set(t, arr.slice(0, MAX_POSTING));
    }
  }

  // ── 4) Para cada produto, juntar candidatos e pontuar por cosseno ────
  const map = {};                    // ean → [ean,...topK]
  let strayCleaned = 0;
  let withSim = 0, totalPairs = 0;
  for (let i = 0; i < N; i++) {
    // Salvaguarda: limpar `similar` herdado de versões antigas do seed.
    if (products[i].similar !== undefined) { delete products[i].similar; strayCleaned++; }
    const myVec = vec[i];
    if (myVec.size === 0) continue;
    // Usar os tokens de maior peso deste doc para ir buscar candidatos.
    const myTokens = [...myVec.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    const scores = new Map();        // j→dot
    for (const [t] of myTokens) {
      const post = postings.get(t);
      if (!post) continue;
      const wi = myVec.get(t);
      for (const { i: j, w: wj } of post) {
        if (j === i || cat[j] !== cat[i]) continue;
        scores.set(j, (scores.get(j) || 0) + wi * wj);
      }
    }
    totalPairs += scores.size;
    const top = [...scores.entries()]
      .filter(([, s]) => s >= MIN_SIM)
      .sort((a, b) => b[1] - a[1])
      .slice(0, K)
      .map(([j]) => products[j].ean);
    if (top.length) { map[products[i].ean] = top; withSim++; }
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const avgCand = (totalPairs / N).toFixed(0);
  console.log('══════ Resultado ══════');
  console.log(`  Produtos com ≥1 similar: ${withSim}/${N} (${Math.round(withSim / N * 100)}%)`);
  console.log(`  Candidatos médios avaliados/produto: ${avgCand}`);
  console.log(`  Tempo: ${secs}s`);

  if (strayCleaned) console.log(`  (limpos ${strayCleaned} campos \`similar\` herdados do seed antigo)`);

  if (DRY_RUN) {
    // Amostra de qualidade
    console.log('\n── Amostra ──');
    const byEan = {}; for (const p of products) byEan[p.ean] = p;
    for (const i of [0, Math.floor(N / 3), Math.floor(N / 2)]) {
      const p = products[i];
      console.log(`\n▸ ${p.brand || '?'} — ${(p.name || '').slice(0, 55)}  [${p.category}]`);
      for (const e of (map[p.ean] || []).slice(0, 4)) {
        const s = byEan[e];
        if (s) console.log(`    ↳ ${s.brand || '?'} — ${(s.name || '').slice(0, 55)}`);
      }
    }
    console.log('\n[DRY-RUN] Não escrito.');
    return;
  }

  // Índice de recomendações (ficheiro separado, derivado).
  const out = { generated_at: new Date().toISOString(), k: K, count: Object.keys(map).length, map };
  fs.writeFileSync(RECS_FILE, JSON.stringify(out), 'utf8');
  const recMb = (fs.statSync(RECS_FILE).size / 1024 / 1024).toFixed(1);
  console.log(`\n✓ ${RECS_FILE.replace(ROOT, '.')} (${recMb} MB · ${out.count} produtos)`);

  // Se removemos `similar` herdado, reescrever o seed limpo (volta a ~33MB).
  if (strayCleaned) {
    fs.writeFileSync(SEED_BUNDLE, JSON.stringify(seed), 'utf8');
    const seedMb = (fs.statSync(SEED_BUNDLE).size / 1024 / 1024).toFixed(1);
    console.log(`✓ ${SEED_BUNDLE.replace(ROOT, '.')} re-escrito sem \`similar\` (${seedMb} MB)`);
  }
})();
