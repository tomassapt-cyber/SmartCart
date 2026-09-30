#!/usr/bin/env node
/**
 * CosMath — Integrate Glowthie catalog · loja 83
 * cosmética coreana, loja portuguesa (armazém no norte), 1,20× a mediana; EAN no barcode, vendor = marca.
 * PORTES: 3,99 € continente, 8,49 € ilhas (via marítima); grátis no continente entre 38,97 € e 51,96 € → 50 (simulação, 2026-09-30).
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'glowthie',
  criarDermo: true,
  marcaLixo: /^glowthie$/i,
  loja: {
    name: 'Glowthie',
    base_url: 'https://glowthie.com',
    free_shipping_threshold: 50,
    shipping_zones: { mainland: 3.99, madeira: 8.49, acores: 8.49 },
  },
});
