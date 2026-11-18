'use strict';
// CosMath — integração da Coserty: só ofertas em produtos que o catálogo já tem
// (scripts/lib/integrar-existentes.js). Uso: node scripts/integrate-coserty-catalog.js [--dry-run]
const { executar } = require('./lib/integrar-existentes');

const LOJA = { slug: 'coserty', name: 'Coserty', base_url: 'https://www.coserty.com/pt', urlPrefix: 'https://www.coserty.com/pt/', semCodigosInternos: true };

if (require.main === module) executar(LOJA);
module.exports = { LOJA };
