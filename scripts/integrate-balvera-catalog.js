#!/usr/bin/env node
/**
 * CosMath — Integrate Balvera catalog · loja 91
 * =============================================
 * Perfumaria portuguesa; EAN (gtin) no JSON-LD. 1,00× a mediana, a mais barata
 * em 20% dos comuns, 49% de EAN novos (2026-10-01). Perfumes e maquilhagem
 * novos NÃO são criados (o classifyDermo só aceita cuidado de pele/corpo/
 * cabelo): entram como fonte de preço dos que já temos.
 *
 * PORTES (página /condicoes-de-envio, 2026-10-01): continente 3 €, grátis a
 * partir de 25 €; Açores e Madeira 15 €, sem portes grátis.
 *
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'balvera',
  criarDermo: true,
  marcaLixo: /^balvera$/i,
  loja: {
    name: 'Balvera',
    base_url: 'https://balvera.pt',
    free_shipping_threshold: 25,
    shipping_zones: { mainland: 3.00, madeira: 15.00, acores: 15.00 },
  },
});
