// Nomes traduzidos para PT (data/translations.json → names: {ean: nome}).
//
// PORQUÊ ESTA LIB (2026-07-28): o overlay vivia inline no
// scripts/inject-seed-into-demo.js, ou seja só o SITE mostrava os nomes em
// português — a BD (e com ela o app.html) continuava a servir os nomes
// originais em ES/FR das lojas estrangeiras (druni, cocooncenter, pharma-gdd,
// perfumesclub…). Mesmo padrão do verified-shipping.js e do
// catalog-visibility.js: uma definição, dois consumidores.
//
// ⚠️ ORDEM CRÍTICA: a classificação (isNonCosmetic, fixCategory) e o
// fingerprint do dedup correm sobre o nome ORIGINAL. A tradução aplica-se
// SEMPRE DEPOIS dessas decisões — trocar a ordem parte a categorização e o
// matching entre lojas. É por isso que a lib expõe o mapa em separado
// (loadNameTranslations), para o sync poder traduzir só no fim.
//
// NÃO-destrutivo: o data/seed-bundle.json mantém o nome original.
const fs = require('fs');
const path = require('path');

/** @returns {Object<string,string>} mapa ean → nome PT (vazio se não houver) */
function loadNameTranslations(root) {
  const f = path.join(root, 'data', 'translations.json');
  if (!fs.existsSync(f)) return {};
  try { return (JSON.parse(fs.readFileSync(f, 'utf8')).names) || {}; }
  catch (e) { console.warn('⚠  translations.json names não aplicado:', e.message); return {}; }
}

/**
 * Aplica as traduções ao seed EM MEMÓRIA (usado pelo inject, onde já não há
 * mais nenhuma decisão dependente do nome original a seguir).
 */
function applyNameTranslations(seedJson, root) {
  const names = loadNameTranslations(root);
  let renamed = 0;
  for (const p of seedJson.products) {
    if (names[p.ean] && names[p.ean] !== p.name) { p.name = names[p.ean]; renamed++; }
  }
  return { renamed };
}

module.exports = { loadNameTranslations, applyNameTranslations };
