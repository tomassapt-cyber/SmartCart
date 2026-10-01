#!/usr/bin/env node
/**
 * CosMath — Integrate MegaFarma catalog · loja 85
 * ===============================================
 * Farmácia PT; EAN (gtin) na maioria das fichas, CNP em todas. 0,99× a mediana,
 * a mais barata em 12% dos comuns (2026-10-01).
 *
 * PORTES: grátis a partir de 39,95 € no continente (banner do site). O valor
 * base NÃO está publicado; 3,95 € é o da Aveirofarma (mesma plataforma, valor
 * verificado em data/store-shipping.json) — estimativa. TODO: confirmar.
 *
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'megafarma',
  criarDermo: true,
  marcaLixo: /^mega ?farma$/i,
  loja: {
    name: 'MegaFarma',
    base_url: 'https://megafarma.pt',
    free_shipping_threshold: 39.95,
    shipping_zones: { mainland: 3.95, madeira: 3.95, acores: 3.95 },
  },
});
