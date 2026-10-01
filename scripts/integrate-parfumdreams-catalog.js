#!/usr/bin/env node
/**
 * CosMath — Integrate Parfumdreams catalog · loja 89
 * ===================================================
 * Perfumaria alemã com loja PT; EAN (gtin13) em cada variante de tamanho.
 * 0,97× a mediana, a mais barata em 36% dos comuns, 85% de EAN novos
 * (2026-10-01). Os perfumes e a maquilhagem novos NÃO são criados (o
 * classifyDermo só aceita cuidado de pele/corpo/cabelo): entram como fonte de
 * preço dos que já temos; o cuidado de pele de marca (Shiseido, Clarins…) cria.
 *
 * PORTES (página /custos-de-envio, 2026-10-01): "Portugal 5,95 €", GLS, 5-6
 * dias úteis. Sem portes grátis (só com o plano pago PREMIUM) → 9999. As ilhas
 * não aparecem à parte: o mesmo valor.
 *
 * Lógica partilhada — scripts/lib/integrar-farmacia.js.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'parfumdreams',
  criarDermo: true,
  marcaLixo: /^parfumdreams$/i,
  loja: {
    name: 'Parfumdreams',
    base_url: 'https://www.parfumdreams.pt',
    free_shipping_threshold: 9999,
    shipping_zones: { mainland: 5.95, madeira: 5.95, acores: 5.95 },
  },
});
