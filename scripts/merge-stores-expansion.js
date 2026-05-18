#!/usr/bin/env node
/**
 * Merge das 14 novas lojas do docs/2026-05-stores-expansion.md
 * no data/stores.json existente, idempotente (não duplica ids).
 */
const fs = require('fs');
const path = require('path');

const STORES_PATH = path.resolve(__dirname, '..', 'data', 'stores.json');
const current = JSON.parse(fs.readFileSync(STORES_PATH, 'utf8'));
const existing = new Set(current.stores.map(s => s.id));

const NEW_STORES = [
  { id: 'atida',           nome: 'Atida | Mifarma PT',         url: 'https://www.atida.com/pt-pt',         tipo: 'farmacia',     tem_api: false, tem_afiliados: true,  url_afiliados: 'https://www.awin.com/merchant/atida',          metodo_coleta: 'cheerio+jsonld', freq_atualizacao: '06h00 diária', tier: 1, notes: 'Maior parafarmácia online PT/ES. >30k SKUs. €49 free shipping.' },
  { id: 'fnac',            nome: 'Fnac PT — Beauty',           url: 'https://www.fnac.pt',                 tipo: 'generalista',  tem_api: false, tem_afiliados: true,  url_afiliados: 'https://www.awin.com/merchant/fnac',            metodo_coleta: 'cheerio',         freq_atualizacao: '08h00 diária', tier: 2, notes: 'Marketplace generalista com forte secção perfumaria.' },
  { id: 'miin',            nome: 'MiiN Cosmetics PT',          url: 'https://miin-cosmetics.pt',           tipo: 'nicho',        tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio+jsonld',  freq_atualizacao: '10h00 diária', tier: 5, notes: 'K-beauty multimarca (80+). Exclusivos: COSRX, Anua, Beauty of Joseon.' },
  { id: 'farmacia365',     nome: 'Farmácia 365',               url: 'https://www.farmacia365.pt',          tipo: 'farmacia',     tem_api: false, tem_afiliados: true,  url_afiliados: 'https://www.awin.com/merchant/farmacia365',     metodo_coleta: 'cheerio',         freq_atualizacao: '07h00 diária', tier: 3, notes: 'Magento. 24-48h delivery, €49.90 free shipping.' },
  { id: 'loja-farmacia',   nome: 'Loja da Farmácia',           url: 'https://www.lojadafarmacia.com',      tipo: 'farmacia',     tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio',         freq_atualizacao: '07h00 diária', tier: 3 },
  { id: 'afarmaciaonline', nome: 'A Farmácia Online',          url: 'https://www.afarmaciaonline.pt',      tipo: 'farmacia',     tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio+jsonld',  freq_atualizacao: '08h00 diária', tier: 3, notes: 'WooCommerce, JSON-LD bem estruturado.' },
  { id: 'easyfarma',       nome: 'Easyfarma',                  url: 'https://easyfarma.pt',                tipo: 'farmacia',     tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio+jsonld',  freq_atualizacao: '08h00 diária', tier: 3, notes: 'Shopify, fácil de fazer scrape.' },
  { id: 'bairro-saude',    nome: 'Bairro da Saúde',            url: 'https://bairrodasaude.pt',            tipo: 'farmacia',     tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio+jsonld',  freq_atualizacao: '09h00 diária', tier: 3 },
  { id: 'haemiskin',       nome: 'HaemiSkin',                  url: 'https://www.haemiskin.pt',            tipo: 'nicho',        tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio+jsonld',  freq_atualizacao: '11h00 diária', tier: 5, notes: 'K-beauty boutique. COSRX, Anua, Heimish, Beauty of Joseon.' },
  { id: 'farmacia-saude',  nome: 'Farmácia Saúde',             url: 'https://www.farmaciasaude.com.pt',    tipo: 'farmacia',     tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio',         freq_atualizacao: '09h00 diária', tier: 3 },
  { id: 'farmaciasdirect', nome: 'Farmácias Direct',           url: 'https://www.farmaciasdirect.eu',      tipo: 'farmacia',     tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio+jsonld',  freq_atualizacao: '10h00 diária', tier: 3 },
  { id: 'korean-queens',   nome: 'Korean Queens',              url: 'https://www.koreanqueens.com/pt',     tipo: 'nicho',        tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio',         freq_atualizacao: '12h00 diária', tier: 5, notes: 'K-beauty, envio 24h PT.' },
  { id: 'cacau-chic',      nome: 'Cacau Chic Shop',            url: 'https://www.cacauchicshop.pt',        tipo: 'nicho',        tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio',         freq_atualizacao: '13h00 diária', tier: 6, notes: 'K-beauty + estética profissional.' },
  { id: 'sa-da-bandeira',  nome: 'Farmácia Sá da Bandeira',    url: 'https://www.sadabandeira.com',        tipo: 'farmacia',     tem_api: false, tem_afiliados: false, url_afiliados: null,                                            metodo_coleta: 'cheerio',         freq_atualizacao: '13h00 diária', tier: 3, notes: 'Regional Porto. Entregas domiciliárias até meia-noite.' },
];

let added = 0;
for (const s of NEW_STORES) {
  if (existing.has(s.id)) { console.log(`  ↩ ${s.id} já existe (skip)`); continue; }
  current.stores.push(s);
  added++;
}

current.last_updated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(STORES_PATH, JSON.stringify(current, null, 2), 'utf8');
console.log(`✔ ${added} novas lojas adicionadas. Total: ${current.stores.length}`);
