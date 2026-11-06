'use strict';
// fixVariantSizes (2026-10-19): tamanhos de variante mal lidos — L/kg sem
// converter, «1 kg» lido como 1 e o tamanho do brinde em packs.
// Sem rede. Uso: node scripts/test-variant-sizes.cjs
const assert = require('node:assert/strict');
const { fixVariantSizes, dropImplausibleSizes } = require('./lib/variant-fixes');

const oferta = (ean, variants) => ({ ean, price: 10, in_stock: true, variants });
const seed = (nomes, items) => ({
  products: Object.entries(nomes).map(([ean, name]) => ({ ean, name })),
  store_products: [{ store_slug: 'loja', items }],
});
const tam = it => it.variants.map(v => `${v.volume_ml}${v.unit}`);

// 1. litros/quilos
{
  const s = seed({}, [
    oferta('a', [{ volume_ml: 1, unit: 'kg', price: 9 }]),
    oferta('b', [{ volume_ml: 1.5, unit: 'l', price: 9 }]),
    oferta('c', [{ volume_ml: 1000, unit: 'l', price: 9 }]),        // já em ml, só a unidade
    oferta('d', [{ volume_ml: 90000, unit: 'l', price: 9 }, { volume_ml: 50, unit: 'ml', price: 5 }]),
    oferta('e', [{ volume_ml: 1, unit: 'kg', price: 9 }, { volume_ml: 1000, unit: 'g', price: 9 }]),
  ]);
  const r = fixVariantSizes(s);
  const [a, b, c, d, e] = s.store_products[0].items;
  assert.deepEqual(tam(a), ['1000g']);
  assert.deepEqual(tam(b), ['1500ml']);
  assert.deepEqual(tam(c), ['1000ml']);
  assert.deepEqual(tam(d), ['50ml'], '90000 l não é um tamanho');
  assert.deepEqual(tam(e), ['1kg', '1000g'], 'o 1000 já existe: não duplica');
  assert.deepEqual(r, { litros: 3, kgNoUrl: 0, brindes: 0, removidas: 1 });
}

// 2. «1 kg» lido como 1 — prova no URL da própria variante
{
  const v = (volume_ml, url) => oferta('x', [{ volume_ml, unit: 'ml', price: 9, url }]);
  const s = seed({}, [
    v(1, 'https://www.smartbeauty.pt/product/mascara-novex-oleo-de-coco-1kg'),
    v(1, 'https://www.atida.com/pt-pt/myprotein-proteina-creme-de-cookies-1-kg'),
    v(1.5, 'https://megafarma.pt/pt-pt/product/libra-racao-gato-adulto-frango-1-5kg'),
    v(1, 'https://loja.pt/gel-de-banho-1l?ref=x'),
    // peso do bebé ou do animal, não tamanho
    v(5, 'https://lojadafarmacia.com/pt/artigo/libero-comfort-1-fralda-2-5kg-x24'),
    v(4, 'https://bairrodasaude.pt/products/advantix-cao-ate-4kg-solucao'),
    v(2, 'https://lojadafarmacia.com/pt/artigo/adtab-comp-05-2kg-12mg-gato'),
    v(0.5, 'https://farma2go.pt/shiseido-synchro-skin-foundation-0-5kg'),
    // URL sem kg/L, ou com outro número
    v(1, 'https://loja.pt/serum-1ml'),
    v(2, 'https://loja.pt/mascara-1kg'),
  ]);
  const r = fixVariantSizes(s);
  assert.deepEqual(s.store_products[0].items.map(it => tam(it)[0]),
    ['1000g', '1000g', '1500g', '1000ml', '5ml', '4ml', '2ml', '0.5ml', '1ml', '2ml']);
  assert.equal(r.kgNoUrl, 4);
}

// 3. packs com brinde
{
  const s = seed({
    svr: 'SVR Sebiaclear Active Gel-creme - 40ml + Oferta Gel moussant - 55ml',
    sk: 'Skinceuticals Coffret creme 48 ml + HA Intensifier Sérum 30 ml + Oferta Age Interrupter creme 15 ml',
    mu: 'Mustela Bebé Creme Zona Fralda 123 -150 ml + Oferta 2ª Embalagem - 100 ml',
    duo: 'Creme 50ml + Sérum 30ml',
  }, [
    oferta('svr', [{ volume_ml: 55, unit: 'ml', price: 9 }]),
    oferta('sk', [{ volume_ml: 15, unit: 'ml', price: 9 }]),
    oferta('mu', [{ volume_ml: 100, unit: 'ml', price: 9 }]),
    oferta('svr', [{ volume_ml: 55, unit: 'ml', price: 9 }, { volume_ml: 200, unit: 'ml', price: 20 }]),   // 2 variantes
    oferta('duo', [{ volume_ml: 30, unit: 'ml', price: 9 }]),                                            // sem «oferta»
  ]);
  const r = fixVariantSizes(s);
  assert.deepEqual(s.store_products[0].items.map(it => tam(it).join('/')), ['40ml', '48ml', '150ml', '55ml/200ml', '30ml']);
  assert.equal(r.brindes, 3);
}

// idempotente
{
  const s = seed({ p: 'Máscara 400g + Oferta Champô 100ml' }, [
    oferta('p', [{ volume_ml: 100, unit: 'ml', price: 9 }]),
    oferta('q', [{ volume_ml: 1, unit: 'kg', price: 9 }, { volume_ml: 1, unit: 'ml', price: 9, url: 'https://x.pt/mascara-1kg' }]),
  ]);
  fixVariantSizes(s);
  const antes = JSON.stringify(s);
  assert.deepEqual(fixVariantSizes(s), { litros: 0, kgNoUrl: 0, brindes: 0, removidas: 0 });
  assert.equal(JSON.stringify(s), antes);
}

// dropImplausibleSizes (2026-11-06): tamanhos que o preço desmente, antes de a ficha abrir no melhor €/L
{
  const s = {
    products: [
      { ean: '1', name: 'La Roche Posay Cicaplast Lábios 7,5ml' },
      { ean: '2', name: 'Volume Lift Lightweight Shampoo' },
      { ean: '3', name: 'Bioderma Sensibio H2O 250ml' },
      { ean: '4', name: 'ISDIN Si-Nails Micoexpert 4,5ml' },
      { ean: '5', name: 'Better Screen UV Serum SPF50 15ml' },
    ],
    store_products: [
      { store_slug: 'a', items: [{ ean: '1', price: 5.87, variants: [{ volume_ml: 7.5, price: 5.87 }, { volume_ml: 75, price: 8.49 }] }] },
      { store_slug: 'w', items: [{ ean: '2', price: 2.4, variants: [{ volume_ml: 75, price: 2.4 }, { volume_ml: 250, price: 2.4 }] }] },
      { store_slug: 'b', items: [{ ean: '3', price: 9, variants: [{ volume_ml: 100, price: 5 }, { volume_ml: 250, price: 9 }, { volume_ml: 500, price: 13 }] }] },
      { store_slug: 'c', items: [{ ean: '4', price: 28.94, variants: [{ volume_ml: 45, price: 28.94 }] }, { ean: '5', price: 19.12, variants: [{ volume_ml: 50, price: 19.12 }] }] },
      { store_slug: 'd', items: [{ ean: '4', price: 20.61, variants: [{ volume_ml: 4.5, price: 20.61 }] }, { ean: '5', price: 18.5, variants: [{ volume_ml: 15, price: 18.5 }] }] },
    ],
  };
  const r = dropImplausibleSizes(s);
  const vs = (loja, ean) => s.store_products.find(g => g.store_slug === loja).items.find(i => i.ean === ean).variants.map(v => v.volume_ml);
  assert.deepEqual(vs('a', '1'), [7.5], 'vírgula perdida: «75 ml» do Cicaplast 7,5 ml sai');
  assert.deepEqual(vs('w', '2'), [75], 'mesmo preço em 75 e 250 ml: fica o mais pequeno');
  assert.deepEqual(vs('b', '3'), [100, 250, 500], 'tamanhos verdadeiros ficam');
  assert.deepEqual(vs('c', '4'), [4.5], 'oferta só com «45 ml» (vírgula perdida): passa ao tamanho do nome');
  assert.deepEqual(vs('c', '5'), [15], 'oferta só com 50 ml ao preço dos 15 ml do nome: passa a 15 ml');
  assert.deepEqual(vs('d', '4'), [4.5]);
  assert.deepEqual(r, { virgula: 1, mesmoPreco: 1, corrigidos: 2 });
  const antes = JSON.stringify(s);
  assert.deepEqual(dropImplausibleSizes(s), { virgula: 0, mesmoPreco: 0, corrigidos: 0 }, 'idempotente');
  assert.equal(JSON.stringify(s), antes);
}

console.log('variant-sizes: L/kg, «1 kg» lido como 1 (sem intervalos nem pesos), brindes, sem duplicados, idempotente, tamanhos que o preço desmente — tudo passou');
