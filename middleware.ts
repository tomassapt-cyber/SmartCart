import {createHandler} from './lib/seo-edge.mjs';
// Só preview de medição: não integrar. As respostas têm noindex e no-store.
export const config={runtime:'edge',matcher:'/produto/:path*'};
export default createHandler();
