#!/usr/bin/env node
// ============================================================================
// build-scan-index.js — índice de tokens DISTINTIVOS das descrições, por EAN
// ============================================================================
// O scan por foto da FRENTE cruza o texto OCR com: marca (léxico), volume, SPF,
// tokens do nome e — via este ficheiro — as DESCRIÇÕES dos produtos (que vivem
// no seed mas nunca chegavam ao browser). Guardamos só tokens DISTINTIVOS
// (df entre 2 e 3% dos produtos): raros o suficiente para discriminar, comuns
// o suficiente para não serem ruído de OCR. Resultado: mapa { ean: "tok tok…" }
// que o labelMatchOCR consulta com indexOf. Servido estático pelo Vercel,
// carregado lazy quando o scanner abre o modo Frente.
//
// USO: node scripts/build-scan-index.js  →  data/scan-index.json
// ============================================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed-bundle.json');
const OUT = path.join(ROOT, 'data', 'scan-index.json');

// mesma normalização do front-end (_hnorm): minúsculas, sem acentos
function hnorm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// palavras genéricas de marketing/cosmética que NÃO discriminam (espelham
// BRAND_GENERIC + stop do demo.html, alargadas ao vocabulário das descrições)
const STOP = new Set([
  'para', 'com', 'sem', 'por', 'the', 'and', 'pour', 'avec', 'les', 'des', 'net', 'www',
  'http', 'https', 'made', 'italy', 'france', 'paris', 'este', 'esta', 'seus', 'suas',
  'creme', 'crema', 'cream', 'serum', 'soro', 'leite', 'lait', 'milk', 'oleo', 'huile',
  'agua', 'aqua', 'spray', 'balsamo', 'locao', 'lotion', 'body', 'corpo', 'rosto', 'face',
  'facial', 'skin', 'pele', 'hair', 'cabelo', 'care', 'natural', 'nature', 'beauty',
  'cosmetics', 'laboratoires', 'solar', 'protecao', 'protetor', 'protector', 'hidratante',
  'hidratacao', 'hidrata', 'formula', 'produto', 'produtos', 'ajuda', 'ajudar', 'accao',
  'accion', 'action', 'efeito', 'efeitos', 'ideal', 'diaria', 'diario', 'todos', 'todas',
  'mais', 'muito', 'muita', 'bem', 'sua', 'seu', 'que', 'uma', 'das', 'dos', 'nas', 'nos',
  'aos', 'ate', 'como', 'tipo', 'usar', 'aplicar', 'aplique', 'utilizacao', 'utilizar',
  'contem', 'ingredientes', 'beneficios', 'resultado', 'resultados', 'ainda', 'tambem',
  'antes', 'depois', 'zona', 'zonas', 'area', 'areas', 'toque', 'textura', 'suave',
  'delicada', 'delicado', 'perfeito', 'perfeita', 'nova', 'novo', 'linha', 'gama',
  'especial', 'especialmente', 'graças', 'gracas', 'permite', 'proporciona', 'oferece',
  'deixa', 'deixando', 'sensacao', 'aspecto', 'aspeto', 'noite', 'manha', 'dia', 'dias',
]);

function tokenize(s) {
  return hnorm(s).split(/[^a-z0-9+]+/).filter(t => t.length >= 5 && !STOP.has(t) && !/^\d+$/.test(t));
}

function main() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const arr = seed.products || seed;
  const N = arr.length;

  // Passo 1: frequência de documento (df) de cada token nas descrições
  const df = new Map();
  const perProduct = [];
  for (const p of arr) {
    const d = p.description || p.desc || '';
    if (!p.ean || !d || d.length < 30) { perProduct.push(null); continue; }
    // remove marca+nome (já são casados por outro sinal) para ficar só o extra
    const nameToks = new Set(tokenize((p.name || '') + ' ' + (p.brand || '')));
    const toks = new Set(tokenize(d));
    perProduct.push({ ean: p.ean, toks, nameToks });
    for (const t of toks) df.set(t, (df.get(t) || 0) + 1);
  }

  // limiar: distintivo = aparece em ≥2 produtos mas ≤3% do catálogo
  const dfMax = Math.max(8, Math.floor(N * 0.03));
  const index = {};
  let kept = 0, totalToks = 0;
  for (const pp of perProduct) {
    if (!pp) continue;
    const chosen = [];
    for (const t of pp.toks) {
      const f = df.get(t) || 0;
      if (f < 2 || f > dfMax) continue;      // nem hapax nem genérico
      if (pp.nameToks.has(t)) continue;       // já casado pelo nome
      chosen.push(t);
      if (chosen.length >= 24) break;         // teto por produto (tamanho)
    }
    if (chosen.length) {
      index[pp.ean] = chosen.join(' ');
      kept++;
      totalToks += chosen.length;
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(index));
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`✅ scan-index: ${kept} produtos · ${Math.round(totalToks / Math.max(1, kept))} tokens/produto · ${kb} KB → ${OUT}`);
  console.log(`   (df máx distintivo: ${dfMax}; de ${N} produtos, ${perProduct.filter(Boolean).length} com descrição útil)`);
}

main();
