#!/usr/bin/env node
/**
 * Inspect a single PDP — dump structure relevant for price/variant scraping.
 *
 * Uso:
 *   node scripts/inspect-page.js "https://wells.pt/black-opium-eau-de-parfum-287941.html"
 *
 * Output:
 *   data/inspect/<host>-<timestamp>.json     ← dump completo
 *   resumo no terminal
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const url = process.argv[2];
if (!url) {
  console.error('Uso: node scripts/inspect-page.js <url>');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'inspect');
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    locale: 'pt-PT',
    viewport: { width: 1366, height: 900 },
  });
  const page = await ctx.newPage();
  console.log(`A inspeccionar: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2000); // deixa o JS hidratar variantes

  const dump = await page.evaluate(() => {
    // 1) Todos os JSON-LDs (relevante para ver AggregateOffer + offers)
    const ldjson = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(s => { try { return JSON.parse(s.textContent||'{}'); } catch { return { _parse_error: true }; } });

    // 2) Elementos com data-attr-* que possam ser variantes
    const dataElements = [];
    document.querySelectorAll('[data-attr-value], [data-size], [data-volume], [data-variant], [data-price]').forEach(e => {
      const attrs = {};
      for (const a of e.attributes) if (a.name.startsWith('data-')) attrs[a.name] = a.value;
      dataElements.push({
        tag: e.tagName.toLowerCase(),
        attrs,
        href: e.tagName === 'A' ? e.href : null,
        text: (e.innerText || '').slice(0, 100).trim(),
        classes: e.className?.toString?.()?.slice(0, 80) || '',
      });
    });

    // 3) Qualquer elemento que pareça "selector de tamanho" pelo texto
    const sizeSelectorCandidates = [];
    document.querySelectorAll('a, button, label, li, div').forEach(e => {
      if (e.children.length > 4) return;
      const txt = (e.innerText || '').trim();
      if (txt.length === 0 || txt.length > 60) return;
      // Procurar padrão: número + "ml/g" e opcionalmente um preço
      const hasVolume = /\b\d+\s*(ml|g|gr|kg|l)\b/i.test(txt);
      const hasPrice = /\d+[.,]\d{2}\s*€|€\s*\d+[.,]\d{2}/i.test(txt);
      if (hasVolume) {
        sizeSelectorCandidates.push({
          tag: e.tagName.toLowerCase(),
          classes: (e.className?.toString?.() || '').slice(0, 60),
          text: txt.replace(/\s+/g, ' '),
          href: e.tagName === 'A' ? e.href : null,
          hasPrice,
          parentClasses: (e.parentElement?.className?.toString?.() || '').slice(0, 60),
        });
      }
    });

    // 4) Todos os preços visíveis na página (com €)
    const priceTexts = [];
    document.querySelectorAll('span, div, p, strong, b').forEach(e => {
      if (e.children.length > 0) return; // só folhas
      const txt = (e.textContent || '').trim();
      if (/^\s*\d+[.,]\d{2}\s*€\s*$|^\s*€\s*\d+[.,]\d{2}\s*$/.test(txt)) {
        priceTexts.push({
          tag: e.tagName.toLowerCase(),
          classes: (e.className?.toString?.() || '').slice(0, 60),
          text: txt,
          parentTag: e.parentElement?.tagName?.toLowerCase(),
          parentClasses: (e.parentElement?.className?.toString?.() || '').slice(0, 60),
        });
      }
    });

    return {
      url: location.href,
      title: document.title,
      ldjson_count: ldjson.length,
      ldjson,
      data_elements_count: dataElements.length,
      data_elements: dataElements.slice(0, 30),
      size_selector_candidates_count: sizeSelectorCandidates.length,
      size_selector_candidates: sizeSelectorCandidates.slice(0, 30),
      price_texts_count: priceTexts.length,
      price_texts: priceTexts.slice(0, 20),
    };
  });

  await browser.close();

  const host = new URL(url).host.replace(/[^a-z0-9]/g, '-');
  const ts = new Date().toISOString().replace(/[^\d]/g, '').slice(0, 14);
  const outFile = path.join(OUT_DIR, `${host}-${ts}.json`);
  fs.writeFileSync(outFile, JSON.stringify(dump, null, 2));

  console.log('\n══════════ RESUMO ══════════');
  console.log(`Title:                ${dump.title}`);
  console.log(`JSON-LD blocks:       ${dump.ldjson_count}`);
  console.log(`data-* elements:      ${dump.data_elements_count}`);
  console.log(`Size selectors found: ${dump.size_selector_candidates_count}`);
  console.log(`Price texts visible:  ${dump.price_texts_count}`);
  console.log('\nDump completo em:');
  console.log(`  ${outFile}`);
  console.log('\nPrimeiros 5 size selectors:');
  (dump.size_selector_candidates || []).slice(0, 5).forEach((s, i) => {
    console.log(`  ${i+1}. <${s.tag} class="${s.classes}"> "${s.text}" ${s.hasPrice ? '💰' : ''}`);
  });
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
