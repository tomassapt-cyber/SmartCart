#!/usr/bin/env node
/**
 * Vigia dos portes (fase 6 do plano dos portes, 2026-10-15).
 *
 * As lojas mudam os portes sem avisar (só na ronda A de 14–15/10: Druni,
 * SweetCare, Wells, Primor, Notino…). Cada loja verificada tem em
 * data/portes-fontes.json a página de onde veio o valor, a data da verificação
 * e a ASSINATURA dessa página: os valores em € que aparecem junto de palavras de
 * portes (não os preços dos produtos). Este script relê as páginas e diz quais
 * mudaram — é aí que é preciso voltar a verificar à mão e atualizar o
 * store-shipping.json.
 *
 *   node scripts/portes-vigia.js                      relatório no terminal
 *   node scripts/portes-vigia.js --md=r.md --estado=e.env   (para o workflow)
 *   node scripts/portes-vigia.js --gravar=druni,wells  depois de re-verificar:
 *                                                       nova assinatura + data
 *   node scripts/portes-vigia.js --gravar=todas        idem, todas as lojas
 *
 * Estado (para o workflow): MUDARAM=<n> ANTIGAS=<n> (verificadas há > dias_revisao)
 * INACESSIVEIS=<n>. Um pedido por loja, um de cada vez, com 2 s de intervalo.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FICH = path.join(ROOT, 'data', 'portes-fontes.json');
const UA = `CosMath-Portes-Vigia/1.0 (+${require('./lib/site-origin').siteOrigin()}; 1 pedido/semana por loja)`;
const DIA = 864e5;

const PORTES = /portes|envio|entrega|transporte|expedi|shipping/i;
const CONTEXTO = /gr[áa]t|gratuit|acima|superior|a partir|at[ée] |desde|custo|taxa|tarifa|continent|ilhas|a[çc]ores|madeira|domic[íi]lio|ponto|recolha|ctt|dpd|gls|nacex|correos|mrw|dhl|inpost/i;

function textoDaPagina(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&euro;|&#8364;|&#x20ac;/gi, '€').replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ');
}

/** Valores em € junto de palavras de portes → ['3.95', '20', …] (ordenados, sem repetidos). */
function assinatura(html) {
  const t = textoDaPagina(html);
  const out = new Set();
  const re = /(\d{1,4}(?:[.,]\d{1,2})?)\s?€|€\s?(\d{1,4}(?:[.,]\d{1,2})?)/g;
  let m;
  while ((m = re.exec(t))) {
    const janela = t.slice(Math.max(0, m.index - 110), m.index + m[0].length + 110);
    if (!PORTES.test(janela) || !CONTEXTO.test(janela)) continue;
    const v = Number((m[1] || m[2]).replace(',', '.'));
    if (Number.isFinite(v) && v > 0 && v < 1000) out.add(String(+v.toFixed(2)));
  }
  return [...out].sort((a, b) => Number(a) - Number(b));
}

// Só se vigiam os valores que o carrinho USA (casa, grátis, ilhas, grátis nas
// ilhas, ponto do store-shipping.json) e que a página mostra na verificação:
// os preços de produtos que algumas páginas de envios também mostram mudam
// todas as semanas e davam alarmes falsos. «24,99 €» na página vale 25.
const perto = (a, b) => Math.abs(Number(a) - Number(b)) <= 0.011;
function valoresDoCarrinho(entrada) {
  const v = entrada || {};
  return [...new Set(['casa', 'gratis', 'ilhas', 'gratis_ilhas', 'ponto'].map(k => v[k]).filter(x => typeof x === 'number' && x > 0))];
}
function vigiados(naPagina, entrada) {
  return valoresDoCarrinho(entrada).filter(v => naPagina.some(p => perto(p, v) || perto(Number(p) + 0.01, v))).map(v => String(v)).sort((a, b) => a - b);
}
const desaparecidos = (antes, naPagina) => (antes || []).filter(v => !naPagina.some(p => perto(p, v) || perto(Number(p) + 0.01, v)));

async function ler(url) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'pt-PT,pt;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
    const html = await r.text();
    if (r.status !== 200) return { erro: 'HTTP ' + r.status };
    if (/cf-chl-|<title>\s*(Just a moment|Um momento|Attention Required)/i.test(html)) return { erro: 'desafio anti-robôs' };
    return { html };
  } catch (e) { return { erro: e.name === 'TimeoutError' ? 'sem resposta' : e.message }; }
}

function avaliar(fontes, lidos, agora = Date.now()) {
  const dias = fontes.dias_revisao || 90;
  const mudaram = [], antigas = [], inacessiveis = [], semValores = [];
  for (const [slug, f] of Object.entries(fontes.lojas || {})) {
    const l = lidos[slug] || {};
    if (l.erro) inacessiveis.push({ slug, url: f.url, erro: l.erro });
    else if (!(f.valores || []).length) semValores.push({ slug, url: f.url });
    else {
      const faltam = desaparecidos(f.valores, l.valores);
      if (faltam.length) mudaram.push({ slug, url: f.url, antes: f.valores, faltam, agora: l.valores });
    }
    const idade = (agora - Date.parse(f.verificado)) / DIA;
    if (idade > dias) antigas.push({ slug, url: f.url, verificado: f.verificado, dias: Math.floor(idade) });
  }
  return { mudaram, antigas, inacessiveis, semValores, dias };
}

function relatorio(r, dono) {
  const ln = [];
  if (r.mudaram.length) {
    ln.push(`${dono ? '@' + dono + ' — ' : ''}a página de portes de ${r.mudaram.length} loja${r.mudaram.length === 1 ? '' : 's'} mudou desde a última verificação. Os portes no site podem estar errados até alguém confirmar.`, '',
      '| Loja | Página | Já não aparece (€) | Valores de portes na página agora (€) |', '|---|---|---|---|',
      ...r.mudaram.map(x => `| ${x.slug} | ${x.url} | **${x.faltam.join(' · ')}** | ${x.agora.join(' · ') || '—'} |`), '');
  }
  if (r.antigas.length) {
    ln.push(`**Revisão periódica** — verificadas há mais de ${r.dias} dias:`, '',
      ...r.antigas.map(x => `- ${x.slug} (${x.verificado}, ${x.dias} d) — ${x.url}`), '');
  }
  ln.push('**Depois de confirmar** (e corrigir `data/store-shipping.json` se for preciso): `node scripts/portes-vigia.js --gravar=<loja>` grava a assinatura e a data novas. Fontes e regras: `Desktop\\duo\\portes\\`.', '');
  if (r.inacessiveis.length || r.semValores.length) {
    ln.push('<details><summary>Não vigiadas daqui (rever à mão)</summary>', '',
      ...r.inacessiveis.map(x => `- ${x.slug}: ${x.erro} — ${x.url}`),
      ...r.semValores.map(x => `- ${x.slug}: nenhum valor do carrinho aparece em texto na página (carrinho Shopify, JavaScript ou «a partir de») — ${x.url}`), '', '</details>', '');
  }
  ln.push('Esta issue é mantida pelo `portes-vigia.yml` e fecha-se sozinha quando não houver nada para rever.');
  return ln.join('\n') + '\n';
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  const fontes = JSON.parse(fs.readFileSync(FICH, 'utf8'));
  const gravar = args.gravar ? (args.gravar === 'todas' || args.gravar === true ? Object.keys(fontes.lojas) : String(args.gravar).split(',')) : null;
  const alvo = gravar || Object.keys(fontes.lojas);
  const lidos = {};
  for (const slug of alvo) {
    const f = fontes.lojas[slug];
    if (!f) { console.error('sem fonte: ' + slug); process.exitCode = 1; continue; }
    const l = await ler(f.url);
    lidos[slug] = l.erro ? { erro: l.erro } : { valores: assinatura(l.html) };
    console.log(`${slug.padEnd(22)} ${l.erro ? '✗ ' + l.erro : lidos[slug].valores.join(' · ') || '(sem valores em texto)'}`);
    await new Promise(r => setTimeout(r, 2000));
  }
  if (gravar) {
    const hoje = new Date().toISOString().slice(0, 10);
    const ship = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'store-shipping.json'), 'utf8'));
    for (const slug of gravar) {
      const l = lidos[slug];
      if (!l || l.erro) continue;
      fontes.lojas[slug].valores = vigiados(l.valores, ship[slug]);
      fontes.lojas[slug].verificado = hoje;
    }
    fs.writeFileSync(FICH, JSON.stringify(fontes, null, 1) + '\n');
    console.log(`gravado: ${gravar.filter(s => lidos[s] && !lidos[s].erro).length} loja(s)`);
    return;
  }
  const r = avaliar(fontes, lidos);
  if (args.md) fs.writeFileSync(args.md, relatorio(r, process.env.GITHUB_REPOSITORY_OWNER || ''));
  if (args.estado) fs.writeFileSync(args.estado, `MUDARAM=${r.mudaram.length}\nANTIGAS=${r.antigas.length}\nINACESSIVEIS=${r.inacessiveis.length + r.semValores.length}\n`);
  console.log(`\nmudaram: ${r.mudaram.length} · revisão (> ${r.dias} d): ${r.antigas.length} · não vigiadas: ${r.inacessiveis.length + r.semValores.length}`);
}

module.exports = { assinatura, textoDaPagina, avaliar, relatorio, vigiados, desaparecidos, valoresDoCarrinho };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
