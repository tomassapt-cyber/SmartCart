#!/usr/bin/env node
/**
 * CosMath — Integrate Farmácia da Liga catalog · loja 94
 * ======================================================
 * Feed do KuantoKusta: EAN em ~89% e CNP em quase todos. 1,08× a mediana, a
 * mais barata em 7% dos comuns, 36% de EAN novos (feed inteiro, 2026-10-01).
 *
 * PORTES (página /ajuda/prazos-custos-entrega.html, 2026-10-01): CTT no
 * continente 4 € (3,35 € em ponto de recolha), grátis acima de 45 €. Madeira e
 * Açores: "calculado consoante o peso, no momento do checkout" — 8,90 € é uma
 * ESTIMATIVA (o CTT Expresso Ilhas de outras lojas ronda 8,90-8,93 €); não se
 * preenchem checkouts de lojas reais. TODO: confirmar.
 *
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farmaciadaliga',
  criarDermo: true,
  marcaLixo: /^farm[aá]cia da liga$/i,
  loja: {
    name: 'Farmácia da Liga',
    base_url: 'https://www.farmaciadaliga.pt',
    free_shipping_threshold: 45,
    shipping_zones: { mainland: 4.00, madeira: 8.90, acores: 8.90 },
  },
});
