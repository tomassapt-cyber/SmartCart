'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'demo.html'));
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/demo.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(html);
  }
  res.writeHead(404);
  res.end();
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
    });
    await page.addInitScript(() => {
      window.__offer = (volume_ml, price, in_stock = true) => ({
        volume_ml, unit: 'ml', price, in_stock, url: `https://example.test/${volume_ml}`,
      });
      window.__fixture = async (ean, name, variantsByStore) => {
        const stores = {};
        const offers = {};
        for (const [slug, nameOfStore, variants] of variantsByStore) {
          stores[slug] = { name: nameOfStore, base_url: 'https://example.test' };
          const inStock = variants.filter(v => v.in_stock !== false);
          const prices = inStock.length ? inStock.map(v => v.price) : variants.map(v => v.price);
          offers[slug] = {
            in_stock: inStock.length > 0,
            price: Math.min(...prices),
            url: 'https://example.test',
            variants,
          };
        }
        STORE_BY_SLUG = { ...STORE_BY_SLUG, ...stores };
        PRODUCT_BY_EAN[ean] = { ean, name, brand: 'Teste', image_url: null };
        OFFERS_BY_PRODUCT[ean] = offers;
        OFERTAS_COM_VARIANTES.add(ean);
        OFERTAS_FALHADAS.delete(ean);
        await openPriceAnalyzer(ean);
      };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/demo.html`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(() => typeof openPriceAnalyzer), 'function');

    const aussie = await page.evaluate(async () => {
      const ean = '8700216890106';
      await window.__fixture(ean, 'Aussie Deep Hydration Hair Mask', [
        ['docmorris', 'DocMorris', [window.__offer(450, 13.74)]],
        ['wells', 'Wells', [window.__offer(500, 9.97)]],
        ['out-of-stock', 'Sem stock', [window.__offer(750, 1.50, false)]],
      ]);
      const buttons = [...document.querySelectorAll('.pa-vol-chip')];
      return {
        active: PA_STATE.volume,
        winner: document.querySelector('.pa-vol-chip.best-value')?.dataset.vol,
        labels: buttons.map(b => b.innerText.replace(/\s+/g, ' ').trim()),
        hero: document.querySelector('.pa-best-offer-store')?.innerText,
        bestPrice: bestOfferFor(ean)?.price,
        viewport: window.innerWidth,
        pageWidth: document.documentElement.scrollWidth,
        chipRight: Math.max(...buttons.map(b => b.getBoundingClientRect().right)),
      };
    });
    assert.equal(aussie.active, 500, 'Aussie abre no volume de melhor €/100 ml');
    assert.equal(aussie.winner, '500', 'o botão de 500 ml está marcado como melhor compra');
    assert.match(aussie.labels.find(x => x.startsWith('500 ml')), /1,99\s*€\/100 ml/);
    assert.match(aussie.labels.find(x => x.startsWith('500 ml')), /melhor compra/i);
    assert.equal(aussie.hero, 'Wells');
    assert.equal(aussie.bestPrice, 9.97, 'o cálculo absoluto do cartão continua inalterado');
    assert.ok(aussie.pageWidth <= aussie.viewport, 'o layout móvel não cria scroll horizontal');
    assert.ok(aussie.chipRight <= aussie.viewport, 'os tamanhos cabem no ecrã móvel');

    const ties = await page.evaluate(async () => {
      await window.__fixture('tie-name', 'Máscara 450 ml', [
        ['tie-name-a', 'Loja A', [window.__offer(450, 9)]],
        ['tie-name-b', 'Loja B', [window.__offer(500, 10)]],
      ]);
      const named = PA_STATE.volume;
      await window.__fixture('tie-largest', 'Máscara sem tamanho', [
        ['tie-largest-a', 'Loja A', [window.__offer(450, 9)]],
        ['tie-largest-b', 'Loja B', [window.__offer(500, 10)]],
      ]);
      return { named, largest: PA_STATE.volume };
    });
    assert.deepEqual(ties, { named: 450, largest: 500 }, 'empate prefere o tamanho do nome; sem ele, o maior');

    const oneSize = await page.evaluate(async () => {
      await window.__fixture('one-size', 'Máscara 100 ml', [
        ['one-size-store', 'Loja única', [window.__offer(100, 4)]],
      ]);
      return {
        volume: PA_STATE.volume,
        staticChip: document.querySelector('.pa-vol-chip-static')?.innerText,
        buttons: document.querySelectorAll('button.pa-vol-chip').length,
      };
    });
    assert.deepEqual(oneSize, { volume: 100, staticChip: '100 ml', buttons: 0 }, 'um só tamanho mantém o seletor estático atual');

    const selected = await page.evaluate(async () => {
      await openPriceAnalyzer('8700216890106', 450);
      document.querySelector('.pa-vol-chip[data-vol="450"]').click();
      document.getElementById('pa-best-add-cart').click();
      const saved = bundleState.volumes.get('8700216890106');
      closePriceAnalyzer();
      await openPriceAnalyzer('8700216890106');
      return { saved, reopened: PA_STATE.volume };
    });
    assert.deepEqual(selected, { saved: 450, reopened: 450 }, 'o tamanho escolhido fica guardado e é respeitado ao reabrir a ficha');

    const noStock = await page.evaluate(async () => {
      await window.__fixture('no-stock', 'Máscara 450 ml', [
        ['no-stock-store', 'Sem stock', [window.__offer(450, 3, false), window.__offer(500, 4, false)]],
      ]);
      return {
        volume: PA_STATE.volume,
        best: document.querySelectorAll('.pa-vol-chip.best-value').length,
        stockLabels: [...document.querySelectorAll('.pa-vol-chip-unit')].map(x => x.innerText),
      };
    });
    assert.deepEqual(noStock, { volume: 450, best: 0, stockLabels: ['— €/100 ml', '— €/100 ml'] }, 'sem stock mantém o tamanho do nome e não inventa melhor compra');

    console.log('PASS Chromium: melhor €/100 ml, desempates, um tamanho, escolha guardada no carrinho e sem stock.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
