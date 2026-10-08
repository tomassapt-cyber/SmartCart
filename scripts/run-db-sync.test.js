const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { run } = require('./run-db-sync');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosmath-sync-test-'));
  const script = path.join(dir, 'fixture.js');
  const output = path.join(dir, 'output');
  const summary = path.join(dir, 'summary');
  const verified = "console.log('  BD stores: 1 linhas');console.log('  BD products: 1 linhas');console.log('  BD offers: 1 linhas');";
  const cacheDir = path.join(dir, '.db-sync-estado');
  fs.mkdirSync(cacheDir);
  fs.writeFileSync(path.join(cacheDir, 'estado.json.gz'), 'cache antiga');
  const env = { ...process.env, SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_KEY: 'dummy', GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary };
  const invoke = async (code, overrides = {}) => {
    fs.writeFileSync(script, code);
    fs.writeFileSync(output, '');
    return run({ script, cwd: dir, env: { ...env, ...overrides }, log: () => {} });
  };
  await invoke("console.log('⏸ Supabase restringido (quota de Storage, até 15/10) — sync adiado.');");
  assert.match(fs.readFileSync(output, 'utf8'), /status=deferred_storage_quota\ncache_updated=false\n$/);
  assert.equal(fs.readFileSync(path.join(cacheDir, 'estado.json.gz'), 'utf8'), 'cache antiga');
  await assert.rejects(invoke('', { SUPABASE_URL: '' }), /Configuração/);
  await assert.rejects(invoke(''), /sem confirmação/);
  await assert.rejects(invoke("console.log('✓ sync completo.');process.exitCode=1;"), /Processo de sync falhou/);
  await assert.rejects(invoke("console.log('✓ sync completo.');"), /PR #25/);
  await invoke(verified + "console.log('✓ sync completo.');");
  assert.match(fs.readFileSync(output, 'utf8'), /status=verified\ncache_updated=false\n$/);
  await invoke(verified + "console.log('  estado guardado para o próximo sync: 5 MB');console.log('✓ sync completo.');");
  assert.match(fs.readFileSync(output, 'utf8'), /status=verified\ncache_updated=true\n$/);
  fs.unlinkSync(path.join(cacheDir, 'estado.json.gz'));
  await assert.rejects(invoke(verified + "console.log('  estado guardado para o próximo sync: 5 MB');console.log('✓ sync completo.');"), /ficheiro não existe/);
  await assert.rejects(invoke("console.log('⏸ Supabase restringido (quota de Storage) — sync adiado.');console.log('✓ sync completo.');"), /inequívoca/);
  console.log('9 cenários passaram; fixtures sem rede e sem credenciais reais.');
})().catch(error => { console.error(error); process.exitCode = 1; });
