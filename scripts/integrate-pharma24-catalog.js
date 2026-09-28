#!/usr/bin/env node
/**
 * CosMath — Integrate Pharma24 catalog · loja 78
 * ===============================================
 * Farmácia PT, ~5.000 fichas; sku = CNP, mpn = EAN (quando existe).
 * 0,78× a mediana do mercado, a mais barata em 42% dos comuns (2026-09-28) —
 * o melhor canal de preço das candidatas desse dia.
 *
 * PORTES (Termos e Condições da loja, 2026-09-28): continente 3,98 € até 2 kg
 * (sobe com o peso), ilhas 8,40 € até 2 kg. Sem portes grátis → 9999, a
 * sentinela do site para "nunca grátis".
 *
 * A lógica é a partilhada das farmácias — scripts/lib/integrar-farmacia.js.
 * Uso: node scripts/integrate-pharma24-catalog.js [--dry-run] [--no-inject]
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'pharma24',
  criarDermo: true,
  marcaLixo: /^pharma ?24$/i,
  loja: {
    name: 'Pharma24',
    base_url: 'https://www.pharma24.pt',
    free_shipping_threshold: 9999,
    shipping_zones: { mainland: 3.98, madeira: 8.40, acores: 8.40 },
  },
});
