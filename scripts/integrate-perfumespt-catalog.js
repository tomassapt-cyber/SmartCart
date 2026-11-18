'use strict';
// CosMath — integração da Perfumes.pt (Iperfumes): só ofertas em produtos que o catálogo já tem
// (scripts/lib/integrar-existentes.js). Uso: node scripts/integrate-perfumespt-catalog.js [--dry-run]
const { executar } = require('./lib/integrar-existentes');

const LOJA = { slug: 'perfumespt', name: 'Perfumes.pt', base_url: 'https://www.perfumes.pt/pt', urlPrefix: 'https://www.perfumes.pt/pt/', semCodigosInternos: true };

if (require.main === module) executar(LOJA);
module.exports = { LOJA };
