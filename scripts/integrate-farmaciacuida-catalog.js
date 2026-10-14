'use strict';
// CosMath — integração da Farmácia Cuida: só ofertas em produtos que o catálogo já tem
// (scripts/lib/integrar-existentes.js). Uso: node scripts/integrate-farmaciacuida-catalog.js [--dry-run]
const { executar } = require('./lib/integrar-existentes');

const LOJA = { slug: 'farmaciacuida', name: 'Farmácia Cuida', base_url: 'https://farmaciacuida.com', urlPrefix: 'https://farmaciacuida.com/products/', semCodigosInternos: true };

if (require.main === module) executar(LOJA);
module.exports = { LOJA };
