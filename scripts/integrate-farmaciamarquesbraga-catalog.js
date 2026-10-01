#!/usr/bin/env node
/**
 * CosMath — Integrate Farmácia Marques Braga catalog · loja 98
 * Braga; 1,22× a mediana (amostra de 110 fichas, 84 com EAN), a mais barata em 4% — CARA, entra para alargar a comparação (46% de produtos novos).
 * PORTES: "Envios grátis a partir de 35€" (cabeçalho do site). O valor base NÃO está publicado: 3,95 € é o da Aveirofarma (mesma plataforma, verificado) — ESTIMATIVA. TODO: confirmar.
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farmaciamarquesbraga',
  criarDermo: true,
  marcaLixo: /^farm[aá]cia marques( braga)?$/i,
  loja: {
    name: 'Farmácia Marques Braga',
    base_url: 'https://farmaciamarquesbraga.pt',
    free_shipping_threshold: 35,
    shipping_zones: { mainland: 3.95, madeira: 3.95, acores: 3.95 },
  },
});
