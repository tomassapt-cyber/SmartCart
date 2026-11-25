'use strict';
/**
 * Como o CosMath se apresenta às lojas: sempre como o robô do CosMath, com o
 * endereço do site, e nunca como um browser (regra do projeto). Fica num só
 * sítio para não haver cópias que fiquem para trás.
 * Ver scripts/test-ua-honesto.cjs (nenhum ficheiro novo pode voltar ao UA de browser).
 */
const UA_COSMATH = 'CosMath-Catalog-Bot/1.0 (+https://smart-cart-zx55.vercel.app; price comparison)';

module.exports = { UA_COSMATH };
