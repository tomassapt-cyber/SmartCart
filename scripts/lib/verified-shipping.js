// Portes VERIFICADOS à mão (data/store-shipping.json) — fonte de verdade.
//
// PORQUÊ ESTA LIB (2026-07-28): este overlay só existia dentro do
// scripts/inject-seed-into-demo.js, ou seja só era aplicado ao SITE. O
// scripts/push-catalog-to-db.js lia o seed cru, portanto a BD — e com ela o
// catálogo novo (app.html) — ficava com os defaults adivinhados pelos
// integradores (49€/3,95€). Resultado medido: 33 das 62 lojas com portes
// verificados mostravam valores errados no /app, incluindo promessas falsas
// ("portes grátis a partir de 39€" numa loja onde são 60€). Como o site vive
// de comparar preço + portes, isto corrompia a funcionalidade central.
//
// Agora vive num sítio só e os dois consumidores chamam a MESMA função.
// NÃO-destrutivo: altera o seed EM MEMÓRIA; o data/seed-bundle.json fica
// intacto e qualquer refresh de bot volta a ter os valores re-impostos.
const fs = require('fs');
const path = require('path');

/**
 * Aplica os portes verificados às lojas do seed (em memória).
 * @param {object} seedJson  objeto do seed com .stores
 * @param {string} root      raiz do repo (onde vive data/store-shipping.json)
 * @returns {{aplicadas:number, total:number}}
 */
function applyVerifiedShipping(seedJson, root) {
  const ficheiro = path.join(root, 'data', 'store-shipping.json');
  if (!fs.existsSync(ficheiro)) return { aplicadas: 0, total: 0 };
  let ship;
  try { ship = JSON.parse(fs.readFileSync(ficheiro, 'utf8')); } catch { return { aplicadas: 0, total: 0 }; }

  let aplicadas = 0, total = 0;
  for (const st of (seedJson.stores || [])) {
    const v = ship[st.slug];
    if (!v) continue;
    total++;
    let tocada = false;
    // 'gratis' AUSENTE = não verificado (não mexer).
    // 'gratis': null PRESENTE = verificado e a loja NUNCA dá portes grátis →
    // tem de ficar null, senão sobrevive a sentinela do seed (o Continente
    // tinha 9999 e o /app anunciava "grátis ≥ 9999,00 €", que é absurdo).
    // São 6 lojas: docmorris, poupafarma, hiperfarma, pharmee, continente,
    // farmaciagarcia. (2026-07-29)
    if ('gratis' in v && st.free_shipping_threshold !== v.gratis) {
      st.free_shipping_threshold = v.gratis; tocada = true;
    }
    if (v.casa != null) {
      st.shipping_zones = st.shipping_zones || {};
      const ilhas = v.ilhas != null ? v.ilhas : v.casa;
      if (st.shipping_zones.mainland !== v.casa || st.shipping_zones.madeira !== ilhas || st.shipping_zones.acores !== ilhas) {
        st.shipping_zones.mainland = v.casa;
        st.shipping_zones.madeira = ilhas;
        st.shipping_zones.acores = ilhas;
        tocada = true;
      }
    }
    if (v.ponto != null && st.pickup_cost !== v.ponto) {
      st.pickup_cost = v.ponto;
      st.pickup_note = v.ponto_txt || null;
      tocada = true;
    }
    if (tocada) aplicadas++;
  }
  return { aplicadas, total };
}

module.exports = { applyVerifiedShipping };
