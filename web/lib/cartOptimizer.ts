/**
 * Motor de optimização do carrinho.
 *
 * Algoritmo:
 *   1. Buscar todos os preços mais recentes (in_stock = true) para os
 *      produtos do carrinho.
 *   2. Determinar o conjunto S de lojas que têm pelo menos um produto
 *      do carrinho em stock.
 *   3. Enumerar todos os 2^|S| subconjuntos não-vazios.
 *   4. Para cada subconjunto C ⊆ S:
 *        a) Verificar se C cobre 100 % dos produtos do carrinho
 *           (cada produto tem ≥ 1 oferta in_stock numa loja de C).
 *        b) Para cada produto, escolher a loja em C com o preço × qty
 *           mais baixo (ou apenas preço, dado que qty é constante por linha).
 *        c) Calcular subtotal por loja, aplicar threshold de envio grátis
 *           e somar portes.
 *        d) Total = Σ (subtotais + portes).
 *   5. Ordenar os subconjuntos cobertos por total ascendente; devolver
 *      os 3 melhores e marcar o nº 1 com `is_best = true`.
 *
 * Complexidade: 2^N subconjuntos × M produtos = O(2^N · M). Com N ≤ 10
 * lojas e M ≤ 50 produtos, ≤ 50 000 ops — ~ms em Node.
 */

import { ShippingZone } from './postalCodes';

// ----------------------------------------------------------
// Tipos públicos
// ----------------------------------------------------------

export interface CartItem {
  product_id: number;
  quantity: number;
}

export interface ProductInfo {
  id: number;
  name: string;
  brand: string;
  image_url: string | null;
}

export interface StoreInfo {
  id: number;
  slug: string;
  name: string;
  free_shipping_threshold: number;
  shipping_cost: number;     // preço base de portes para o distrito do user
  shipping_min_days: number;
  shipping_max_days: number;
}

export interface OfferRow {
  product_id: number;
  store_id: number;
  price: number;
  in_stock: boolean;
  url: string | null;
  scraped_at: Date;
}

export interface SolutionLineItem {
  product_id: number;
  product_name: string;
  brand: string;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  url: string | null;
}

export interface SolutionStoreBreakdown {
  store_slug: string;
  store_name: string;
  coverage: string;             // ex: "3/3 produtos"
  items: SolutionLineItem[];
  subtotal: number;
  shipping_cost: number;
  free_shipping_applied: boolean;
  total: number;
  delivery_days: { min: number; max: number };
}

export interface CartSolution {
  stores_used: string[];        // slugs
  subtotal: number;             // total dos produtos
  shipping_total: number;
  total: number;
  saved_vs_worst: number;       // diferença para a pior solução do top
  is_best: boolean;
  breakdown: SolutionStoreBreakdown[];
}

export interface OptimizerInput {
  cart: CartItem[];
  products: ProductInfo[];
  stores: StoreInfo[];
  offers: OfferRow[];           // todos os preços mais recentes (in_stock=true)
  zone: ShippingZone;
  topN?: number;                // default 3
}

export interface OptimizerOutput {
  solutions: CartSolution[];
  single_store_best: CartSolution | null;  // melhor opção numa só loja (cf. UX)
  uncovered_products: number[];             // produtos sem nenhuma oferta in_stock
}

// ----------------------------------------------------------
// Função principal
// ----------------------------------------------------------

export function optimizeCart(input: OptimizerInput): OptimizerOutput {
  const { cart, products, stores, offers, topN = 3 } = input;

  if (cart.length === 0) {
    return { solutions: [], single_store_best: null, uncovered_products: [] };
  }

  // Indexar
  const productById = new Map(products.map((p) => [p.id, p]));
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const cartQty = new Map(cart.map((i) => [i.product_id, i.quantity]));

  // Indexar ofertas: product_id → Map(store_id → OfferRow)
  const offersByProduct = new Map<number, Map<number, OfferRow>>();
  for (const o of offers) {
    if (!o.in_stock) continue;
    if (!cartQty.has(o.product_id)) continue;
    if (!storeById.has(o.store_id)) continue;

    let perProduct = offersByProduct.get(o.product_id);
    if (!perProduct) {
      perProduct = new Map();
      offersByProduct.set(o.product_id, perProduct);
    }
    // Manter apenas a oferta mais recente por (produto, loja)
    const existing = perProduct.get(o.store_id);
    if (!existing || o.scraped_at > existing.scraped_at) {
      perProduct.set(o.store_id, o);
    }
  }

  // Produtos sem qualquer cobertura
  const uncovered: number[] = [];
  for (const item of cart) {
    if (!offersByProduct.has(item.product_id)) {
      uncovered.push(item.product_id);
    }
  }

  if (uncovered.length === cart.length) {
    return { solutions: [], single_store_best: null, uncovered_products: uncovered };
  }

  // Lojas que têm pelo menos um produto do carrinho em stock
  const candidateStoreIds = new Set<number>();
  for (const perStore of offersByProduct.values()) {
    for (const sid of perStore.keys()) candidateStoreIds.add(sid);
  }
  const candidateStores = [...candidateStoreIds];
  const N = candidateStores.length;

  if (N === 0) {
    return { solutions: [], single_store_best: null, uncovered_products: uncovered };
  }

  // Limite defensivo: 2^15 = 32 768 subconjuntos. Se N > 15, podamos.
  // Com 6 lojas reais não chegamos perto.
  const MAX_N = 15;
  const usableStores = candidateStores.slice(0, MAX_N);
  const usableN = usableStores.length;

  // ---- Enumerar subconjuntos ----
  const allSolutions: CartSolution[] = [];
  const totalSubsets = 1 << usableN;

  for (let mask = 1; mask < totalSubsets; mask++) {
    const subsetStoreIds: number[] = [];
    for (let i = 0; i < usableN; i++) {
      if (mask & (1 << i)) subsetStoreIds.push(usableStores[i]);
    }

    const solution = buildSolution(
      subsetStoreIds,
      cart,
      cartQty,
      offersByProduct,
      productById,
      storeById,
    );
    if (solution) allSolutions.push(solution);
  }

  if (allSolutions.length === 0) {
    return { solutions: [], single_store_best: null, uncovered_products: uncovered };
  }

  // ---- Ordenar e deduplicar por combinação de lojas efectivamente usadas ----
  // Razão: várias bitmasks geram a mesma solução. Ex: subset {notino,sephora}
  // onde a Sephora fica sem produtos atribuídos === subset {notino}. Sem
  // dedup, o "top 3" mostra 3× a mesma combinação de lojas.
  allSolutions.sort((a, b) => a.total - b.total);

  const seen = new Set<string>();
  const unique: CartSolution[] = [];
  for (const s of allSolutions) {
    const sig = [...s.stores_used].sort().join('|');
    if (seen.has(sig)) continue;
    seen.add(sig);
    unique.push(s);
    if (unique.length >= topN) break;
  }

  const top = unique;
  const worst = allSolutions[allSolutions.length - 1].total;

  top.forEach((s, idx) => {
    s.is_best = idx === 0;
    s.saved_vs_worst = +(worst - s.total).toFixed(2);
  });

  // ---- "Só numa loja": melhor solução com 1 só loja ----
  const singleStoreBest =
    allSolutions.find((s) => s.stores_used.length === 1) ?? null;

  return {
    solutions: top,
    single_store_best: singleStoreBest,
    uncovered_products: uncovered,
  };
}

// ----------------------------------------------------------
// Construir solução para um subconjunto de lojas
// ----------------------------------------------------------

function buildSolution(
  subsetStoreIds: number[],
  cart: CartItem[],
  cartQty: Map<number, number>,
  offersByProduct: Map<number, Map<number, OfferRow>>,
  productById: Map<number, ProductInfo>,
  storeById: Map<number, StoreInfo>,
): CartSolution | null {
  const subsetSet = new Set(subsetStoreIds);

  // Atribuição óptima: para cada produto, escolher loja em subset
  // com menor preço unitário.
  const assignmentByStore = new Map<number, SolutionLineItem[]>();

  for (const item of cart) {
    const storeOffers = offersByProduct.get(item.product_id);
    if (!storeOffers) return null; // produto sem cobertura — subset inválido

    let bestStoreId = -1;
    let bestOffer: OfferRow | null = null;

    for (const sid of subsetStoreIds) {
      const offer = storeOffers.get(sid);
      if (!offer) continue;
      if (!bestOffer || offer.price < bestOffer.price) {
        bestOffer = offer;
        bestStoreId = sid;
      }
    }

    if (!bestOffer) return null; // este subset não cobre este produto

    const product = productById.get(item.product_id)!;
    const qty = cartQty.get(item.product_id) ?? 1;
    const unitPrice = Number(bestOffer.price);
    const lineItem: SolutionLineItem = {
      product_id: product.id,
      product_name: product.name,
      brand: product.brand,
      image_url: product.image_url,
      quantity: qty,
      unit_price: unitPrice,
      line_total: +(unitPrice * qty).toFixed(2),
      url: bestOffer.url,
    };

    let bucket = assignmentByStore.get(bestStoreId);
    if (!bucket) {
      bucket = [];
      assignmentByStore.set(bestStoreId, bucket);
    }
    bucket.push(lineItem);
  }

  // Construir breakdown por loja + somar portes
  const breakdown: SolutionStoreBreakdown[] = [];
  let subtotalAll = 0;
  let shippingAll = 0;
  const totalCartProducts = cart.length;

  for (const sid of assignmentByStore.keys()) {
    const store = storeById.get(sid)!;
    const items = assignmentByStore.get(sid)!;
    const subtotal = items.reduce((acc, li) => acc + li.line_total, 0);
    const freeApplies = subtotal >= store.free_shipping_threshold;
    const shipping = freeApplies ? 0 : store.shipping_cost;

    // Filtrar subsets em que uma loja entra mas não é usada — não acontece
    // pelo algoritmo acima, mas verificamos por consistência.
    if (items.length === 0) continue;

    breakdown.push({
      store_slug: store.slug,
      store_name: store.name,
      coverage: `${items.length}/${totalCartProducts} produtos`,
      items,
      subtotal: +subtotal.toFixed(2),
      shipping_cost: +shipping.toFixed(2),
      free_shipping_applied: freeApplies,
      total: +(subtotal + shipping).toFixed(2),
      delivery_days: {
        min: store.shipping_min_days,
        max: store.shipping_max_days,
      },
    });

    subtotalAll += subtotal;
    shippingAll += shipping;
  }

  // Se o subset trouxe lojas que não foram usadas (ex: outras lojas teriam
  // preço melhor para todos os produtos), devolvemos a solução com as
  // lojas efectivamente usadas — mas filtramos duplicados depois.
  if (breakdown.length === 0) return null;

  // Ordenar lojas dentro do breakdown pelo total descendente (UX)
  breakdown.sort((a, b) => b.total - a.total);

  return {
    stores_used: breakdown.map((b) => b.store_slug),
    subtotal: +subtotalAll.toFixed(2),
    shipping_total: +shippingAll.toFixed(2),
    total: +(subtotalAll + shippingAll).toFixed(2),
    saved_vs_worst: 0, // calculado depois
    is_best: false,
    breakdown,
  };
}
