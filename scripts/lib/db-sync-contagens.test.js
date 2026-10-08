const assert = require('node:assert/strict');
const test = require('node:test');
const { verificarContagens } = require('./db-sync-contagens');

const minimos = { stores: 98, products: 68799, offers: 237920 };
function resposta(status, range) {
  return { ok: status < 400, status, headers: { get: () => range } };
}

test('aceita contagens exatas e superiores ao payload', async () => {
  const ranges = ['0-0/98', '0-0/68801', '0-0/237920'];
  let i = 0;
  const counts = await verificarContagens('https://exemplo.supabase.co', 'dummy', minimos,
    async () => resposta(206, ranges[i++]));
  assert.deepEqual(counts, { stores: 98, products: 68801, offers: 237920 });
});

test('falha em HTTP 402 e não declara sync completo', async () => {
  await assert.rejects(verificarContagens('https://exemplo.supabase.co', 'dummy', minimos,
    async () => resposta(402, null)), /stores: HTTP 402/);
});

test('falha sem content-range ou quando a BD tem menos ofertas', async () => {
  await assert.rejects(verificarContagens('https://exemplo.supabase.co', 'dummy', minimos,
    async () => resposta(200, null)), /content-range inválido/);
  const ranges = ['0-0/98', '0-0/68799', '0-0/237919'];
  let i = 0;
  await assert.rejects(verificarContagens('https://exemplo.supabase.co', 'dummy', minimos,
    async () => resposta(206, ranges[i++])), /offers: BD 237919 < payload 237920/);
});


