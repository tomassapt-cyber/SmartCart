#!/usr/bin/env node
/**
 * CosMath — Integrate Farmácia Barata catalog · loja 79
 * =====================================================
 * Farmácia espanhola com site PT; EAN (gtin13) na ficha. 0,98× a mediana,
 * a mais barata em 28% dos comuns (2026-09-28).
 *
 * PORTES: a página de envios da loja é a da versão espanhola traduzida — 3,95 €
 * e grátis a partir de 60 € — e NÃO fala de Portugal. Estes valores não estão
 * confirmados para envios para cá; por isso não há entrada em
 * data/store-shipping.json (lá, ausente = "não verificado").
 *
 * Lógica partilhada das farmácias — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farmaciabarata',
  criarDermo: true,
  marcaLixo: /^farm[aá]cia ?barata$/i,
  loja: {
    name: 'Farmácia Barata',
    base_url: 'https://www.farmaciabarata.pt',
    free_shipping_threshold: 60,
    shipping_zones: { mainland: 3.95, madeira: 3.95, acores: 3.95 },
  },
});
