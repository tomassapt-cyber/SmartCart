// Correções às VARIANTES de volume — bugs de extração dos scrapers.
//
// PORQUÊ ESTA LIB (2026-07-29): estas duas correções viviam inline no
// scripts/inject-seed-into-demo.js, ou seja só o SITE as aplicava. O
// scripts/push-catalog-to-db.js não, por isso a BD — e com ela o app.html —
// servia os preços ERRADOS que o site já corrige. Apanhado por uma auditoria
// independente ao que está em produção:
//   · 43 variantes com o preço de OUTRO produto (o chip de volume mostrava o
//     preço de um produto relacionado que o scraper apanhou por engano);
//   · variantes com o preço truncado ao inteiro (29 € em vez de 29,74 €) — o
//     app anunciava mais barato do que a loja cobra.
// Mesmo padrão do verified-shipping.js / catalog-visibility.js /
// name-translations.js: uma definição, dois consumidores.
//
// NÃO-destrutivo: muta o seed EM MEMÓRIA; o data/seed-bundle.json fica intacto.
// A lógica é a que estava no inject, movida SEM alterações — a prova é o
// conteúdo do seed injectado sair idêntico.

/**
 * Repõe preços de variante truncados ao inteiro.
 * Bug do scraper da Wells (e afins): a extração por DOM apanha às vezes o preço
 * sem decimais (7,98 € → 7). Como o cartão usa o preço da VARIANTE ao volume de
 * referência, isso mostra um preço mais baixo do que o real. O preço do item
 * (item.price) vem do JSON-LD e é fiável: numa oferta de UMA só variante, se o
 * preço da variante é um inteiro igual ao floor do item.price (não-inteiro),
 * repõe-se o item.price.
 */
function fixTruncatedVariantPrices(seedJson) {
  let fixed = 0;
  for (const sp of seedJson.store_products) {
    for (const it of sp.items) {
      if (!Array.isArray(it.variants) || it.variants.length !== 1 || !(it.price > 0)) continue;
      const v = it.variants[0];
      if (v.price != null && Number.isInteger(v.price) && !Number.isInteger(it.price) && Math.floor(it.price) === v.price) {
        v.price = it.price;
        if (it.previous_price) v.previous_price = it.previous_price;
        fixed++;
      }
    }
  }
  return { fixed };
}

/**
 * Remove variantes que são, na verdade, OUTRO produto.
 * Bug de scrapers (SweetCare/Druni/Wells): a extração de variantes por DOM às
 * vezes apanha um PRODUTO RELACIONADO como se fosse uma "variante" de volume.
 * Ex.: Bioderma Sensibio H2O (água micelar) trazia uma "variante 40ml" a 24€
 * que era o Sensibio AR BB Cream. Assinatura fiável e CONSERVADORA: a variante
 * intrusa tem um URL DIFERENTE da maioria E viola a monotonia de volume (volume
 * MENOR mas preço MAIOR que uma variante de volume MAIOR que partilha o
 * URL-maioria). Só assim se apaga — evita apanhar tamanhos legítimos (que
 * partilham o URL) ou promoções (que não têm URL discordante).
 */
function dropWrongProductVariants(seedJson) {
  let dropped = 0;
  for (const sp of seedJson.store_products) {
    for (const it of sp.items) {
      const vs = (it.variants || []).filter(v => v.url && v.volume_ml > 0 && v.price > 0);
      if (vs.length < 2) continue;
      const cnt = {};
      for (const v of vs) cnt[v.url] = (cnt[v.url] || 0) + 1;
      const mode = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      if (mode[1] < 2) continue;                       // sem URL-maioria clara
      const majVars = vs.filter(v => v.url === mode[0]);
      const toDrop = new Set();
      for (const v of vs) {
        if (v.url === mode[0]) continue;               // parte da maioria → mantém
        // URL discordante: apaga se um volume MAIOR da maioria custa MENOS.
        if (majVars.some(w => w.volume_ml > v.volume_ml && w.price < v.price * 0.95)) toDrop.add(v);
      }
      if (toDrop.size) {
        it.variants = it.variants.filter(v => !toDrop.has(v));
        dropped += toDrop.size;
      }
    }
  }
  return { dropped };
}

/**
 * Tamanhos de variante mal lidos (2026-10-19). O site compara as lojas ao
 * tamanho da ficha e só aceita a variante com o MESMO volume_ml — que tem de
 * estar sempre em ml ou g. Três erros de scraper partiam essa comparação
 * (apanhados pelo Codex a validar o SEO: o modal e o «desde» discordavam):
 *   1. LITROS/QUILOS sem converter: {volume_ml: 1, unit: 'kg'} é 1000 g. De 20
 *      para cima o número já vem em ml/g («1000 l» = 1000 ml) e só a unidade
 *      está errada. Acima de 10 000 não é um tamanho — escovas a «90000 l»,
 *      tons de sombra a «101000 l» — e a variante sai.
 *   2. «1 KG» LIDO COMO 1: a máscara Novex de 1 kg da Smart Beauty ficava
 *      {volume_ml: 1, unit: 'ml'}. Prova: o URL da PRÓPRIA variante diz «-1kg»,
 *      «-1-kg» ou «-1-5-kg». Intervalos («fraldas 7-11kg», «cão 2-10kg»),
 *      «até 8kg» e «+8kg» são o peso do bebé ou do animal e não contam.
 *   3. PACKS COM BRINDE: «SVR Sebiaclear 40ml + Oferta Gel 55ml» ficava com a
 *      variante de 55 ml, o tamanho do brinde. Numa oferta de UMA variante, se
 *      ela tem o tamanho que vem depois do «+ oferta» e não o primeiro tamanho
 *      do nome (o volume de referência do site), passa a ter o primeiro.
 * Nunca cria duas variantes do mesmo tamanho na mesma oferta: se o tamanho
 * certo já lá está, a variante fica como estava.
 */
const UNIDADE_GRANDE = /^(l|lt|litro|litros|kg)$/i;
// «1kg», «1-kg», «1-5-kg», «1,5l» no URL — sem ser intervalo, «até», «+» ou «>»
const TAMANHO_GRANDE_NO_URL = /(?<![a-z0-9])(?<!\d[-_.,])(?<!\d-a-)(?<!(?:ate|até|mais|max|min|de)[-_])(?<![>+])(\d+(?:[.,_-]\d)?)[-_]?(kg|l|lt|litro|litros)(?![a-z0-9])/g;
const BRINDE = /\+\s*(?:uma\s+|1\s+)?(?:oferta|gr[aá]tis|brinde|offer|gift|free)\b(.*)$/i;
const VOLUME = /(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i;

/** o primeiro tamanho de um texto, em ml/g — o mesmo cálculo do _volFromName do site */
function volumeDoTexto(texto) {
  const m = String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').match(VOLUME);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.')), u = m[2].toLowerCase();
  return { ml: (u === 'l' || u === 'kg') ? n * 1000 : n, unit: (u === 'kg' || u === 'g' || u === 'gr') ? 'g' : 'ml' };
}

function fixVariantSizes(seedJson) {
  const nomes = new Map((seedJson.products || []).map(p => [String(p.ean), p.name || '']));
  let litros = 0, kgNoUrl = 0, brindes = 0, removidas = 0;
  for (const sp of seedJson.store_products) {
    for (const it of sp.items) {
      if (!Array.isArray(it.variants) || !it.variants.length) continue;
      const ocupado = ml => it.variants.some(w => w.volume_ml === ml);

      // 1. litros/quilos
      const fora = new Set();
      for (const v of it.variants) {
        if (!UNIDADE_GRANDE.test(String(v.unit || '')) || !(v.volume_ml > 0)) continue;
        const pequena = /^kg$/i.test(v.unit) ? 'g' : 'ml';
        if (v.volume_ml > 10000) { fora.add(v); continue; }
        if (v.volume_ml >= 20) { v.unit = pequena; litros++; continue; }
        const certo = Math.round(v.volume_ml * 1000);
        if (ocupado(certo)) continue;
        v.volume_ml = certo; v.unit = pequena; litros++;
      }
      if (fora.size) { it.variants = it.variants.filter(v => !fora.has(v)); removidas += fora.size; }

      // 2. «1 kg» lido como 1 — prova no URL da própria variante
      for (const v of it.variants) {
        if (UNIDADE_GRANDE.test(String(v.unit || '')) || !(v.volume_ml >= 1 && v.volume_ml <= 5) || !v.url) continue;
        const url = String(v.url).toLowerCase().split(/[?#]/)[0];
        const m = [...url.matchAll(TAMANHO_GRANDE_NO_URL)]
          .find(x => parseFloat(x[1].replace(/[_-]/, '.').replace(',', '.')) === v.volume_ml);
        if (!m) continue;
        const certo = Math.round(v.volume_ml * 1000);
        if (ocupado(certo)) continue;
        v.volume_ml = certo; v.unit = m[2] === 'kg' ? 'g' : 'ml'; kgNoUrl++;
      }

      // 3. packs com brinde
      if (it.variants.length !== 1) continue;
      const nome = nomes.get(String(it.ean)) || '';
      const b = nome.match(BRINDE);
      if (!b) continue;
      const ref = volumeDoTexto(nome), doBrinde = volumeDoTexto(b[1]);
      const v = it.variants[0];
      if (!ref || !doBrinde || ref.ml === doBrinde.ml || v.volume_ml !== doBrinde.ml) continue;
      v.volume_ml = ref.ml; v.unit = ref.unit; brindes++;
    }
  }
  return { litros, kgNoUrl, brindes, removidas };
}

module.exports = { fixVariantSizes, fixTruncatedVariantPrices, dropWrongProductVariants };
