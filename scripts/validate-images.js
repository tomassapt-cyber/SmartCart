/**
 * Valida que cada image_url do seed responde 200 + content-type image/*.
 * Reporta falhas para corrigir manualmente ou substituir.
 */
const fs = require('fs');
const path = require('path');
const SEED = path.join(__dirname, '..', 'db', 'seed-data.json');

(async () => {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  let ok = 0, fail = 0;
  const broken = [];

  for (const p of seed.products) {
    if (!p.image_url) { fail++; broken.push({...p, reason: 'no url'}); continue; }
    try {
      const res = await fetch(p.image_url, { method: 'HEAD' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.startsWith('image/')) {
        ok++;
        process.stdout.write('.');
      } else {
        fail++;
        broken.push({ ean: p.ean, brand: p.brand, name: p.name, status: res.status, ct, url: p.image_url });
        process.stdout.write('x');
      }
    } catch (e) {
      fail++;
      broken.push({ ean: p.ean, brand: p.brand, name: p.name, error: e.message, url: p.image_url });
      process.stdout.write('!');
    }
  }
  console.log(`\n${ok} OK, ${fail} broken`);
  if (broken.length) {
    console.log('\nBROKEN:');
    broken.forEach(b => console.log(' ', b.brand, '-', b.name.slice(0,40), '|', b.status||b.error||b.reason));
  }
})();
