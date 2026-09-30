#!/usr/bin/env node
/**
 * CosMath — Integrate Orient Perfumes catalog · loja 82
 * perfumaria (inclui perfumes árabes), 1,24× a mediana — cara; EAN no barcode. Os perfumes novos NÃO são criados (o classifyDermo exclui perfumaria): entra como fonte de preço dos que já temos.
 * PORTES: 6,50 € para Portugal e ilhas, sem portes grátis até 80 € (simulação de carrinho, 2026-09-30).
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'orientperfumes',
  criarDermo: true,
  marcaLixo: /^orient ?perfumes$/i,
  loja: {
    name: 'Orient Perfumes',
    base_url: 'https://orientperfumes.pt',
    free_shipping_threshold: 9999,
    shipping_zones: { mainland: 6.50, madeira: 6.50, acores: 6.50 },
  },
});
