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

module.exports = { fixTruncatedVariantPrices, dropWrongProductVariants };
