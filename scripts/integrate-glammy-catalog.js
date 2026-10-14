'use strict';
// CosMath — integração da Glammy: só ofertas em produtos que o catálogo já tem
// (scripts/lib/integrar-existentes.js). Uso: node scripts/integrate-glammy-catalog.js [--dry-run]
const { executar } = require('./lib/integrar-existentes');

const LOJA = { slug: 'glammy', name: 'Glammy', base_url: 'https://www.glammy.pt', urlPrefix: 'https://www.glammy.pt/pt/', semCodigosInternos: true };

if (require.main === module) executar(LOJA);
module.exports = { LOJA };
