#!/usr/bin/env node
// Compõe data/prices-verified.json a partir das inventories existentes + status para o que falta.
/**
 * Estratégia: para cada (produto × loja alvo), procura na inventory file da loja.
 * - Se há observed_price → status "confirmed" (fonte: SERP snippet de sessão anterior)
 * - Se há resolved_url sem preço → status "url_only" (URL canónica confirmada, preço por fetch)
 * - Caso contrário → status "needs_playwright" (WAF bloqueia fetch directo)
 *
 * Sessão de 2026-05-14: 5/5 lojas alvo (notino, douglas, sephora, wells, atida)
 * retornam 403 a fetch directo via ambiente actual. Confirmação em tempo
 * real real exige VM com IP residencial + Playwright stealth.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'seed-data.json'), 'utf8'));
const TARGET_STORES = ['notino', 'douglas', 'sephora', 'wells', 'atida'];

const STORE_NAMES = {
  notino: 'Notino PT',
  douglas: 'Douglas PT',
  sephora: 'Sephora PT',
  wells: 'Wells',
  atida: 'Atida | Mifarma PT',
};

// Carrega inventories existentes
function loadInventory(slug) {
  const fp = path.join(ROOT, 'data', 'inventory', `${slug}-verified.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}
const INVENTORIES = {};
for (const slug of TARGET_STORES) INVENTORIES[slug] = loadInventory(slug);

// URLs originais do seed
const SEED_URLS = {};
for (const sp of SEED.store_products || []) {
  if (!TARGET_STORES.includes(sp.store_slug)) continue;
  SEED_URLS[sp.store_slug] = {};
  for (const it of sp.items || []) SEED_URLS[sp.store_slug][it.ean] = it.url;
}

const NOW = new Date().toISOString();
const SESSION_NOTE = 'Sessão 2026-05-14: WebFetch directo bloqueado por Cloudflare/DataDome em todas as 5 lojas alvo. Dados confirmados via Google SERP snippets em sessões anteriores quando disponíveis.';

const products = [];
const stats = { confirmed: 0, url_only: 0, needs_playwright: 0, not_found: 0, not_attempted: 0 };

for (const p of SEED.products || []) {
  const lojas = [];
  for (const slug of TARGET_STORES) {
    const inv = INVENTORIES[slug];
    const invItem = inv?.items?.find(i => i.ean === p.ean);
    const seedUrl = SEED_URLS[slug]?.[p.ean] || null;

    if (!invItem) {
      lojas.push({
        loja_id: slug,
        loja_nome: STORE_NAMES[slug],
        status: 'not_attempted',
        motivo: 'Loja não tem inventory file gerado. Verificar elegibilidade por tier.',
        url_seed_existente: seedUrl,
        confirmado_em: NOW,
      });
      stats.not_attempted++;
      continue;
    }

    if (invItem.status === 'not-found') {
      lojas.push({
        loja_id: slug,
        loja_nome: STORE_NAMES[slug],
        status: 'not_found',
        motivo: invItem.notes || 'Loja não comercializa este produto',
        confirmado_em: invItem.verified_at || NOW,
      });
      stats.not_found++;
      continue;
    }

    if (invItem.observed_price != null) {
      // PREÇO CONFIRMADO (em sessão anterior via SERP)
      lojas.push({
        loja_id: slug,
        loja_nome: STORE_NAMES[slug],
        url_confirmado: invItem.resolved_url,
        nome_na_loja: invItem.observed_name,
        preco: Number(invItem.observed_price),
        preco_anterior: invItem.observed_previous_price != null ? Number(invItem.observed_previous_price) : null,
        em_promocao: invItem.observed_previous_price != null,
        em_stock: invItem.observed_in_stock !== false,
        volume: invItem.observed_volume_ml ? `${invItem.observed_volume_ml} ${invItem.observed_volume_unit || 'ml'}` : null,
        status: 'confirmed',
        fonte: 'serp_snippet_anterior',
        notas: invItem.notes || '',
        confirmado_em: invItem.verified_at || NOW,
      });
      stats.confirmed++;
      continue;
    }

    if (invItem.resolved_url) {
      // URL canónica mas sem preço
      lojas.push({
        loja_id: slug,
        loja_nome: STORE_NAMES[slug],
        url_confirmado: invItem.resolved_url,
        nome_na_loja: invItem.observed_name || null,
        status: 'url_only',
        motivo: 'URL canónica conhecida mas preço requer fetch da PDP (bloqueado por WAF nesta sessão)',
        notas: invItem.notes || '',
        confirmado_em: invItem.verified_at || NOW,
      });
      stats.url_only++;
      continue;
    }

    // Tem entry mas status low-confidence / sem URL
    lojas.push({
      loja_id: slug,
      loja_nome: STORE_NAMES[slug],
      status: 'needs_playwright',
      url: seedUrl,
      motivo: 'WebFetch directo retornou 403 (Cloudflare/DataDome). Exige Playwright stealth + IP residencial.',
      confirmado_em: NOW,
    });
    stats.needs_playwright++;
  }

  products.push({
    ean: p.ean,
    nome_canonico: p.name,
    brand: p.brand,
    category: p.category,
    lojas,
  });
}

const output = {
  version: '1.0',
  generated_at: NOW,
  session_note: SESSION_NOTE,
  target_stores: TARGET_STORES.map(s => ({ slug: s, name: STORE_NAMES[s] })),
  stats: {
    total_products: products.length,
    total_store_product_pairs: products.length * TARGET_STORES.length,
    confirmed_with_price: stats.confirmed,
    url_only: stats.url_only,
    needs_playwright: stats.needs_playwright,
    not_found_in_store: stats.not_found,
    not_attempted: stats.not_attempted,
  },
  products,
};

const outPath = path.join(ROOT, 'data', 'prices-verified.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`✔ ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
console.log();
console.log('═══ ESTATÍSTICAS ═══');
console.log(`Pares (produto × loja): ${products.length * TARGET_STORES.length}`);
console.log(`  ✓ Confirmados com preço (de sessão anterior via SERP): ${stats.confirmed}`);
console.log(`  ⓘ URL canónica conhecida, preço pendente: ${stats.url_only}`);
console.log(`  ⏳ Needs playwright (fetch bloqueado): ${stats.needs_playwright}`);
console.log(`  ✗ Loja não vende: ${stats.not_found}`);
console.log(`  ─ Não tentado (sem inventory): ${stats.not_attempted}`);
console.log();
console.log('═══ TABELA RESUMO ═══');
console.log('Produto'.padEnd(46) + 'Loja        Preço      Volume  Stock  Fonte');
console.log('─'.repeat(95));
for (const p of products) {
  const productLabel = (p.brand + ' ' + p.nome_canonico.replace(p.brand,'').trim()).slice(0, 44).padEnd(46);
  for (const l of p.lojas) {
    let line = productLabel;
    line += (l.loja_id).padEnd(11) + ' ';
    if (l.status === 'confirmed') {
      line += ('€' + l.preco.toFixed(2)).padEnd(10) + ' ';
      line += (l.volume || '?').padEnd(7) + ' ';
      line += (l.em_stock ? 'sim' : 'não').padEnd(6) + ' ';
      line += 'serp(anterior)';
    } else if (l.status === 'url_only') {
      line += '— URL+         ?       ?      url_only';
    } else if (l.status === 'not_found') {
      line += '— não vende —';
    } else if (l.status === 'needs_playwright') {
      line += '— bloqueado WAF, needs_playwright —';
    } else {
      line += '— não tentado —';
    }
    console.log(line);
    productLabel.replace(/./g, ' '); // só primeiro produto label, restantes em branco
  }
  console.log();
}
