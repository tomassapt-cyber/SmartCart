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
    res.end(html);
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end('{}');
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1') return route.continue();
      return route.abort();
    });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/demo.html`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(() => typeof bundleRefresh), 'function', 'bundleRefresh disponível no Chromium');

    const check = await page.evaluate(() => {
      const ean = '3701129801369';
      const store = (name) => ({ name, shipping_zones: { mainland: 4.50, madeira: 4.50, acores: 4.50 } });
      STORE_BY_SLUG = { sofarma: store('Sofarma'), pharma24: store('Pharma24') };
      PRODUCT_BY_EAN[ean] = { ean, name: 'Bioderma Sébium Night Peel 40 ml', brand: 'Bioderma', image_url: null };
      bundleState.items = new Map([[ean, 1]]);
      bundleState.volumes = new Map([[ean, 40]]);
      bundleState.zone = 'nacional';
      OFERTAS_FALHADAS.delete(ean);

      OFFERS_BY_PRODUCT[ean] = {
        sofarma: { in_stock: true, price: 11.23, url: 'https://example.test/sofarma' },
        pharma24: {
          in_stock: true, price: 17.00, url: 'https://example.test/pharma24',
          variants: [{ volume_ml: 40, price: 12.71, url: 'https://example.test/pharma24-40', in_stock: true }],
        },
      };
      OFERTAS_COM_VARIANTES.add(ean);
      bundleRefresh();
      clearTimeout(BUNDLE_LIVE_T);
      const rowWithHeadline = document.querySelector('#bundle-body .bundle-row-price').innerText;
      const optimized = optimizeBundle([{ ean, qty: 1 }], 'nacional');
      const podium = productPodiumMiniHTML(ean);

      OFERTAS_COM_VARIANTES.delete(ean);
      bundleRefresh();
      clearTimeout(BUNDLE_LIVE_T);
      const rowWhileLoading = document.querySelector('#bundle-body .bundle-row-price').innerText;
      const optimizerWhileLoading = optimizeBundle([{ ean, qty: 1 }], 'nacional');

      OFERTAS_FALHADAS.add(ean);
      bundleRefresh();
      clearTimeout(BUNDLE_LIVE_T);
      const rowAfterFailure = document.querySelector('#bundle-body .bundle-row-price').innerText;
      OFERTAS_FALHADAS.delete(ean);

      OFFERS_BY_PRODUCT[ean] = {
        pharma24: {
          in_stock: true, price: 4.50, url: 'https://example.test/pharma24',
          variants: [{ volume_ml: 30, price: 7.11, url: 'https://example.test/pharma24-30', in_stock: true }],
        },
      };
      OFERTAS_COM_VARIANTES.add(ean);
      bundleRefresh();
      clearTimeout(BUNDLE_LIVE_T);
      const rowWithoutMatchingVolume = document.querySelector('#bundle-body .bundle-row-price').innerText;
      const optimizerWithoutMatchingVolume = optimizeBundle([{ ean, qty: 1 }], 'nacional');

      bundleState.volumes.delete(ean);
      OFFERS_BY_PRODUCT[ean] = {
        sofarma: { in_stock: true, price: 11.23, url: 'https://example.test/sofarma' },
        pharma24: {
          in_stock: true, price: 17.00, url: 'https://example.test/pharma24',
          variants: [{ volume_ml: 40, price: 8.00, url: 'https://example.test/pharma24-40', in_stock: true }],
        },
      };
      bundleRefresh();
      clearTimeout(BUNDLE_LIVE_T);
      const rowWithoutChosenVolume = document.querySelector('#bundle-body .bundle-row-price').innerText;
      const optimizerWithoutChosenVolume = optimizeBundle([{ ean, qty: 1 }], 'nacional');
      return {
        rowWithHeadline,
        chosenVolumeTotal: optimized.solutions[0]?.total ?? null,
        chosenVolumeStore: optimized.solutions[0]?.breakdown[0]?.store_name ?? null,
        podiumHasSofarma: podium.includes('Sofarma') && podium.indexOf('Sofarma') < podium.indexOf('Pharma24'),
        rowWhileLoading,
        rowAfterFailure,
        pendingUncovered: optimizerWhileLoading.uncovered.includes(ean),
        rowWithoutMatchingVolume,
        missingUncovered: optimizerWithoutMatchingVolume.uncovered.includes(ean),
        rowWithoutChosenVolume,
        totalWithoutChosenVolume: optimizerWithoutChosenVolume.solutions[0]?.total ?? null,
      };
    });

    assert.match(check.rowWithHeadline, /desde 11\.23€ · Sofarma/, 'oferta sem variantes elegível aparece na linha');
    assert.equal(check.chosenVolumeTotal, 15.73, 'optimizer soma o preço Sofarma e portes');
    assert.equal(check.chosenVolumeStore, 'Sofarma', 'optimizer seleciona a mesma oferta');
    assert.equal(check.podiumHasSofarma, true, 'lista por loja também usa o preço elegível');
    assert.match(check.rowWhileLoading, /a carregar/, 'linha não usa preço de montra enquanto variantes carregam');
    assert.equal(check.pendingUncovered, true, 'optimizer mantém o produto fora até chegarem variantes');
    assert.match(check.rowAfterFailure, /indisponível/i, 'falha da BD aparece como indisponível');
    assert.doesNotMatch(check.rowAfterFailure, /11\.23|12\.71|17\.00/, 'falha não mostra preço em cache ou de outro tamanho');
    assert.match(check.rowWithoutMatchingVolume, /sem 40 ml disponível/, 'linha não mostra outro tamanho');
    assert.doesNotMatch(check.rowWithoutMatchingVolume, /4\.50|7\.11/, 'nenhum preço de outro tamanho aparece');
    assert.equal(check.missingUncovered, true, 'optimizer exclui oferta sem o tamanho escolhido');
    assert.match(check.rowWithoutChosenVolume, /desde 11\.23€ · Sofarma/, 'sem volume escolhido, a linha usa o preço que o total conta');
    assert.equal(check.totalWithoutChosenVolume, 15.73, 'o total também usa o preço headline e os portes');
    assert.deepEqual(pageErrors, [], `sem erros JavaScript: ${pageErrors.join('; ')}`);
    console.log('PASS Chromium: oferta sem variantes, variantes pendentes, falha de BD, volume indisponível e sem volume escolhido.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
