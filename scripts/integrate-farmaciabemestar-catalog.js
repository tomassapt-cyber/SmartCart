#!/usr/bin/env node
/**
 * CosMath — Integrate Farmácia BemEstar catalog · loja 96
 * 0,99× a mediana (amostra de 110 fichas, 90 com EAN direto ou via CNP), a mais barata em 14%, 37% de produtos novos.
 * PORTES: "Custo de envio 3,94€ ou grátis para compras superiores a 38,60€" (cabeçalho do site, 2026-10-01). Ilhas não publicadas → o mesmo.
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farmaciabemestar',
  criarDermo: true,
  marcaLixo: /^farm[aá]cia ?bem ?estar$/i,
  loja: {
    name: 'Farmácia BemEstar',
    base_url: 'https://farmaciabemestar.pt',
    free_shipping_threshold: 38.6,
    shipping_zones: { mainland: 3.94, madeira: 3.94, acores: 3.94 },
  },
});
