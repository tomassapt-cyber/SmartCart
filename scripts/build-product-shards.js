#!/usr/bin/env node
/**
 * Parte os três ficheiros grandes por EAN — Fase 3 do aligeiramento.
 * ============================================================================
 * PORQUÊ (medido 2026-07-30): abrir UMA ficha de produto descarregava
 *   recommendations.json  11,99 MB →  2,95 MB comprimido
 *   descriptions.json      8,10 MB →  2,50 MB
 *   price-history.json     3,28 MB →  0,80 MB
 *                                    ────────
 *                                     6,25 MB comprimidos, em 3 pedidos
 * ...para mostrar a descrição, o gráfico e os similares de UM produto. E este
 * peso não estava contado nos 11,84 MB da página: quem entra e clica num
 * produto custava ~18 MB, não 12.
 *
 * COMO: um ficheiro por "pedaço", onde o pedaço são os ÚLTIMOS 3 DÍGITOS do
 * EAN. 1000 pedaços de ~7 KB comprimidos, com os três conteúdos juntos — logo
 * abrir uma ficha passa a ser UM pedido pequeno em vez de três enormes.
 * O cliente calcula o pedaço sozinho (ean.slice(-3)): não é preciso índice.
 *
 * CACHE: o nome da pasta leva o hash do conteúdo das três fontes. Enquanto os
 * dados não mudarem, o endereço é o mesmo e o browser nunca repete o download
 * (cabeçalho immutable, ver vercel.json). Quando mudam, o hash muda e o
 * endereço também — não há cache velha possível.
 *
 * SEGURANÇA: isto é ADITIVO. Os ficheiros originais continuam lá e o cliente
 * cai neles se um pedaço faltar. Se este script não correr, o site comporta-se
 * exactamente como antes — foi por isso que se fez assim: uma tentativa
 * anterior de gerar ficheiros no build do Vercel parou os deploys (ver o
 * registo de correcções #11).
 *
 * Uso:
 *   node scripts/build-product-shards.js [--out=<dir>] [--quiet]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const QUIET = !!args.quiet;
const OUT_BASE = path.resolve(args.out || path.join(ROOT, 'data', 'p'));

// ── Em que pedaço cai uma chave? ────────────────────────────────────────────
// A primeira versão usava os últimos 3 caracteres. Má ideia, e medida: 17.006
// das chaves NÃO são EANs — são produtos sem código de barras identificados por
// loja+slug ("wells-8760922", "druni-champu-color-vive-elvire"). Milhares de
// slugs acabam em "0ml" (…-40ml, …-50ml), e o pedaço "0ml" ficou com 509 KB
// enquanto a mediana era 3 KB.
//
// Uma função de dispersão resolve: distribui por igual seja qual for o formato
// da chave. FNV-1a de 32 bits — 5 linhas, sem dependências, e o browser calcula
// exactamente a mesma coisa (a cópia no cliente TEM de ser idêntica a esta,
// senão pede o ficheiro errado e a ficha fica sem descrição).
const N_PEDACOS = 512;
function pedacoDe(chave) {
  let h = 0x811c9dc5;
  const s = String(chave);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return String(h % N_PEDACOS).padStart(3, '0');
}

function lerSeExistir(nome) {
  const p = path.join(ROOT, 'data', nome);
  if (!fs.existsSync(p)) return null;
  try { return { texto: fs.readFileSync(p, 'utf8'), json: JSON.parse(fs.readFileSync(p, 'utf8')) }; }
  catch (e) { console.warn(`⚠ ${nome} ilegível: ${e.message}`); return null; }
}

function main() {
  const recs = lerSeExistir('recommendations.json');
  const desc = lerSeExistir('descriptions.json');
  const hist = lerSeExistir('price-history.json');

  if (!recs && !desc && !hist) {
    console.error('✗ nenhum dos três ficheiros existe — nada a fazer');
    process.exit(1);
  }

  // versão = hash do conteúdo das fontes. Muda só quando os dados mudam.
  const versao = crypto.createHash('sha256')
    .update((recs?.texto || '') + (desc?.texto || '') + (hist?.texto || ''))
    .digest('hex').slice(0, 8);

  const pedacos = new Map();               // '042' → { r:{}, d:{}, h:{}, vh:{} }
  const dar = (p) => {
    if (!pedacos.has(p)) pedacos.set(p, { r: {}, d: {}, h: {}, vh: {} });
    return pedacos.get(p);
  };

  let nRecs = 0, nDesc = 0, nHist = 0, nVHist = 0;
  for (const [ean, v] of Object.entries(recs?.json?.map || {})) { dar(pedacoDe(ean)).r[ean] = v; nRecs++; }
  for (const [ean, v] of Object.entries(desc?.json?.map || {})) { dar(pedacoDe(ean)).d[ean] = v; nDesc++; }
  for (const [ean, v] of Object.entries(hist?.json?.series || {})) { dar(pedacoDe(ean)).h[ean] = v; nHist++; }
  // vseries tem chaves "<ean>|<volume>" — o pedaço vem do EAN
  for (const [chave, v] of Object.entries(hist?.json?.vseries || {})) {
    const ean = String(chave).split('|')[0];
    dar(pedacoDe(ean)).vh[chave] = v; nVHist++;
  }

  if (!pedacos.size) { console.error('✗ 0 pedaços gerados — os ficheiros estão vazios?'); process.exit(1); }

  // GUARDA: um erro de leitura que deixasse quase tudo de fora não pode passar
  // em silêncio e deixar o site sem descrições nem gráficos.
  if (nRecs + nDesc + nHist < 1000) {
    console.error(`✗ só ${nRecs + nDesc + nHist} entradas no total — algo correu mal, não gravo`);
    process.exit(1);
  }

  const OUT = path.join(OUT_BASE, versao);
  fs.rmSync(OUT_BASE, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // A lista de lojas é um índice partilhado: as séries guardam a POSIÇÃO da
  // loja, não o nome. Metê-la em cada pedaço custava 946 bytes × 512 = 2,8 MB
  // de repetição (foi o que fez o total subir acima do original na 1ª versão).
  // Vai num ficheiro só, que o cliente lê uma vez e guarda.
  const lojas = hist?.json?.stores || [];
  fs.writeFileSync(path.join(OUT, '_stores.json'), JSON.stringify(lojas));

  let bytes = 0, gzip = 0;
  const tamanhos = [];
  for (const [p, c] of pedacos) {
    const obj = { v: 1, r: c.r, d: c.d, h: c.h, vh: c.vh };
    const buf = Buffer.from(JSON.stringify(obj), 'utf8');
    fs.writeFileSync(path.join(OUT, p + '.json'), buf);
    const g = zlib.gzipSync(buf, { level: 6 }).length;
    bytes += buf.length; gzip += g; tamanhos.push(g);
  }

  // a versão fica num ficheiro para o inject a poder embeber na página
  fs.writeFileSync(path.join(OUT_BASE, 'versao.txt'), versao);

  if (!QUIET) {
    tamanhos.sort((a, b) => a - b);
    const mediana = tamanhos[Math.floor(tamanhos.length / 2)];
    const antes = 6.25 * 1048576;   // medido: 2,95 + 2,50 + 0,80 MB gz
    console.log(`📦 pedaços de produto em ${OUT}`);
    console.log(`   ${pedacos.size} pedaços · ${nRecs} similares · ${nDesc} descrições · ${nHist} históricos · ${nVHist} por volume`);
    console.log(`   total: ${(bytes / 1048576).toFixed(1)} MB → ${(gzip / 1048576).toFixed(1)} MB comprimido`);
    console.log(`   por ficha aberta: ${(mediana / 1024).toFixed(0)} KB (mediana) · maior ${(Math.max(...tamanhos) / 1024).toFixed(0)} KB`);
    console.log(`   antes eram ${(antes / 1048576).toFixed(2)} MB em 3 pedidos → agora 1 pedido, ${(antes / mediana).toFixed(0)}× menos`);
    console.log(`   versão: ${versao}`);
  }
}

if (require.main === module) main();
module.exports = { pedacoDe };
