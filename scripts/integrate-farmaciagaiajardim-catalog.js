#!/usr/bin/env node
/**
 * CosMath — Integrate Farmácia Gaia Jardim catalog · loja 90
 * farmácia de Gaia (Shopify), ~7.500 produtos; CNP no sku em ~99% e EAN no barcode em ~2/3. 0,98× a mediana (amostra de 101 com EAN, 55 em comum), 46% de EAN novos.
 * PORTES: 3,90 € no continente em qualquer valor (carrinhos de 7 € a 200 €), não envia para as ilhas (simulação de carrinho, 2026-10-01).
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farmaciagaiajardim',
  criarDermo: true,
  marcaLixo: /gaia ?jardim/i,
  loja: {
    name: 'Farmácia Gaia Jardim',
    base_url: 'https://www.farmaciagaiajardim.com',
    free_shipping_threshold: 9999,
    shipping_zones: { mainland: 3.90, madeira: 3.90, acores: 3.90 },
  },
});
