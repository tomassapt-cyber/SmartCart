/** Confirma que os upserts chegaram à BD antes de guardar a cache incremental. */
async function verificarContagens(url, key, minimos, pedir = fetch) {
  const pk = { stores: 'slug', products: 'ean', offers: 'ean' };
  const contagens = {};
  for (const [tabela, coluna] of Object.entries(pk)) {
    const r = await pedir(`${url}/rest/v1/${tabela}?select=${coluna}`, {
      headers: { apikey: key, Authorization: 'Bearer ' + key, Prefer: 'count=exact', Range: '0-0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`verificação ${tabela}: HTTP ${r.status}`);
    const cabecalho = r.headers.get('content-range');
    const total = cabecalho && /\/(\d+)$/.exec(cabecalho);
    if (!total) throw new Error(`verificação ${tabela}: content-range inválido (${cabecalho})`);
    const n = Number(total[1]);
    if (!Number.isSafeInteger(n) || n < minimos[tabela]) {
      throw new Error(`verificação ${tabela}: BD ${n} < payload ${minimos[tabela]}`);
    }
    contagens[tabela] = n;
  }
  return contagens;
}

module.exports = { verificarContagens };

