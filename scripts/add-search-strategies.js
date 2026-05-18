#!/usr/bin/env node
/**
 * Adiciona o campo search_strategy a cada loja em data/stores.json.
 * Idempotente — não sobrescreve estratégias já definidas.
 *
 * Schema search_strategy:
 *   {
 *     "type": "url-template" | "sitemap" | "graphql" | "google-site" | "manual",
 *     "template": "https://loja.pt/search?q={q}",        // {q} substituído pela query (EAN ou nome)
 *     "result_link_selector": "a.product-tile",          // CSS selector p/ apanhar 1º resultado
 *     "title_selector": "h1[itemprop='name']",           // CSS para confirmar título da PDP
 *     "supports_ean": true,                              // se a search aceita EAN
 *     "needs_playwright": false                          // SPA?
 *   }
 */
const fs = require('fs');
const path = require('path');

const STORES_PATH = path.resolve(__dirname, '..', 'data', 'stores.json');
const data = JSON.parse(fs.readFileSync(STORES_PATH, 'utf8'));

const STRATEGIES = {
  // ─── TIER 1 — especializadas (alta prioridade) ───
  'notino': {
    type: 'url-template',
    template: 'https://www.notino.pt/?q={q}',
    result_link_selector: 'a[data-testid="product-tile-link"], a.product-detail-link, .product-tile a',
    title_selector: 'h1[itemprop="name"]',
    supports_ean: true,
    needs_playwright: true,
  },
  'sephora': {
    type: 'url-template',
    template: 'https://www.sephora.pt/search?q={q}',
    result_link_selector: 'a[data-comp="ProductTile"], a.product-tile',
    title_selector: 'h1.product-meta__product-name',
    supports_ean: true,
    needs_playwright: true,
  },
  'douglas': {
    type: 'url-template',
    template: 'https://www.douglas.pt/pt/search?q={q}',
    result_link_selector: 'a[data-testid="product-tile-link"]',
    title_selector: 'h1[data-testid="product-name"]',
    supports_ean: true,
    needs_playwright: false,
  },
  'druni': {
    type: 'url-template',
    template: 'https://www.druni.pt/catalogsearch/result/?q={q}',
    result_link_selector: 'a.product-item-link',
    title_selector: 'h1.page-title span',
    supports_ean: true,
    needs_playwright: false,
  },
  'perfumes-companhia': {
    type: 'url-template',
    template: 'https://www.perfumesecompanhia.pt/search?q={q}',
    result_link_selector: 'a.product-link, .product-item a',
    title_selector: 'h1.product-title',
    supports_ean: true,
    needs_playwright: false,
  },
  'kiko': {
    type: 'url-template',
    template: 'https://www.kikocosmetics.com/pt-pt/search?q={q}',
    result_link_selector: 'a.product-tile-link',
    title_selector: 'h1.product-name',
    supports_ean: false,
    needs_playwright: true,
  },

  // ─── TIER 2 — generalistas ───
  'elcorteingles': {
    type: 'url-template',
    template: 'https://www.elcorteingles.pt/beleza/search/?term={q}',
    result_link_selector: 'a.product_link',
    title_selector: 'h1.product_detail-name',
    supports_ean: true,
    needs_playwright: false,
  },
  'worten': {
    type: 'url-template',
    template: 'https://www.worten.pt/search?query={q}',
    result_link_selector: 'a.product__card__link',
    title_selector: 'h1.product-detail__name',
    supports_ean: true,
    needs_playwright: false,
  },
  'fnac': {
    type: 'url-template',
    template: 'https://www.fnac.pt/SearchResult/ResultList.aspx?Search={q}',
    result_link_selector: 'a.Article-title',
    title_selector: 'h1.f-productHeader-Title',
    supports_ean: true,
    needs_playwright: false,
  },

  // ─── TIER 3 — farmácias ───
  'wells': {
    type: 'url-template',
    template: 'https://www.wells.pt/search?q={q}',
    result_link_selector: 'a.product-card__link, a.product-tile',
    title_selector: 'h1.product-title, h1[itemprop="name"]',
    supports_ean: true,
    needs_playwright: false,
  },
  'atida': {
    type: 'url-template',
    template: 'https://www.atida.com/pt-pt/search?q={q}',
    result_link_selector: 'a.product-card-link, a[data-testid="product-link"]',
    title_selector: 'h1.product-name, h1[itemprop="name"]',
    supports_ean: true,
    needs_playwright: false,
  },
  'farmacia365': {
    type: 'url-template',
    template: 'https://www.farmacia365.pt/catalogsearch/result/?q={q}',
    result_link_selector: 'a.product-item-link',
    title_selector: 'h1.page-title span',
    supports_ean: true,
    needs_playwright: false,
  },
  'farmaciaonline': {
    type: 'url-template',
    template: 'https://www.farmaciaonline.pt/?s={q}&post_type=product',
    result_link_selector: 'a.woocommerce-LoopProduct-link',
    title_selector: 'h1.product_title',
    supports_ean: true,
    needs_playwright: false,
  },
  'pharma2u': {
    type: 'url-template',
    template: 'https://www.pharma2u.pt/search?q={q}',
    result_link_selector: 'a.product-card__link',
    title_selector: 'h1[itemprop="name"]',
    supports_ean: true,
    needs_playwright: false,
  },
  'afarmaciaonline': {
    type: 'url-template',
    template: 'https://www.afarmaciaonline.pt/?s={q}',
    result_link_selector: 'a.woocommerce-LoopProduct-link',
    title_selector: 'h1.product_title',
    supports_ean: true,
    needs_playwright: false,
  },
  'easyfarma': {
    type: 'url-template',
    template: 'https://easyfarma.pt/search?q={q}',
    result_link_selector: 'a.product-item__link, a[href*="/products/"]',
    title_selector: 'h1.product-meta__title',
    supports_ean: true,
    needs_playwright: false,
  },

  // ─── TIER 4 — mono-marca (não precisa search — produtos catalogados estaticamente) ───
  'thebodyshop': { type: 'manual', supports_ean: false, needs_playwright: false, notes: 'Catálogo finito, URLs estáticos pré-mapeados' },
  'rituals':     { type: 'manual', supports_ean: false, needs_playwright: false },
  'mac':         { type: 'manual', supports_ean: false, needs_playwright: true },
  'loccitane':   { type: 'manual', supports_ean: false, needs_playwright: false },
  'yvesrocher':  { type: 'manual', supports_ean: false, needs_playwright: false },
  'lush':        { type: 'manual', supports_ean: false, needs_playwright: false },
  'nivea':       { type: 'manual', supports_ean: false, needs_playwright: false },

  // ─── TIER 5 — nicho K-beauty ───
  'miin': {
    type: 'url-template',
    template: 'https://miin-cosmetics.pt/search?controller=search&s={q}',
    result_link_selector: 'a.product-thumbnail',
    title_selector: 'h1.product-name',
    supports_ean: false,
    needs_playwright: false,
  },
  'haemiskin': {
    type: 'url-template',
    template: 'https://www.haemiskin.pt/search?q={q}',
    result_link_selector: 'a.product-card__link',
    title_selector: 'h1.product-meta__title',
    supports_ean: false,
    needs_playwright: false,
  },
  'korean-queens': {
    type: 'url-template',
    template: 'https://www.koreanqueens.com/pt/search?controller=search&s={q}',
    result_link_selector: 'a.thumbnail',
    title_selector: 'h1[itemprop="name"]',
    supports_ean: false,
    needs_playwright: false,
  },

  // ─── TIER 6 — internacionais ───
  'lookfantastic': {
    type: 'graphql',
    template: 'https://www.lookfantastic.pt/elysium-api/graphql',
    supports_ean: true,
    needs_playwright: false,
    notes: 'GraphQL endpoint público',
  },
  'cultbeauty': {
    type: 'url-template',
    template: 'https://www.cultbeauty.co.uk/search?search={q}',
    result_link_selector: 'a.productBlock_link',
    title_selector: 'h1.productName_title',
    supports_ean: true,
    needs_playwright: true,
  },
};

let added = 0, skipped = 0;
for (const store of data.stores) {
  if (!STRATEGIES[store.id]) { skipped++; continue; }
  if (store.search_strategy) { skipped++; continue; }
  store.search_strategy = STRATEGIES[store.id];
  added++;
}

// Para as lojas que não estão no mapa, marcar como "auto-discover" (a investigar)
for (const store of data.stores) {
  if (!store.search_strategy) {
    store.search_strategy = { type: 'auto-discover', supports_ean: false, needs_playwright: false, notes: 'Estratégia por investigar' };
  }
}

data.last_updated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(STORES_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`✔ search_strategy: ${added} adicionadas · ${skipped} skipped · ${data.stores.length - added - skipped} marcadas como auto-discover`);
console.log(`  total lojas: ${data.stores.length}`);
