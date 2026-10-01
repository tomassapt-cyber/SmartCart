#!/usr/bin/env node
/**
 * CosMath — Integrate Farmácia Rodrigues catalog · loja 97
 * Braga; 1,05× a mediana (amostra de 110 fichas, 74 com EAN), a mais barata em 12%, 43% de produtos novos.
 * PORTES: "Envios grátis a partir de 39€ (Portugal continental)" (cabeçalho do site). O valor base NÃO está publicado: 3,95 € é o da Aveirofarma (mesma plataforma, verificado) — ESTIMATIVA. TODO: confirmar.
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farmaciarodrigues',
  criarDermo: true,
  marcaLixo: /^farm[aá]cia rodrigues$/i,
  loja: {
    name: 'Farmácia Rodrigues',
    base_url: 'https://farmaciarodrigues.pt',
    free_shipping_threshold: 39,
    shipping_zones: { mainland: 3.95, madeira: 3.95, acores: 3.95 },
  },
});
