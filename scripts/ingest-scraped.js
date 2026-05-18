#!/usr/bin/env node
/**
 * SmartCart — ingest scraped JSON back into inventory files
 * ============================================================
 *
 * Lê data/scraped/<date>/<store>.json e actualiza
 * data/inventory/<store>-verified.json com os preços frescos.
 *
 * - Faz backup do inventory original em data/inventory/.backup/
 * - Só sobrescreve observed_price quando o scrape teve sucesso
 * - Anota o delta vs preço anterior
 * - No fim, sugere correr build-catalog para regenerar demo.html
 *
 * Uso:
 *   node scripts/ingest-scraped.js                  # data de hoje
 *   node scripts/ingest-scraped.js --date=2026-05-16
 *   node scripts/ingest-scraped.js --dry-run        # mostra alterações, não escreve
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INVENTORY_DIR = path.join(ROOT, 'data', 'inventory');
const BACKUP_DIR = path.join(INVENTORY_DIR, '.backup');
const SCRAPED_ROOT = path.join(ROOT, 'data', 'scraped');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);
const DATE = args.date || new Date().toISOString().slice(0, 10);
const DRY = !!args['dry-run'];

const inDir = path.join(SCRAPED_ROOT, DATE);
if (!fs.existsSync(inDir)) {
  console.error(`✗ Sem dados scraped para ${DATE}: ${inDir}`);
  console.error(`  Corre primeiro: node scripts/scrape-prices.js`);
  process.exit(1);
}

if (!DRY) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const files = fs.readdirSync(inDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
console.log(`📦 Ficheiros scraped para ${DATE}: ${files.join(', ')}`);
console.log(`Modo: ${DRY ? 'DRY-RUN (sem escrever)' : 'WRITE'}`);
console.log('');

let totalChanges = 0;

for (const f of files) {
  const scraped = JSON.parse(fs.readFileSync(path.join(inDir, f), 'utf8'));
  const slug = scraped.store_slug;
  const invFile = path.join(INVENTORY_DIR, `${slug}-verified.json`);
  if (!fs.existsSync(invFile)) {
    console.log(`⏭  ${slug}: sem inventory existente (${invFile})`);
    continue;
  }
  const inv = JSON.parse(fs.readFileSync(invFile, 'utf8'));
  const byEan = Object.fromEntries(inv.items.map(it => [it.ean, it]));

  let updated = 0, kept = 0, errors = 0;
  const changes = [];

  for (const r of scraped.results) {
    const item = byEan[r.ean];
    if (!item) continue;
    if (r.status !== 'ok' || !r.best_offer) { errors++; continue; }

    const newPrice = r.best_offer.price;
    const oldPrice = item.observed_price ?? null;
    const delta = oldPrice != null ? (newPrice - oldPrice) : null;
    const priceUnchanged = oldPrice === newPrice && item.resolved_url === r.url;
    // Já não fazemos `continue` quando preço não mudou — precisamos sempre
    // de actualizar variants (que podem ter sido detectadas após scrape)
    if (priceUnchanged) {
      kept++;
    } else {
      updated++;
      changes.push({ ean: r.ean, old: oldPrice, new: newPrice, delta, name: item.name });
    }

    // actualizar item in-place
    item.observed_price = newPrice;
    if (r.best_offer.previousPrice) item.observed_previous_price = r.best_offer.previousPrice;
    item.observed_currency = r.best_offer.currency || 'EUR';
    item.observed_in_stock = !r.best_offer.availability || /InStock/i.test(r.best_offer.availability);
    if (r.gtin_observed) item.gtin_observed = r.gtin_observed;
    item.observed_name = r.name_observed || item.observed_name;
    item.confidence = 0.97;
    item.status = item.status === 'not-found' ? 'not-found' : 'verified';
    item.resolution_method = 'playwright-jsonld';
    item.verified_at = r.scraped_at;

    // Persistir variantes detectadas - combina 3 fontes:
    //   (a) dom_variants → variantes via DOM tiles (Wells, Druni)
    //   (b) all_offers → variantes via JSON-LD offers (Notino) e microdata (Sephora)
    //   (c) fallback: o próprio preço observado se não houver mais nada
    const combined = [];

    // (a) DOM variants
    if (Array.isArray(r.dom_variants)) {
      for (const v of r.dom_variants) {
        if (!isFinite(v.volume) || !isFinite(v.price) || v.price < 0.5) continue;
        combined.push({ volume_ml: v.volume, unit: v.unit || 'ml', price: v.price, in_stock: true, url: v.url || null });
      }
    }
    // (b) JSON-LD/microdata offers — extrair volume do name
    if (Array.isArray(r.all_offers)) {
      for (const o of r.all_offers) {
        if (!isFinite(o.price) || o.price < 0.5) continue;
        let vol = null;
        // tenta extrair volume do nome da oferta (e.g. "YSL Black Opium 50 ml")
        if (o.name) {
          const m = o.name.match(/(\d+(?:[.,]\d+)?)\s*(ml|gr|g|kg|l)\b/i);
          if (m) {
            const v = parseFloat(m[1].replace(',', '.'));
            vol = m[2].toLowerCase() === 'l' ? v * 1000 : v;
          }
        }
        // se não conseguimos o volume mas só há 1 offer no JSON-LD,
        // assume que é o volume esperado do EAN
        if (!vol && (item.expected_volume_ml || r.expected_volume_ml) && r.all_offers.length <= 3) {
          vol = item.expected_volume_ml || r.expected_volume_ml;
        }
        if (!vol) continue;
        combined.push({
          volume_ml: vol, unit: 'ml',
          price: Number(o.price),
          in_stock: !o.availability || /InStock/i.test(o.availability),
          url: r.url || null,
        });
      }
    }
    // (c) fallback se nada
    if (combined.length === 0 && item.expected_volume_ml) {
      combined.push({
        volume_ml: item.expected_volume_ml, unit: 'ml',
        price: newPrice, in_stock: item.observed_in_stock !== false, url: r.url || null,
      });
    }

    // Filtro €/ml ratio (anti-contamination) — rejeitar outliers
    if (combined.length >= 3) {
      const ratios = combined.map(v => v.price / v.volume_ml);
      ratios.sort((a, b) => a - b);
      const median = ratios[Math.floor(ratios.length / 2)];
      const filtered = combined.filter(v => {
        const r = v.price / v.volume_ml;
        // tolerância: 0.25× a 4× a mediana (perfumes têm range largo entre tamanhos)
        return r >= median * 0.25 && r <= median * 4;
      });
      // Só aplicamos o filtro se ele não eliminar demasiado
      if (filtered.length >= 2) combined.length = 0, combined.push(...filtered);
    }

    // Dedup por volume + ordenar
    const variants = combined
      .map(v => ({ ...v, price: Number(v.price.toFixed(2)) }))
      .sort((a, b) => a.price - b.price)
      .filter((v, i, arr) => arr.findIndex(x => x.volume_ml === v.volume_ml) === i)
      .sort((a, b) => a.volume_ml - b.volume_ml);

    if (variants.length > 0) item.observed_variants = variants;

    item.notes = (item.notes || '').replace(/Preço de \d+-\d+-\d+:?\s*/, '') + (delta != null ? ` Refresh ${DATE}: ${oldPrice?.toFixed(2)}€ → ${newPrice.toFixed(2)}€` : ` Scrape ${DATE}: ${newPrice.toFixed(2)}€`);
  }

  // recalcular stats
  inv.stats = inv.items.reduce((s, it) => {
    s.total = (s.total||0) + 1;
    if (it.status === 'verified') s.verified = (s.verified||0)+1;
    else if (it.status === 'variant') s.variant = (s.variant||0)+1;
    else if (it.status === 'not-found') s.not_found = (s.not_found||0)+1;
    else s.low_confidence = (s.low_confidence||0)+1;
    return s;
  }, { total: 0, verified: 0, variant: 0, not_found: 0, low_confidence: 0 });
  inv.verified_at = new Date().toISOString();
  inv.method = `playwright-headless (refresh ${DATE})`;

  console.log(`🏬 ${slug}: ${updated} actualizado · ${kept} mantido · ${errors} erro/blocked`);
  changes.slice(0, 8).forEach(c => {
    const arrow = c.delta == null ? '·' : c.delta > 0 ? '↑' : c.delta < 0 ? '↓' : '=';
    console.log(`     ${c.ean} ${(c.old?.toFixed(2)+'€').padStart(8)} → ${(c.new.toFixed(2)+'€').padStart(8)} ${arrow} ${c.name.slice(0, 50)}`);
  });
  if (changes.length > 8) console.log(`     ... +${changes.length - 8} mais`);

  totalChanges += updated;

  if (!DRY) {
    // backup
    const backupName = `${slug}-verified.${DATE}.bak.json`;
    fs.copyFileSync(invFile, path.join(BACKUP_DIR, backupName));
    fs.writeFileSync(invFile, JSON.stringify(inv, null, 2));
  }
}

console.log('');
console.log('═════════ Resumo ═════════');
console.log(`${totalChanges} preços actualizados nos inventories`);
if (DRY) {
  console.log(`(DRY-RUN — nenhum ficheiro escrito; corre sem --dry-run para aplicar)`);
} else {
  console.log(`Backups em: data/inventory/.backup/*.bak.json`);
  console.log(`\nPróximo: node scripts/build-catalog.js  ← regenera demo.html`);
}
