'use strict';
// CosMath — integração da Ilha dos Cosméticos: só ofertas em produtos que o catálogo já tem
// (scripts/lib/integrar-existentes.js). Uso: node scripts/integrate-ilhadoscosmeticos-catalog.js [--dry-run]
const { executar } = require('./lib/integrar-existentes');

const LOJA = { slug: 'ilhadoscosmeticos', name: 'Ilha dos Cosméticos', base_url: 'https://ilhadoscosmeticos.pt', urlPrefix: 'https://ilhadoscosmeticos.pt/products/' };

if (require.main === module) executar(LOJA);
module.exports = { LOJA };
