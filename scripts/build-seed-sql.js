#!/usr/bin/env node
/**
 * SmartCartCosmetics — Builder do seed-full.sql
 * Lê data/{stores,products-master,prices-snapshot}.json e produz
 * INSERTs idempotentes para o schema em database/schema.sql.
 *
 * Uso: node scripts/build-seed-sql.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STORES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stores.json'), 'utf8')).stores;
const PRODUCTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products-master.json'), 'utf8')).products;
const PRICES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prices-snapshot.json'), 'utf8')).precos;

function esc(s) {
  if (s === null || s === undefined) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}
function num(n) { return n === null || n === undefined ? 'NULL' : Number(n); }
function bool(b) { return b ? 'TRUE' : 'FALSE'; }
function slugify(s) {
  return s.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 60);
}

const out = [];
out.push('-- ============================================================');
out.push('-- SmartCartCosmetics — seed-full.sql (gerado por build-seed-sql.js)');
out.push(`-- Lojas: ${STORES.length} · Produtos: ${PRODUCTS.length} · Preços: ${PRICES.length}`);
out.push('-- ============================================================');
out.push('BEGIN;');
out.push('');

// ───────────────── LOJAS ─────────────────
out.push('-- ─── LOJAS ───');
for (const s of STORES) {
  out.push(`INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
VALUES (${esc(s.id)}, ${esc(s.nome)}, ${esc(s.url)}, ${esc(s.tipo)}, ${num(s.tier)}, ${bool(s.tem_api)}, ${bool(s.tem_afiliados)}, ${esc(s.url_afiliados)}, ${esc(s.metodo_coleta)}, ${esc(s.freq_atualizacao)})
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier, tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados, url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta, freq_atualizacao=EXCLUDED.freq_atualizacao;`);
}
out.push('');

// ───────────────── MARCAS (derivadas dos produtos) ─────────────────
out.push('-- ─── MARCAS ───');
const marcasMap = new Map();
for (const p of PRODUCTS) {
  if (!marcasMap.has(p.marca_slug)) {
    marcasMap.set(p.marca_slug, { slug: p.marca_slug, nome: p.marca, pais: p.pais_origem, segmento: p.segmento });
  }
}
for (const m of marcasMap.values()) {
  out.push(`INSERT INTO marcas (slug, nome, pais_origem, segmento)
VALUES (${esc(m.slug)}, ${esc(m.nome)}, ${esc(m.pais)}, ${esc(m.segmento)})
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento;`);
}
out.push('');

// ───────────────── CATEGORIAS já no schema (seed inline). Garantir. ─────────────────
// (o schema.sql já insere as 5 top-level; nada a fazer)

// ───────────────── PRODUTOS ─────────────────
out.push('-- ─── PRODUTOS ───');
for (const p of PRODUCTS) {
  // tentar extrair volume_ml do nome
  const volMatch = String(p.nome).match(/(\d+)\s*(ml|g|amp)\b/i);
  const volume = volMatch ? parseInt(volMatch[1], 10) : null;
  const unit = volMatch ? volMatch[2].toLowerCase() : 'ml';
  out.push(`INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
SELECT ${esc(p.ean)}, ${esc(p.nome)}, m.id, c.id, ${num(volume)}, ${esc(unit)}, ${esc(p.descricao)}, ${esc(p.imagem_url)}
  FROM marcas m, categorias c WHERE m.slug = ${esc(p.marca_slug)} AND c.slug = ${esc(p.categoria)}
ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url;`);
}
out.push('');

// ───────────────── PRECOS (append-only — múltiplas linhas em batch) ─────────────────
out.push('-- ─── PRECOS (snapshot 2026-05-11 06h00) ───');
const BATCH = 500;
for (let i = 0; i < PRICES.length; i += BATCH) {
  const slice = PRICES.slice(i, i + BATCH);
  out.push('INSERT INTO precos (produto_id, loja_id, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)');
  out.push('SELECT p.id, l.id, v.preco, v.preco_anterior, v.desconto_pct, v.moeda, v.em_stock, v.url_produto, v.coletado_em::timestamptz');
  out.push('FROM (VALUES');
  const rows = slice.map(pr =>
    `  (${esc(pr.ean)}, ${esc(pr.loja_id)}, ${num(pr.preco)}, ${num(pr.preco_anterior)}, ${num(pr.desconto_pct)}, ${esc(pr.moeda)}, ${bool(pr.em_stock)}, ${esc(pr.url_produto)}, ${esc(pr.coletado_em)})`
  );
  out.push(rows.join(',\n'));
  out.push(') AS v(ean, loja_slug, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)');
  out.push('JOIN produtos p ON p.ean = v.ean');
  out.push('JOIN lojas l ON l.slug = v.loja_slug;');
  out.push('');
}

out.push('-- atualizar ultima_coleta de cada loja');
out.push("UPDATE lojas SET ultima_coleta = '2026-05-11T06:00:00Z' WHERE slug IN (SELECT DISTINCT slug FROM lojas);");
out.push('');
out.push('COMMIT;');
out.push('');

const outPath = path.join(ROOT, 'database', 'seed-full.sql');
fs.writeFileSync(outPath, out.join('\n'), 'utf8');
console.log(`✔ ${outPath}`);
console.log(`  Lojas: ${STORES.length} · Marcas: ${marcasMap.size} · Produtos: ${PRODUCTS.length} · Preços: ${PRICES.length}`);
console.log(`  Tamanho: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
