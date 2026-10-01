#!/usr/bin/env node
/**
 * CosMath — Integrate Farma2Go catalog · loja 86
 * ==============================================
 * Farmácia espanhola com site PT; preços em bloco + EAN guardado (ver o
 * scraper). 0,86× a mediana, a mais barata em 45% dos comuns (2026-10-01,
 * amostra pequena).
 *
 * criarDermo: FALSE — os nomes vêm em espanhol ("Champú"); criar produtos daqui
 * enchia o catálogo de nomes espanhóis. Entra só como fonte de preço, casada
 * por EAN (o fingerprint/fuzzy dificilmente casa espanhol com português, e
 * quando o faz exige marca e volume iguais).
 *
 * PORTES (simulação de carrinho, 2026-10-01): continente 3,50 € em casa (2,99 €
 * em ponto de recolha); NÃO envia para as ilhas — o modelo de lojas não tem
 * "não entrega", fica o mesmo valor (como Auchan e Continente). Limiar de
 * portes grátis para PT não medido (a loja limita a quantidade por produto e o
 * carrinho de teste não passou de ~10 €); 79 € é o de Espanha — estimativa.
 */
require('./lib/integrar-farmacia').integrarFarmacia({
  slug: 'farma2go',
  criarDermo: false,
  marcaLixo: /^farma ?2 ?go$/i,
  loja: {
    name: 'Farma2Go',
    base_url: 'https://farma2go.com/pt',
    free_shipping_threshold: 79,
    shipping_zones: { mainland: 3.50, madeira: 3.50, acores: 3.50 },
  },
});
