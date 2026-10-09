'use strict';
// CosMath — integração da SkinLovers: só ofertas em produtos que o catálogo já tem
// (scripts/lib/integrar-existentes.js). Uso: node scripts/integrate-skinlovers-catalog.js [--dry-run]
const { executar } = require('./lib/integrar-existentes');

const LOJA = { slug: 'skinlovers', name: 'SkinLovers', base_url: 'https://www.skinlovers.com/pt-pt', urlPrefix: 'https://www.skinlovers.com/pt-pt/products/' };

if (require.main === module) executar(LOJA);
module.exports = { LOJA };
