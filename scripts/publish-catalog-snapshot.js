#!/usr/bin/env node
/**
 * Publica o snapshot do catálogo no Supabase Storage — Fase 2b.
 * ============================================================================
 * O site NÃO lê isto ainda. Este passo só põe os ficheiros lá e prova que
 * ficam acessíveis e cacheáveis.
 *
 * Desenho (ver scripts/build-catalog-snapshot.js para o porquê das shards):
 *   · bucket PÚBLICO `catalog` (só leitura anónima; a escrita exige a
 *     service_role, que só o CI tem);
 *   · cada ficheiro leva o hash do conteúdo no nome → pode ter cache
 *     IMUTÁVEL de 1 ano, e um refresh de uma loja invalida só essa shard;
 *   · o `manifest.json` é o único sem cache: é o que aponta para a versão
 *     actual de cada ficheiro.
 *
 * GUARDA anti-apagão (mesma filosofia do sync): se o snapshot novo tiver menos
 * de 80% dos produtos do manifest anterior, publicam-se os ficheiros mas NÃO
 * se actualiza o manifest — o site (quando o ler) continua na versão boa.
 *
 * Uso:
 *   node scripts/publish-catalog-snapshot.js [--dry-run]
 * Precisa de SUPABASE_URL + SUPABASE_SERVICE_KEY (secrets do CI). Sem eles sai
 * em silêncio com código 0 — nunca falha um workflow por isso.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const DRY = !!args['dry-run'];
const BUCKET = 'catalog';
const URL_ = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const H = () => ({ apikey: KEY, Authorization: 'Bearer ' + KEY });

async function garantirBucket() {
  // idempotente: 200 se já existe, 400 "already exists" também serve
  const r = await fetch(`${URL_}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...H(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    signal: AbortSignal.timeout(30000),
  });
  if (r.ok) { console.log(`  bucket "${BUCKET}" criado`); return; }
  const t = await r.text();
  if (/already exists|Duplicate/i.test(t)) { console.log(`  bucket "${BUCKET}" já existe ✓`); return; }
  throw new Error(`bucket: HTTP ${r.status} ${t.slice(0, 120)}`);
}

async function enviar(caminho, buf, cacheControl) {
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${caminho}`, {
    method: 'POST',
    headers: {
      ...H(),
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
      'x-upsert': 'true',
    },
    body: buf,
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) throw new Error(`upload ${caminho}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
}

async function manifestAtual() {
  try {
    const r = await fetch(`${URL_}/storage/v1/object/public/${BUCKET}/manifest.json`, { signal: AbortSignal.timeout(20000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

(async function main() {
  const dir = path.join(ROOT, '.snapshot');
  if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
    console.error('✗ sem .snapshot — corre primeiro: node scripts/build-catalog-snapshot.js');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));

  if (DRY) {
    console.log(`🧪 --dry-run: ${manifest.shards.length + 3} ficheiros · ${manifest.counts.products} produtos · ${manifest.counts.offers} ofertas`);
    return;
  }
  if (!URL_ || !KEY) { console.log('ℹ Sem SUPABASE_URL/SERVICE_KEY — publicação saltada.'); return; }

  await garantirBucket();

  // GUARDA: não deitar abaixo o manifest bom com um snapshot truncado
  const anterior = await manifestAtual();
  const antes = anterior?.counts?.products || 0;
  const agora = manifest.counts.products || 0;
  const truncado = antes > 1000 && agora < 0.8 * antes;
  if (truncado) console.warn(`  ⛔ GUARDA: ${agora} produtos < 80% dos ${antes} anteriores — ficheiros SIM, manifest NÃO.`);

  // ficheiros de conteúdo: nome com hash → cache imutável de 1 ano
  const IMUTAVEL = 'public, max-age=31536000, immutable';
  let n = 0, bytes = 0;
  const enviarUm = async (rel) => {
    const buf = fs.readFileSync(path.join(dir, rel));
    await enviar(rel, buf, IMUTAVEL);
    n++; bytes += buf.length;
  };
  await enviarUm(manifest.stores_url);
  await enviarUm(manifest.products_url);
  // shards em lotes de 6 (o Storage aguenta bem; não vale a pena martelar)
  for (let i = 0; i < manifest.shards.length; i += 6) {
    await Promise.all(manifest.shards.slice(i, i + 6).map(s => enviarUm(s.url)));
    if (i % 30 === 0) console.log(`  shards: ${Math.min(i + 6, manifest.shards.length)}/${manifest.shards.length}`);
  }

  if (!truncado) {
    // o manifest é o ÚNICO sem cache — é ele que aponta para a versão actual
    await enviar('manifest.json', fs.readFileSync(path.join(dir, 'manifest.json')), 'no-cache');
    n++;
  }
  console.log(`✓ snapshot publicado: ${n} ficheiros · ${(bytes / 1048576).toFixed(1)} MB`);
  console.log(`  manifest: ${URL_}/storage/v1/object/public/${BUCKET}/manifest.json`);
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
