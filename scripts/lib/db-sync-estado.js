/**
 * CosMath — sync INCREMENTAL do catálogo para a BD (2026-10-02)
 * =============================================================
 * Antes, cada db-sync (12×/dia) reescrevia TODAS as linhas — 232 mil ofertas,
 * 168 mil variantes, 69 mil produtos — mesmo as que não mudaram. No Postgres
 * cada reescrita deixa a versão antiga como lixo até ao vacuum, e a BD inchava
 * (329 de 500 MB no plano gratuito a 2026-10-02).
 *
 * Agora guarda-se uma IMPRESSÃO DIGITAL por linha (hash do conteúdo, sem os
 * carimbos de tempo) do que ficou na BD no último sync bem-sucedido. O sync
 * seguinte só envia o que mudou e APAGA PELO NOME o que saiu — já não pode
 * apagar "tudo o que tem synced_at antigo", porque as linhas que não mudaram
 * ficam com o carimbo antigo de propósito.
 *
 * Onde vive o estado: .db-sync-estado/estado.json.gz, guardado na cache do
 * GitHub Actions entre corridas (ver db-sync.yml). Sem estado (1.ª corrida,
 * cache expirada, projeto Supabase diferente, estado com mais de 7 dias) lê-se
 * a BD UMA vez (~470 pedidos de 1000 linhas) e calcula-se a partir dela — o
 * sync seguinte continua a enviar só diferenças. Se a leitura falhar, faz-se o
 * sync completo de antes (correto, só mais pesado).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const VERSAO = 1;
const DIR = path.join(__dirname, '..', '..', '.db-sync-estado');
const FICHEIRO = path.join(DIR, 'estado.json.gz');
const MAX_IDADE_DIAS = 7;

// tabela → chave primária e colunas que NÃO entram na impressão digital
const TABELAS = {
  stores: { pk: ['slug'], fora: ['updated_at'] },
  products: { pk: ['ean'], fora: ['updated_at'] },
  // verified_at conta só pelo DIA: o site mostra "verificado há Xh" (verde até 24h), e
  // reescrever 233 mil ofertas a cada refresh só para mudar a hora era o grosso do lixo.
  // Uma oferta sem mudanças é reescrita no máximo 1×/dia e nunca passa a amarelo.
  offers: { pk: ['store_slug', 'ean'], fora: ['synced_at'], dia: ['verified_at'] },
  offer_variants: { pk: ['store_slug', 'ean', 'volume_ml'], fora: ['synced_at'] },
};

const chave = (tabela, linha) => TABELAS[tabela].pk.map(c => String(linha[c])).join('\u0001');

// valores normalizados para a comparação BD ↔ payload não depender do formato:
// timestamptz vem da BD como "…+00:00" e do seed como "…Z"; numeric vem como número.
function normal(v) {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) { const t = Date.parse(v); if (!isNaN(t)) return new Date(t).toISOString(); }
  return v === undefined ? null : v;
}

function impressao(tabela, linha, colunas) {
  const fora = new Set(TABELAS[tabela].fora), dia = new Set(TABELAS[tabela].dia || []);
  const obj = {};
  for (const c of colunas) if (!fora.has(c)) { const v = normal(linha[c]); obj[c] = dia.has(c) && typeof v === 'string' ? v.slice(0, 10) : v; }
  return crypto.createHash('sha1').update(JSON.stringify(obj)).digest('base64').slice(0, 12);
}

function carregar(projeto) {
  try {
    const e = JSON.parse(zlib.gunzipSync(fs.readFileSync(FICHEIRO)).toString('utf8'));
    if (e.versao !== VERSAO) return { motivo: `versão ${e.versao} ≠ ${VERSAO}` };
    if (e.projeto !== projeto) return { motivo: `estado de outro projeto (${e.projeto})` };
    const idade = (Date.now() - Date.parse(e.criado_em)) / 86400000;
    if (!(idade <= MAX_IDADE_DIAS)) return { motivo: `estado com ${idade.toFixed(1)} dias (máx. ${MAX_IDADE_DIAS}) — refazer a partir da BD` };
    return { estado: e };
  } catch (err) { return { motivo: fs.existsSync(FICHEIRO) ? `estado ilegível (${err.message})` : 'sem estado guardado' }; }
}

function guardar(projeto, tabelas, criadoEm) {
  fs.mkdirSync(DIR, { recursive: true });
  const e = { versao: VERSAO, projeto, criado_em: criadoEm || new Date().toISOString(), atualizado_em: new Date().toISOString(), tabelas };
  fs.writeFileSync(FICHEIRO, zlib.gzipSync(JSON.stringify(e)));
  return fs.statSync(FICHEIRO).size;
}

// Lê da BD as colunas comparáveis e devolve {chave → impressão} por tabela.
async function lerDaBD(url, key, colunasPorTabela) {
  const H = { apikey: key, Authorization: 'Bearer ' + key };
  const tabelas = {};
  for (const [t, colunas] of Object.entries(colunasPorTabela)) {
    if (!colunas) continue;
    const pk = TABELAS[t].pk;
    const sel = [...new Set([...pk, ...colunas])].join(',');
    const m = {};
    for (let de = 0; ; de += 1000) {
      const r = await fetch(`${url}/rest/v1/${t}?select=${sel}&order=${pk.join(',')}&offset=${de}&limit=1000`, { headers: H, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`${t}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
      const lote = await r.json();
      for (const linha of lote) m[chave(t, linha)] = impressao(t, linha, colunas);
      if (lote.length < 1000) break;
    }
    tabelas[t] = m;
    console.log(`  estado lido da BD: ${t} ${Object.keys(m).length} linhas`);
  }
  return tabelas;
}

// O que enviar e o que apagar, por tabela.
function diferencas(tabela, linhas, anterior) {
  const colunas = linhas.length ? Object.keys(linhas[0]) : [];
  const atual = {};
  const enviar = [];
  for (const l of linhas) {
    const k = chave(tabela, l), h = impressao(tabela, l, colunas);
    atual[k] = h;
    if (!anterior || anterior[k] !== h) enviar.push(l);
  }
  const apagar = anterior ? Object.keys(anterior).filter(k => !(k in atual)) : [];
  return { atual, enviar, apagar };
}

// Apaga por chave, em lotes, agrupando pela 1.ª coluna da PK quando é composta.
async function apagarPorChave(url, key, tabela, chaves) {
  if (!chaves.length) return 0;
  const H = { apikey: key, Authorization: 'Bearer ' + key, Prefer: 'return=minimal' };
  const pk = TABELAS[tabela].pk;
  const q = v => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const grupos = new Map();                          // filtros fixos → valores da última coluna
  for (const k of chaves) {
    const partes = k.split('\u0001');
    const fixo = partes.slice(0, -1);
    const id = fixo.join('\u0001');
    if (!grupos.has(id)) grupos.set(id, { fixo, valores: [] });
    grupos.get(id).valores.push(partes[partes.length - 1]);
  }
  let pedidos = 0;
  for (const { fixo, valores } of grupos.values()) {
    for (let i = 0; i < valores.length; i += 150) {
      const filtros = fixo.map((v, j) => `${pk[j]}=eq.${encodeURIComponent(v)}`);
      filtros.push(`${pk[pk.length - 1]}=in.(${encodeURIComponent(valores.slice(i, i + 150).map(q).join(','))})`);
      const r = await fetch(`${url}/rest/v1/${tabela}?${filtros.join('&')}`, { method: 'DELETE', headers: H, signal: AbortSignal.timeout(60000) });
      if (r.status >= 400) throw new Error(`apagar ${tabela}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
      pedidos++;
    }
  }
  return pedidos;
}

module.exports = { TABELAS, chave, impressao, carregar, guardar, lerDaBD, diferencas, apagarPorChave, FICHEIRO };
