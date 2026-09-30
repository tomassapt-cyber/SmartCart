#!/usr/bin/env node
/**
 * CosMath — Integrate Farmácia em Casa catalog · loja 81
 * 1,23× a mediana (medido por CNP) — cara, mas entra para alargar a comparação; sku = CNP, vendor = marca.
 * PORTES: 3,00 € continente, 10,00 € ilhas, grátis a partir de 30 € (simulação de carrinho, 2026-09-30).
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farmaciaemcasa',
  criarDermo: true,
  marcaLixo: /^farm[aá]cia em casa$/i,
  loja: {
    name: 'Farmácia em Casa',
    base_url: 'https://farmaciaemcasa.pt',
    free_shipping_threshold: 30,
    shipping_zones: { mainland: 3.00, madeira: 10.00, acores: 10.00 },
  },
});
