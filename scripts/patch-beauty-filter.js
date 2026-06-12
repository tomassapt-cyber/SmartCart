#!/usr/bin/env node
// Reforça o isBeautyUrl dos scrapers com filtro de keyword positivo: além do
// URL_BEAUTY_HINTS, recupera keywords sem-acento (champo!) + nomes de gama dermo
// que o filtro perdia. Idempotente.
const fs = require('fs');
const path = require('path');
const FILES = ['scrape-atida-catalog.js', 'scrape-farmacia365-catalog.js', 'scrape-farmaciapt-catalog.js'];
const DIR = path.join(__dirname);

const FIND = `function isBeautyUrl(url) {
  if (URL_EXCLUDE.test(url)) return false;
  return URL_BEAUTY_HINTS.test(url);
}`;
const REPL = `function isBeautyUrl(url) {
  if (URL_EXCLUDE.test(url)) return false;
  if (URL_BEAUTY_HINTS.test(url)) return true;
  // Recuperação: keywords sem-acento (champo!) + nomes de GAMA dermo que o
  // filtro positivo perdia (produtos nomeados só por marca+gama). +milhares.
  return /(champo|oleo|óleo|balsamo|bálsamo|fluido|emuls|espuma|desodoriz|syndet|anti.?queda|anti.?caspa|cica|atoderm|sebium|sensibio|cicaplast|lipikar|effaclar|hyseac|nutritic|toleriane|dercos|kerium|cleanance|hydrance|anthelios|bariederm|photoderm|pigmentbio|hydrabio|cytelium|cicalfate|nuxuriance|keratine|squalane|exomega|trixera|sensifluid)/i.test(url);
}`;

let n = 0;
for (const f of FILES) {
  const p = path.join(DIR, f);
  let s = fs.readFileSync(p, 'utf8');
  const EOL = s.includes('\r\n') ? '\r\n' : '\n';
  const find = FIND.split('\n').join(EOL), repl = REPL.split('\n').join(EOL);
  if (s.includes('GAMA dermo')) { console.log(`• ${f}: já aplicado`); continue; }
  if (!s.includes(find)) { console.error(`✗ ${f}: alvo não encontrado`); process.exit(1); }
  fs.writeFileSync(p, s.replace(find, repl), 'utf8');
  console.log(`✓ ${f}: reforçado`); n++;
}
console.log(`\n${n} scrapers reforçados.`);
