#!/usr/bin/env node
/**
 * CosMath — Integrate Mitso catalog · loja 84
 * a maior loja portuguesa só de cosmética coreana (Mitso, domínio occasion2smile.com), 1,19× a mediana; EAN no barcode. O vendor é o nome da loja; a marca vem no título ("SOMEBYMI - Produto - descrição").
 * PORTES: 4,20 € continente, 9,99 € ilhas; grátis no continente entre 50 € e 55 € → 55, pelo lado seguro (simulação, 2026-09-30).
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'mitso',
  criarDermo: true,
  marcaLixo: /occasion2smile|mitso/i,
  loja: {
    name: 'Mitso',
    base_url: 'https://occasion2smile.com',
    free_shipping_threshold: 55,
    shipping_zones: { mainland: 4.20, madeira: 9.99, acores: 9.99 },
  },
});
