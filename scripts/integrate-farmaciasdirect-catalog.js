#!/usr/bin/env node
/**
 * CosMath — Integrate Farmaciasdirect catalog · loja 87
 * =====================================================
 * Farmácia espanhola com loja .pt em português; EAN tirado do sku (ver o
 * scraper). 0,95× a mediana, a mais barata em 19% dos comuns, 82% de EAN
 * novos (2026-10-01). Nomes em português → pode criar produtos dermo.
 *
 * PORTES (página "Custos de transporte" da loja, 2026-10-01): entrega ao
 * domicílio 3,99 € até 49 €, grátis acima; "Não efectuamos envios para as
 * ilhas da Madeira e Ilhas Açores" — o modelo de lojas não tem "não entrega",
 * fica o mesmo valor (como Auchan, Continente e Farma2Go).
 *
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farmaciasdirect',
  criarDermo: true,
  marcaLixo: /^farmacias ?direct$/i,
  loja: {
    name: 'Farmaciasdirect',
    base_url: 'https://www.farmaciasdirect.pt',
    free_shipping_threshold: 49,
    shipping_zones: { mainland: 3.99, madeira: 3.99, acores: 3.99 },
  },
});
