#!/usr/bin/env node
/**
 * CosMath — Integrate Loja do Shampoo catalog · loja 80
 * =====================================================
 * Cabelo profissional + dermocosmética; EAN (gtin14) em todas as fichas.
 * 0,99× a mediana, a mais barata em 21% dos comuns, 53% de EAN novos
 * (2026-09-30).
 *
 * PORTES: o carrinho da loja diz "Faltam X € para oferta em pickup" → grátis a
 * partir de 45 € (entrega em ponto de recolha), confirmado com um carrinho de
 * 28,40 € ("Faltam 16,60 €"). O VALOR BASE NÃO ESTÁ CONFIRMADO: a loja só o
 * calcula no checkout, com morada, e não se preenchem checkouts de lojas reais.
 * 3,95 € é uma estimativa (valor típico de ponto de recolha em PT) — TODO:
 * confirmar e, confirmado, registar em data/store-shipping.json.
 *
 * Lógica partilhada — scripts/lib/integrar-farmacia.js (serve qualquer loja
 * com EAN; o CNP é opcional).
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'lojashampoo',
  criarDermo: true,
  marcaLixo: /^loja ?(do )?shampoo$/i,
  loja: {
    name: 'Loja do Shampoo',
    base_url: 'https://www.lojashampoo.pt',
    free_shipping_threshold: 45,
    shipping_zones: { mainland: 3.95, madeira: 3.95, acores: 3.95 },
  },
});
