#!/usr/bin/env node
/**
 * CosMath — Integrate Pharmácia do Cabelo catalog · loja 92
 * cabelo profissional (Kérastase, L'Oréal Professionnel, Redken, Wella, Moroccanoil…), Shopify, ~1.460 produtos; EAN no barcode, vendor = marca. 0,87× a mediana, a mais barata em 51% dos comuns, 59% de EAN novos (amostra de 111, 2026-10-01). ⚠️ Corta quem pede depressa (429 «Verifying your connection») — pausa de 1,5 s.
 * PORTES: 3,90 € continente (3,40 em ponto NACEX), 8,93 € ilhas (simulação de carrinho); grátis acima de 55 € no continente (desconto FREE_SHIPPING do carrinho — "Envio gratuito em encomendas superiores a 55€", página inicial, 2026-10-01).
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'pharmaciadocabelo',
  criarDermo: true,
  marcaLixo: /pharm[aá]cia do cabelo/i,
  loja: {
    name: 'Pharmácia do Cabelo',
    base_url: 'https://pharmaciadocabelo.com',
    free_shipping_threshold: 55,
    shipping_zones: { mainland: 3.90, madeira: 8.93, acores: 8.93 },
  },
});
