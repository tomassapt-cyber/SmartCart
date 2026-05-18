#!/usr/bin/env node
/**
 * SmartCartCosmetics — Loader Postgres
 *
 * Lê data/stores.json + data/products-master.json + data/prices-snapshot.json
 * e popula as tabelas via parâmetros (mais seguro que SQL inline).
 *
 * Uso:
 *   DATABASE_URL=postgres://... node scripts/load-catalog.js
 *
 * Idempotente: usa ON CONFLICT em lojas/marcas/produtos. A tabela precos
 * é append-only (cada execução adiciona um novo snapshot).
 */

const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('✗ Define DATABASE_URL antes de correr o loader.');
  console.error('  Exemplo: DATABASE_URL=postgres://user:pass@localhost:5432/smartcart_cosmetics node scripts/load-catalog.js');
  process.exit(1);
}

let Pool;
try { ({ Pool } = require('pg')); }
catch (e) { console.error('✗ Falta dependência `pg`. Corre: npm install pg'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const STORES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'stores.json'), 'utf8')).stores;
const PRODUCTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products-master.json'), 'utf8')).products;
const PRICES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'prices-snapshot.json'), 'utf8')).precos;

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ─── LOJAS ───
    console.log(`→ A carregar ${STORES.length} lojas…`);
    for (const s of STORES) {
      await client.query(`
        INSERT INTO lojas (slug, nome, url, tipo, tier, tem_api, tem_afiliados, url_afiliados, metodo_coleta, freq_atualizacao)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (slug) DO UPDATE SET
          nome=EXCLUDED.nome, url=EXCLUDED.url, tipo=EXCLUDED.tipo, tier=EXCLUDED.tier,
          tem_api=EXCLUDED.tem_api, tem_afiliados=EXCLUDED.tem_afiliados,
          url_afiliados=EXCLUDED.url_afiliados, metodo_coleta=EXCLUDED.metodo_coleta,
          freq_atualizacao=EXCLUDED.freq_atualizacao
      `, [s.id, s.nome, s.url, s.tipo, s.tier, s.tem_api, s.tem_afiliados, s.url_afiliados, s.metodo_coleta, s.freq_atualizacao]);
    }

    // ─── MARCAS (derivadas) ───
    const marcasMap = new Map();
    for (const p of PRODUCTS) {
      if (!marcasMap.has(p.marca_slug)) {
        marcasMap.set(p.marca_slug, { slug: p.marca_slug, nome: p.marca, pais: p.pais_origem, segmento: p.segmento });
      }
    }
    console.log(`→ A carregar ${marcasMap.size} marcas…`);
    for (const m of marcasMap.values()) {
      await client.query(`
        INSERT INTO marcas (slug, nome, pais_origem, segmento)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, pais_origem=EXCLUDED.pais_origem, segmento=EXCLUDED.segmento
      `, [m.slug, m.nome, m.pais, m.segmento]);
    }

    // ─── PRODUTOS ───
    console.log(`→ A carregar ${PRODUCTS.length} produtos…`);
    for (const p of PRODUCTS) {
      const volMatch = String(p.nome).match(/(\d+)\s*(ml|g|amp)\b/i);
      const volume = volMatch ? parseInt(volMatch[1], 10) : null;
      const unit = volMatch ? volMatch[2].toLowerCase() : 'ml';
      await client.query(`
        INSERT INTO produtos (ean, nome, marca_id, categoria_id, volume_ml, volume_unit, descricao, imagem_url)
        SELECT $1, $2, m.id, c.id, $3, $4, $5, $6
          FROM marcas m, categorias c
         WHERE m.slug = $7 AND c.slug = $8
        ON CONFLICT (ean) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url
      `, [p.ean, p.nome, volume, unit, p.descricao, p.imagem_url, p.marca_slug, p.categoria]);
    }

    // ─── PRECOS (append) ───
    console.log(`→ A inserir ${PRICES.length} preços (snapshot)…`);
    let inserted = 0;
    for (const pr of PRICES) {
      await client.query(`
        INSERT INTO precos (produto_id, loja_id, preco, preco_anterior, desconto_pct, moeda, em_stock, url_produto, coletado_em)
        SELECT p.id, l.id, $3, $4, $5, $6, $7, $8, $9::timestamptz
          FROM produtos p, lojas l
         WHERE p.ean = $1 AND l.slug = $2
      `, [pr.ean, pr.loja_id, pr.preco, pr.preco_anterior, pr.desconto_pct, pr.moeda, pr.em_stock, pr.url_produto, pr.coletado_em]);
      inserted++;
      if (inserted % 500 === 0) process.stdout.write(`  ${inserted}/${PRICES.length}\r`);
    }
    process.stdout.write('\n');

    // ─── ultima_coleta ───
    await client.query(`UPDATE lojas SET ultima_coleta = NOW() WHERE slug = ANY($1)`, [STORES.map(s => s.id)]);

    await client.query('COMMIT');
    console.log('✔ Carregamento concluído.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Erro — rollback:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
