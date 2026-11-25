'use strict';
// CosMath — integração da Korean Skincare (koreanskincare.pt): só ofertas em produtos que o
// catálogo já tem (scripts/lib/integrar-existentes.js). Uso: node scripts/integrate-koreanskincare-catalog.js [--dry-run]
const { executar } = require('./lib/integrar-existentes');

const LOJA = { slug: 'koreanskincare', name: 'Korean Skincare', base_url: 'https://koreanskincare.pt', urlPrefix: 'https://koreanskincare.pt/', semCodigosInternos: true };

if (require.main === module) executar(LOJA);
module.exports = { LOJA };
