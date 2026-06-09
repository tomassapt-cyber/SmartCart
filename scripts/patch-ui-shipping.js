#!/usr/bin/env node
/**
 * Aplica as edições da UI de portes/região ao demo.html (fonte-de-verdade que
 * o inject-seed-into-demo.js copia para index/catalogo). Idempotente: se já
 * estiver aplicado, não duplica. Falha ruidosamente se um alvo não existir.
 */
const fs = require('fs');
const path = require('path');
const DEMO = path.join(__dirname, '..', 'demo.html');
let html = fs.readFileSync(DEMO, 'utf8');
const EOL = html.includes('\r\n') ? '\r\n' : '\n';
const toEol = s => s.split('\n').join(EOL);

const edits = [
  {
    name: 'zone-selector-header',
    find: `      <p id="results-summary">Analisado em tempo real · preços + portes incluídos</p>
      <button class="results-modal-close" id="results-close" aria-label="Fechar">×</button>`,
    repl: `      <p id="results-summary">Analisado em tempo real · preços + portes incluídos</p>
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;color:#475569">
        <span>🚚 Entregar em:</span>
        <select id="zone-select" onchange="setDeliveryZone(this.value)" aria-label="Região de entrega" style="font:inherit;padding:3px 8px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer">
          <option value="nacional">Portugal Continental</option>
          <option value="Madeira">Madeira</option>
          <option value="Açores">Açores</option>
        </select>
        <span style="color:#94a3b8">os portes ajustam-se à tua região</span>
      </div>
      <button class="results-modal-close" id="results-close" aria-label="Fechar">×</button>`,
    already: `id="zone-select"`,
  },
  {
    name: 'bundleState-zone',
    find: `const bundleState = { items: new Map() };  // ean -> qty`,
    repl: `const bundleState = { items: new Map(), zone: 'nacional' };  // ean -> qty
// Região de entrega — persistida (tipo "perfil") para ajustar os portes.
try { const z = localStorage.getItem('gm_zone'); if (z) bundleState.zone = z; } catch (e) {}
function setDeliveryZone(zone) {
  bundleState.zone = zone;
  try { localStorage.setItem('gm_zone', zone); } catch (e) {}
  if (bundleState.items.size) runAnalysis();   // re-analisa com a nova zona
}`,
    already: `function setDeliveryZone(`,
  },
  {
    name: 'runAnalysis-zone',
    find: `  const { solutions, uncovered } = optimizeBundle(items);
  renderResults(solutions, uncovered, items);`,
    repl: `  const { solutions, uncovered } = optimizeBundle(items, bundleState.zone);
  renderResults(solutions, uncovered, items);
  const zsel = document.getElementById('zone-select');
  if (zsel) zsel.value = bundleState.zone;`,
    already: `optimizeBundle(items, bundleState.zone)`,
  },
  {
    name: 'shippingLabel-neverfree',
    find: `  const shippingLabel = b.free_shipping
    ? '<span class="free-ship">Envio grátis ✓</span>'
    : \`Portes: \${b.shipping.toFixed(2)}€\`;`,
    repl: `  const storeThr = STORE_BY_SLUG[b.store_slug]?.free_shipping_threshold ?? Infinity;
  const neverFree = storeThr >= 9999;   // sentinela: loja sem portes grátis
  const shippingLabel = b.free_shipping
    ? '<span class="free-ship">Envio grátis ✓</span>'
    : \`Portes: \${b.shipping.toFixed(2)}€\${neverFree ? ' <span style="color:#94a3b8">(sem portes grátis)</span>' : ''}\`;`,
    already: `const neverFree = storeThr >= 9999;`,
  },
  {
    name: 'upsell-sentinel',
    find: `  const threshold = store?.free_shipping_threshold ?? 0;
  if (!threshold || threshold === Infinity) return '';`,
    repl: `  const threshold = store?.free_shipping_threshold ?? 0;
  if (!threshold || threshold >= 9999) return '';   // sem limite / nunca grátis (sentinela)`,
    already: `if (!threshold || threshold >= 9999) return '';`,
  },
];

let applied = 0, skipped = 0;
for (const e of edits) {
  if (html.includes(toEol(e.already))) { console.log(`• ${e.name}: já aplicado, ignorado`); skipped++; continue; }
  const find = toEol(e.find);
  if (!html.includes(find)) { console.error(`✗ ${e.name}: ALVO NÃO ENCONTRADO — abortar (nada gravado)`); process.exit(1); }
  html = html.replace(find, toEol(e.repl));
  console.log(`✓ ${e.name}: aplicado`);
  applied++;
}
if (applied) { fs.writeFileSync(DEMO, html, 'utf8'); console.log(`\n${applied} edições gravadas em demo.html (${skipped} já existiam).`); }
else console.log(`\nNada a fazer (${skipped} já aplicadas).`);
