#!/usr/bin/env node
/**
 * CosMath — Integrate Farmácia 24 catalog · loja 88
 * farmácia online (Shopify, site em pt-PT), ~3.080 produtos; EAN no barcode em ~79% e CNP no sku em todos. 1,04× a mediana — preço de mercado; entra para alargar a comparação.
 * PORTES: 3,99 € continente, 7,90 € ilhas, grátis no continente a partir de 40 € (simulação de carrinho, 2026-10-01).
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farmacia24',
  criarDermo: true,
  marcaLixo: /^farm[aá]cia ?24$/i,
  loja: {
    name: 'Farmácia 24',
    base_url: 'https://farmacia24.com',
    free_shipping_threshold: 40,
    shipping_zones: { mainland: 3.99, madeira: 7.90, acores: 7.90 },
  },
});
