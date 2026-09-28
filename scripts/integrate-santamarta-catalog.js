#!/usr/bin/env node
/**
 * CosMath — Integrate Farmácia Santa Marta catalog · loja 77
 * ==========================================================
 * Farmácia PT em WooCommerce (Store API, ~2.900 produtos, sku = CNP).
 * 0,89× a mediana do mercado, a mais barata em 38% dos comuns (2026-09-28).
 *
 * PORTES (simulação de carrinho na própria loja, 2026-09-28): 5,00 € para
 * continente e ilhas; grátis a partir de 45 € (banner "Envios grátis a partir
 * de 45 €" e carrinho de 66 € com "Envio grátis").
 *
 * A lógica é a partilhada das farmácias — scripts/lib/integrar-farmacia.js.
 * Uso: node scripts/integrate-santamarta-catalog.js [--dry-run] [--no-inject]
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'santamarta',
  criarDermo: true,
  loja: {
    name: 'Farmácia Santa Marta',
    base_url: 'https://farmaciasantamarta.pt',
    free_shipping_threshold: 45,
    shipping_zones: { mainland: 5.00, madeira: 5.00, acores: 5.00 },
  },
});
