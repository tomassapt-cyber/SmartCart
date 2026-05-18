#!/usr/bin/env node
/**
 * Corrige URLs incorrectos, remove lojas inactivas e adiciona substitutos
 * verificados em 2026-05-12.
 *
 * Operação idempotente. Reset: reverter via git.
 */
const fs = require('fs');
const path = require('path');

const STORES_PATH = path.resolve(__dirname, '..', 'data', 'stores.json');
const data = JSON.parse(fs.readFileSync(STORES_PATH, 'utf8'));

// ── 1) URL fixes (URLs antigos retornavam 404 / ECONNREFUSED) ──
const URL_FIXES = {
  'thebodyshop':   { url: 'https://www.thebodyshop.pt',         notes: 'URL corrigido 2026-05-12 (era /pt-pt → www.thebodyshop.pt)' },
  'nivea':         { url: 'https://www.nivea.pt/produtos',      notes: 'URL corrigido 2026-05-12 (path /loja não existe, agora /produtos)' },
  'primor':        { url: 'https://pt.primor.eu/pt_pt/',        notes: 'URL corrigido 2026-05-12 (subdomínio pt.primor.eu)' },
};
// Pharma2u: slug + URL antigo errado. Substituir.
const RENAMES = {
  'pharma2u': { newId: 'pharma2you', nome: 'Pharma2you', url: 'https://pharma2you.pt', notes: 'Renomeado de pharma2u → pharma2you (nome real verificado 2026-05-12)' },
};

// ── 2) Lojas a marcar como inactivas (sem e-commerce funcional verificado) ──
const DEACTIVATE = {
  'marionnaud':    'Marca descontinuada online em PT em 2019; lojas físicas adquiridas pela Perfumes & Companhia em 2020',
  'farmacialemos': 'Sem e-commerce próprio; apenas página informativa em famacialemos.pai.pt',
  'bei':           'Site bei.pt não respondia (ECONNREFUSED); marca não encontrada em buscas recentes',
  'loja-perfume':  'Site lojadoperfume.com não responde (ECONNREFUSED); não aparece em índices actuais',
  'iperfumes':     'Site iperfumes.pt não responde; empresa Iperfumes Lda existe mas sem e-commerce activo',
};

// ── 3) Substitutos verificados (compensam as 5 removidas) ──
const NEW_STORES = [
  {
    id: 'sweetcare',
    nome: 'SweetCare',
    url: 'https://sweetcare.pt',
    tipo: 'farmacia',
    tem_api: false,
    tem_afiliados: true,
    url_afiliados: 'https://www.awin.com/merchant/sweetcare',
    metodo_coleta: 'cheerio+jsonld',
    freq_atualizacao: '06h00 diária',
    tier: 1,
    notes: 'Maior parafarmácia PT digital. 25k+ SKUs, 600+ marcas. Foco derma + beleza. Verificado 2026-05-12.',
    search_strategy: {
      type: 'url-template',
      template: 'https://sweetcare.pt/search?q={q}',
      result_link_selector: 'a.product-tile, a[data-testid="product-link"]',
      title_selector: 'h1.product-name, h1[itemprop="name"]',
      supports_ean: true,
      needs_playwright: false,
    },
  },
  {
    id: 'byfarma',
    nome: 'byFarma',
    url: 'https://byfarma.pt',
    tipo: 'farmacia',
    tem_api: false,
    tem_afiliados: false,
    url_afiliados: null,
    metodo_coleta: 'cheerio+jsonld',
    freq_atualizacao: '08h00 diária',
    tier: 3,
    notes: 'Farmácia online INFARMED Alvará 5260. Beleza + bem-estar. Verificado 2026-05-12.',
    search_strategy: {
      type: 'url-template',
      template: 'https://byfarma.pt/search?q={q}',
      result_link_selector: 'a.product-item-link, a.product-tile',
      title_selector: 'h1[itemprop="name"]',
      supports_ean: true,
      needs_playwright: false,
    },
  },
  {
    id: 'farmaciapt',
    nome: 'Farmácia.pt',
    url: 'https://farmacia.pt',
    tipo: 'farmacia',
    tem_api: false,
    tem_afiliados: false,
    url_afiliados: null,
    metodo_coleta: 'cheerio',
    freq_atualizacao: '09h00 diária',
    tier: 3,
    notes: 'Farmácia online generalista, free shipping €40, entrega 24h. Verificado 2026-05-12.',
    search_strategy: {
      type: 'url-template',
      template: 'https://farmacia.pt/search?q={q}',
      result_link_selector: 'a.product-item-link',
      title_selector: 'h1.page-title span, h1[itemprop="name"]',
      supports_ean: true,
      needs_playwright: false,
    },
  },
];

let fixed = 0, renamed = 0, deactivated = 0, added = 0;
const removedIds = new Set(Object.keys(DEACTIVATE));

// Filtrar lojas inactivas
const remaining = data.stores.filter(s => {
  if (DEACTIVATE[s.id]) {
    console.log(`  ✗ Remover ${s.id}: ${DEACTIVATE[s.id]}`);
    deactivated++;
    return false;
  }
  return true;
});

// Aplicar URL fixes
for (const s of remaining) {
  if (URL_FIXES[s.id]) {
    s.url = URL_FIXES[s.id].url;
    s.notes = (s.notes ? s.notes + ' · ' : '') + URL_FIXES[s.id].notes;
    console.log(`  ✓ Fix URL: ${s.id} → ${s.url}`);
    fixed++;
  }
}

// Aplicar renames (criar nova entrada, marcar antiga como removida — já tratado no filter, mas pharma2u não está em DEACTIVATE)
const renameApplied = new Set();
for (let i = 0; i < remaining.length; i++) {
  const s = remaining[i];
  if (RENAMES[s.id]) {
    const r = RENAMES[s.id];
    console.log(`  ↻ Rename: ${s.id} → ${r.newId} (${r.url})`);
    s.id = r.newId;
    s.nome = r.nome;
    s.url = r.url;
    s.notes = (s.notes ? s.notes + ' · ' : '') + r.notes;
    renameApplied.add(r.newId);
    renamed++;
  }
}

// Adicionar substitutos
for (const ns of NEW_STORES) {
  if (remaining.find(s => s.id === ns.id)) {
    console.log(`  ↩ ${ns.id} já existe (skip)`);
    continue;
  }
  remaining.push(ns);
  console.log(`  + Adicionar: ${ns.id} (${ns.url})`);
  added++;
}

data.stores = remaining;
data.last_updated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(STORES_PATH, JSON.stringify(data, null, 2), 'utf8');

console.log(`\n────────────────────────────────────────`);
console.log(`  URLs corrigidos: ${fixed}`);
console.log(`  Renomeados    : ${renamed}`);
console.log(`  Removidos     : ${deactivated}`);
console.log(`  Adicionados   : ${added}`);
console.log(`  Total final   : ${data.stores.length} lojas`);
