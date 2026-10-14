'use strict';
// CosMath — integração da Lisbon Glam: só ofertas em produtos que o catálogo já tem
// (scripts/lib/integrar-existentes.js). Uso: node scripts/integrate-lisbonglam-catalog.js [--dry-run]
const { executar } = require('./lib/integrar-existentes');

const LOJA = { slug: 'lisbonglam', name: 'Lisbon Glam', base_url: 'https://lisbonglam.com', urlPrefix: 'https://lisbonglam.com/products/', semCodigosInternos: true };

if (require.main === module) executar(LOJA);
module.exports = { LOJA };
