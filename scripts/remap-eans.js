#!/usr/bin/env node
// Sincroniza EANs no demo.html (IMAGE_OVERRIDES + PRODUCT_TAGS) com os EANs reais usados em build-catalog.js. Idempotente.
/**
 * Remapeia EANs sintéticos (2000xxx, legado) → EANs reais (GS1) usados
 * agora em scripts/build-catalog.js. Idempotente: se já estiverem nos
 * EANs reais, faz nada.
 *
 * Actualiza dois objectos em demo.html:
 *   - IMAGE_OVERRIDES   (URLs de Open Beauty Facts)
 *   - PRODUCT_TAGS      (tags do quiz Skincare)
 */
const fs = require('fs');
const path = require('path');

const DEMO = path.resolve(__dirname, '..', 'demo.html');

// Mapeamento sintético antigo → real (GS1 confirmado em build-catalog.js)
const REMAP = {
  '2000216165027': '3614271326072', // Lancôme Génifique
  '2000563037770': '0887167491625', // Estée Lauder ANR
  '2004335644463': '3337875585132', // Vichy Minéral 89
  '2008122273171': '3337875585026', // La Roche-Posay Effaclar Duo+
  '2002979924873': '3264680004605', // Nuxe Huile Prodigieuse
  '2002667535503': '3522930003151', // Caudalie Vinoperfect
  '2007714380778': '3337875597196', // CeraVe Creme Hidratante
};

let html = fs.readFileSync(DEMO, 'utf8');
let total = 0;
for (const [oldEan, newEan] of Object.entries(REMAP)) {
  const re = new RegExp(`["']${oldEan}["']`, 'g');
  const before = html;
  html = html.replace(re, `"${newEan}"`);
  const count = (before.match(re) || []).length;
  if (count > 0) {
    console.log(`  ${oldEan} → ${newEan} (${count} ocorrências)`);
    total += count;
  }
}

if (total === 0) {
  console.log('✔ Nenhum EAN sintético encontrado — já está sincronizado');
} else {
  fs.writeFileSync(DEMO, html, 'utf8');
  console.log(`✔ ${total} ocorrências remapeadas em ${DEMO}`);
}
