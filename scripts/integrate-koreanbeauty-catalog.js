#!/usr/bin/env node
/**
 * CosMath — Integrate Korean Beauty catalog · loja 93
 * cosmética coreana (loja internacional com site .pt, envio DHL), Shopify, ~1.160 produtos; EAN no barcode, vendor = marca. 1,24× a mediana (amostra de 115, 71 em comum) — CARA, quase nunca a mais barata; entra para alargar a comparação (38% de EAN novos).
 * PORTES: 8,72-8,95 € no continente (DHL), não envia para as ilhas; grátis entre 48,65 € e 55,60 € → 55, pelo lado seguro (simulação de carrinho, 2026-10-01).
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'koreanbeauty',
  criarDermo: true,
  marcaLixo: /^korean ?beauty$/i,
  loja: {
    name: 'Korean Beauty',
    base_url: 'https://www.koreanbeauty.pt',
    free_shipping_threshold: 55,
    shipping_zones: { mainland: 8.95, madeira: 8.95, acores: 8.95 },
  },
});
