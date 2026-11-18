'use strict';
// CosMath — integração da Farmácia Santos Salvador (farmaciass.pt): só ofertas em produtos que o
// catálogo já tem (scripts/lib/integrar-existentes.js). Uso: node scripts/integrate-farmaciass-catalog.js [--dry-run]
const { executar } = require('./lib/integrar-existentes');

const LOJA = { slug: 'farmaciass', name: 'Farmácia Santos Salvador', base_url: 'https://www.farmaciass.pt', urlPrefix: 'https://www.farmaciass.pt/', semCodigosInternos: true };

if (require.main === module) executar(LOJA);
module.exports = { LOJA };
