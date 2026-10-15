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
 *
 * FASE 5 DO PLANO DOS PORTES (2026-10-15, decisão do Tomás): o carrinho só usa
 * portes VERIFICADOS. Tudo o que não está no store-shipping.json fica null =
 * «Portes calculados no checkout» — nunca o valor que o integrador adivinhou
 * (49 €/3,95 €) nem o do continente copiado para as ilhas. Antes desta data,
 * um campo ausente mantinha o valor adivinhado (gratis, casa) ou copiava o de
 * casa (ilhas, gratis_ilhas). Campos:
 *   gratis        número = grátis a partir daí; null = nunca; ausente = não se
 *                 sabe → null (nunca se promete grátis sem verificação)
 *   casa          número = tarifa do continente; null/ausente = desconhecida
 *   ilhas         número = tarifa da Madeira e Açores (vale mesmo sem 'casa');
 *                 null/ausente = desconhecida
 *   gratis_ilhas  limiar PRÓPRIO das ilhas, sempre explícito em shipping_zones
 *                 (o carrinho só cai no limiar geral quando a chave falta):
 *                 número = grátis nas ilhas a partir daí; null/ausente = nunca
 * Uma loja com tarifa desconhecida mas limiar verificado continua a entrar no
 * carrinho quando o cabaz chega ao limiar (portes 0 €, sabidos) — ver
 * portesCalculaveis() no demo.html.
 * @param {object} seedJson  objeto do seed com .stores
 * @param {string} root      raiz do repo (onde vive data/store-shipping.json)
 * @returns {{aplicadas:number, total:number, casaDesconhecida:number}}
 */
function applyVerifiedShipping(seedJson, root) {
  const ficheiro = path.join(root, 'data', 'store-shipping.json');
  if (!fs.existsSync(ficheiro)) return { aplicadas: 0, total: 0, casaDesconhecida: 0 };
  let ship;
  try { ship = JSON.parse(fs.readFileSync(ficheiro, 'utf8')); } catch { return { aplicadas: 0, total: 0, casaDesconhecida: 0 }; }

  const num = x => typeof x === 'number' && Number.isFinite(x);
  let aplicadas = 0, total = 0, casaDesconhecida = 0;
  for (const st of (seedJson.stores || [])) {
    if (ship[st.slug]) total++;
    const v = ship[st.slug] || {};   // sem entrada = nada verificado
    let tocada = false;
    // 'gratis': null = verificado que a loja NUNCA dá portes grátis (tem de
    // ficar null, senão sobrevive a sentinela 9999 do seed, 2026-07-29).
    const gratis = 'gratis' in v ? v.gratis : null;
    if (st.free_shipping_threshold !== gratis) { st.free_shipping_threshold = gratis; tocada = true; }
    // 'ilhas': null = verificado que não se sabe (não envia, ou cobra por peso).
    const zonas = {
      mainland: num(v.casa) ? v.casa : null,
      madeira: num(v.ilhas) ? v.ilhas : null,
      acores: num(v.ilhas) ? v.ilhas : null,
      gratis_ilhas: 'gratis_ilhas' in v ? v.gratis_ilhas : null,
    };
    if (zonas.mainland == null) casaDesconhecida++;
    if (JSON.stringify(st.shipping_zones || null) !== JSON.stringify(zonas)) { st.shipping_zones = zonas; tocada = true; }
    if (v.ponto != null && st.pickup_cost !== v.ponto) {
      st.pickup_cost = v.ponto;
      st.pickup_note = v.ponto_txt || null;
      tocada = true;
    }
    // A nota pode mudar sem mudar o custo (ex.: novo limiar gratuito).
    if (v.ponto != null && st.pickup_note !== (v.ponto_txt || null)) {
      st.pickup_note = v.ponto_txt || null;
      tocada = true;
    }
    if (tocada) aplicadas++;
  }
  return { aplicadas, total, casaDesconhecida };
}

module.exports = { applyVerifiedShipping };

