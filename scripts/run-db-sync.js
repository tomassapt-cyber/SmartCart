#!/usr/bin/env node
// Entrada do CI: distingue adiamento, sincronização verificada e cache nova.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');

async function run({ script = path.join(__dirname, 'push-catalog-to-db.js'), env = process.env, cwd = path.resolve(__dirname, '..'), log = console.log } = {}) {
  const output = (status, cache) => {
    if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `status=${status}\ncache_updated=${cache}\n`);
    if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `\nSupabase sync: **${status}**. Cache nova: **${cache}**.\n`);
  };
  output('failed', false);
  if (!env.SUPABASE_URL || !(env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Configuração Supabase incompleta: sync não executado. Verificar secrets no GitHub sem copiar as chaves.');
  }
  let complete = false, saved = false, deferred = false;
  const counted = new Set();
  const child = spawn(process.execPath, [script], { cwd, env, stdio: ['ignore', 'pipe', 'inherit'] });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    log(line);
    if (line === '✓ sync completo.') complete = true;
    const count = /^  BD (stores|products|offers): \d+ linhas$/.exec(line);
    if (count) counted.add(count[1]);
    if (/^  estado guardado para o próximo sync: /.test(line)) saved = true;
    if (/^⏸ Supabase restringido .* — sync adiado\./.test(line)) deferred = true;
  });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve(signal ? 1 : code));
  });
  if (code !== 0) throw new Error(`Processo de sync falhou (código ${code}). Cache não será publicada.`);
  if (deferred && !complete && !saved) {
    output('deferred_storage_quota', false);
    log('Sync adiado por quota: nenhuma sincronização confirmada; cache restaurada não será publicada.');
    return;
  }
  if (!complete || deferred) throw new Error('Processo terminou sem confirmação inequívoca de sync completo.');
  if (counted.size !== 3) throw new Error('Falta verificação final das três tabelas. Integrar primeiro a correção do PR #25.');
  if (saved && !fs.existsSync(path.join(cwd, '.db-sync-estado', 'estado.json.gz'))) {
    throw new Error('O sync anunciou cache nova mas o ficheiro não existe.');
  }
  output('verified', saved);
}

if (require.main === module) run().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { run };
