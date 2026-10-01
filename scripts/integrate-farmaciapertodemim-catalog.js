#!/usr/bin/env node
/**
 * CosMath — Integrate Farmácia Perto de Mim catalog · loja 95
 * ===========================================================
 * Só CNP (sku), sem EAN. 1,18× a mediana, a mais barata em 5% (2026-10-01).
 *
 * PORTES (página /politica-de-compra, 2026-10-01): "encomendas inferiores a
 * 49€ o envio tem um preço de 4,50€, acima de 49€ é gratuito"; envia para o
 * continente e ilhas (a página não dá preço à parte para as ilhas → o mesmo).
 *
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farmaciapertodemim',
  criarDermo: true,
  marcaLixo: /^farm[aá]cia perto de mim$/i,
  loja: {
    name: 'Farmácia Perto de Mim',
    base_url: 'https://farmaciapertodemim.pt',
    free_shipping_threshold: 49,
    shipping_zones: { mainland: 4.50, madeira: 4.50, acores: 4.50 },
  },
});
