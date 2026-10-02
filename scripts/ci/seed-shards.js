#!/usr/bin/env node
/**
 * CosMath — o catálogo em PEDAÇOS DE TEXTO no git (2026-10-02)
 * =============================================================
 * Chamado pelo scripts/ci/seed.sh — não correr à mão.
 *
 *   pack    data/seed-bundle.json  →  data/seed-bundle.json.gz/   (pasta)
 *   unpack  data/seed-bundle.json.gz/  →  data/seed-bundle.json
 *
 * PORQUE (medido a 2026-10-02): o repositório tinha 21,4 GB e crescia ~0,4
 * GB/dia. Cada atualização de loja gravava um .gz NOVO de 18 MB — e um .gz não
 * tem diferenças aproveitáveis: mudar um preço muda todos os bytes a seguir. Em
 * 6 horas, 21 commits somaram 377 MB só do catálogo (~240 commits/dia).
 *
 * COMO: uma linha de JSON por registo. Mudar o preço de uma oferta muda UMA
 * linha de UM ficheiro, e o git guarda só essa diferença.
 *
 *   indice.json            ordem das chaves, ficheiros, campos das entradas
 *   lojas.jsonl            seed.stores, uma loja por linha
 *   produtos/0000.jsonl …  seed.products, 5.000 por ficheiro, pela ordem original
 *   ofertas/<loja>.jsonl   seed.store_products[i].items, uma oferta por linha
 *
 * PORQUE O NOME DA PASTA É "seed-bundle.json.gz": ~100 workflows, o
 * resilient-push.sh e o refresh-pc-only.sh fazem `git add` e `git diff` desse
 * caminho. Numa pasta, os dois funcionam igual (o `git add <pasta>` também
 * regista ficheiros apagados). Mantendo o nome, nenhum deles precisou de mudar
 * — nem as corridas que já iam a meio quando isto entrou, que ao re-integrar
 * sobre o main novo passam a usar o seed.sh novo sem darem por nada.
 *
 * GARANTIA: o unpack devolve o MESMO ficheiro, byte a byte, que o pack recebeu
 * (o seed é escrito com JSON.stringify compacto por todos os integradores, e
 * o unpack junta as linhas exatamente como o JSON.stringify as juntaria).
 * O pack verifica isto antes de escrever — se não bater certo, não toca na pasta.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const JSON_ = path.join(RAIZ, 'data', 'seed-bundle.json');
const PASTA = path.join(RAIZ, 'data', 'seed-bundle.json.gz');
const POR_FICHEIRO = 5000;
const LIMITE_MB = 90;            // o GitHub recusa ficheiros acima de 100 MB
const FORMATO = 'cosmath-seed-v1';

const nomeLoja = s => String(s).replace(/[^a-zA-Z0-9._-]/g, '_');

// O texto do seed a partir dos pedaços — exatamente o que JSON.stringify(seed) daria.
function montar(indice, ler) {
  // \r tolerado: um clone Windows com core.autocrlf pode trazer CRLF (o .gitattributes pede LF)
  const linhas = f => { const t = ler(f); return t ? t.replace(/\r?\n$/, '').split(/\r?\n/) : []; };
  const partes = [];
  for (const chave of indice.chaves) {
    let v;
    if (chave === 'stores') v = '[' + linhas(indice.lojas).join(',') + ']';
    else if (chave === 'products') v = '[' + indice.produtos.map(f => linhas(f).join(',')).filter(Boolean).join(',') + ']';
    else if (chave === 'store_products') {
      v = '[' + indice.ofertas.map(e => '{' + e.campos.map(c => c === 'items'
        ? '"items":[' + linhas(e.ficheiro).join(',') + ']'
        : JSON.stringify(c) + ':' + JSON.stringify(e.outros[c])).join(',') + '}').join(',') + ']';
    } else v = JSON.stringify(indice.outros[chave]);
    partes.push(JSON.stringify(chave) + ':' + v);
  }
  return '{' + partes.join(',') + '}';
}

function pack() {
  const texto = fs.readFileSync(JSON_, 'utf8');
  const seed = JSON.parse(texto);
  const ficheiros = new Map();                        // caminho relativo → conteúdo
  const jsonl = arr => arr.length ? arr.map(x => JSON.stringify(x)).join('\n') + '\n' : '';
  const indice = { formato: FORMATO, chaves: Object.keys(seed), lojas: 'lojas.jsonl', produtos: [], ofertas: [], outros: {} };

  for (const chave of indice.chaves) {
    const v = seed[chave];
    if (chave === 'stores') ficheiros.set('lojas.jsonl', jsonl(v));
    else if (chave === 'products') {
      for (let i = 0; i * POR_FICHEIRO < v.length; i++) {
        const f = `produtos/${String(i).padStart(4, '0')}.jsonl`;
        ficheiros.set(f, jsonl(v.slice(i * POR_FICHEIRO, (i + 1) * POR_FICHEIRO)));
        indice.produtos.push(f);
      }
    } else if (chave === 'store_products') {
      const usados = new Set();
      for (const e of v) {
        let f = `ofertas/${nomeLoja(e.store_slug)}.jsonl`;
        for (let k = 2; usados.has(f); k++) f = `ofertas/${nomeLoja(e.store_slug)}~${k}.jsonl`;
        usados.add(f);
        const outros = {}; for (const c of Object.keys(e)) if (c !== 'items') outros[c] = e[c];
        ficheiros.set(f, jsonl(e.items || []));
        indice.ofertas.push({ ficheiro: f, campos: Object.keys(e), outros });
      }
    } else indice.outros[chave] = v;
  }
  // Guarda: o unpack tem de devolver exatamente o mesmo texto
  const volta = montar(indice, f => ficheiros.get(f));
  if (volta !== texto) {
    let i = 0; while (i < volta.length && volta[i] === texto[i]) i++;
    throw new Error(`a reconstrução não é idêntica ao seed (primeira diferença no carácter ${i}) — pasta NÃO alterada`);
  }
  ficheiros.set('indice.json', JSON.stringify(indice, null, 1) + '\n');

  // escrever: só o que mudou; apagar o que deixou de existir
  if (fs.existsSync(PASTA) && !fs.statSync(PASTA).isDirectory()) fs.unlinkSync(PASTA);   // migração do .gz antigo
  let escritos = 0, maior = 0;
  for (const [rel, conteudo] of ficheiros) {
    const destino = path.join(PASTA, rel);
    maior = Math.max(maior, Buffer.byteLength(conteudo));
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    if (fs.existsSync(destino) && fs.readFileSync(destino, 'utf8') === conteudo) continue;
    fs.writeFileSync(destino, conteudo); escritos++;
  }
  let apagados = 0;
  const visitar = d => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) { visitar(p); if (!fs.readdirSync(p).length) fs.rmdirSync(p); } else if (!ficheiros.has(path.relative(PASTA, p).split(path.sep).join('/'))) { fs.unlinkSync(p); apagados++; } } };
  visitar(PASTA);
  if (maior > LIMITE_MB * 1048576) console.warn(`⚠️ um pedaço do seed tem ${(maior / 1048576).toFixed(1)} MB (limite do GitHub: 100 MB) — baixar POR_FICHEIRO`);
  console.log(`📦 seed em pedaços: ${ficheiros.size} ficheiros (${escritos} alterados, ${apagados} apagados) · ${seed.products.length} produtos · ${(seed.store_products || []).length} lojas`);
}

function unpack() {
  const ler = rel => { const p = path.join(PASTA, rel); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : (() => { throw new Error(`falta ${rel} — o seed está incoerente`); })(); };
  const indice = JSON.parse(ler('indice.json'));
  if (indice.formato !== FORMATO) throw new Error(`formato desconhecido: ${indice.formato}`);
  const texto = montar(indice, ler);
  JSON.parse(texto);                                   // falha alto se algo vier partido
  fs.writeFileSync(JSON_, texto);
  console.log(`📦 seed montado a partir dos pedaços: ${(Buffer.byteLength(texto) / 1048576).toFixed(0)} MB`);
}

try {
  const op = process.argv[2];
  if (op === 'pack') pack(); else if (op === 'unpack') unpack();
  else { console.error('uso: seed-shards.js pack|unpack'); process.exit(2); }
} catch (e) { console.error('✗', e.message); process.exit(1); }
