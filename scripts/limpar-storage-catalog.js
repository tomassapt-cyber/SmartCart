#!/usr/bin/env node
/**
 * CosMath — apagar o bucket "catalog" do Supabase Storage (2026-10-02)
 * ====================================================================
 * O passo "Publicar snapshot do catálogo" do db-sync enviava ~110 MB por
 * corrida com nomes novos e nunca apagava os anteriores: 1.703 ficheiros,
 * 1.952 MB, e o Supabase restringiu o projeto inteiro (402
 * exceed_storage_size_quota). O site nunca leu estes ficheiros. O passo já saiu
 * do db-sync; isto limpa o que ficou.
 *
 * Só corre quando a API de Storage voltar a responder (o bloqueio devolve 402
 * a tudo, incluindo apagar). Sem --apagar só conta (ensaio).
 *
 * Uso: SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/limpar-storage-catalog.js [--apagar]
 */
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'catalog';
const APAGAR = process.argv.includes('--apagar');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' };

async function api(metodo, caminho, corpo) {
  const r = await fetch(`${URL_}/storage/v1/${caminho}`, { method: metodo, headers: H, body: corpo ? JSON.stringify(corpo) : undefined, signal: AbortSignal.timeout(60000) });
  const t = await r.text();
  if (r.status === 402) throw new Error('402 — o projeto continua restringido (exceed_storage_size_quota). Tentar outra vez depois de o suporte levantar o bloqueio ou a 15/10.');
  if (!r.ok) throw new Error(`${metodo} ${caminho}: HTTP ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

// lista recursiva: as pastas vêm como entradas sem id
async function listar(prefixo = '') {
  const saida = [];
  for (let offset = 0; ; offset += 1000) {
    const lote = await api('POST', `object/list/${BUCKET}`, { prefix: prefixo, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    for (const o of lote) {
      const caminho = prefixo ? `${prefixo}/${o.name}` : o.name;
      if (o.id) saida.push({ caminho, bytes: (o.metadata && o.metadata.size) || 0 });
      else saida.push(...await listar(caminho));
    }
    if (lote.length < 1000) break;
  }
  return saida;
}

(async () => {
  if (!URL_ || !KEY) { console.error('✗ faltam SUPABASE_URL / SUPABASE_SERVICE_KEY'); process.exit(1); }
  const objs = await listar();
  const mb = objs.reduce((s, o) => s + o.bytes, 0) / 1048576;
  console.log(`  bucket "${BUCKET}": ${objs.length} ficheiros · ${mb.toFixed(0)} MB`);
  if (!APAGAR) { console.log('🧪 ensaio — nada apagado (correr com --apagar)'); return; }
  for (let i = 0; i < objs.length; i += 100) {
    await api('DELETE', `object/${BUCKET}`, { prefixes: objs.slice(i, i + 100).map(o => o.caminho) });
    console.log(`  apagados ${Math.min(i + 100, objs.length)}/${objs.length}`);
  }
  await api('DELETE', `bucket/${BUCKET}`);
  console.log(`✓ bucket "${BUCKET}" apagado (${mb.toFixed(0)} MB libertados)`);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
