#!/usr/bin/env node
/**
 * Aviso das lojas do PC (data/lojas-so-pc.json) — usado pelo freshness-monitor.
 *
 * Desde 2026-10-14 as lojas do PC nunca saem do site por idade (decisão do
 * Tomás: é só correr o refresh no PC). Em troca, este script diz quando está
 * na altura de o correr: escreve o texto da issue «Lojas do PC» e um ficheiro
 * de estado que o workflow lê para abrir, atualizar, lembrar ou fechar a issue.
 *
 *   ATRASADAS=<n>   lojas com mais de avisar_dias dias
 *   MAX_DIAS=<n>    dias (inteiros) da loja mais atrasada
 *   AVISAR_DIAS=<n>
 *   LEMBRETE=1      a loja mais atrasada fez hoje mais 7 dias (avisar_dias+7,
 *                   +14, …) — o monitor corre 1x/dia, por isso calha 1x/semana
 *
 * Uso: node scripts/aviso-lojas-pc.js --md=/tmp/pc.md --estado=/tmp/pc.env
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DAY = 864e5;

const ageOf = it => {
  let t = +new Date(it.verified_at || 0);
  for (const v of (it.variants || [])) { const tv = +new Date(v.verified_at || 0); if (tv > t) t = tv; }
  return t;
};

function avaliar(seed, cfg, agora = Date.now()) {
  const avisar = cfg.avisar_dias || 7;
  const lojas = Object.entries(cfg.lojas || {}).map(([slug, comando]) => {
    const sp = (seed.store_products || []).find(g => g.store_slug === slug);
    let ultimo = 0;
    for (const it of (sp ? sp.items : [])) { const t = ageOf(it); if (t > ultimo) ultimo = t; }
    const dias = ultimo ? (agora - ultimo) / DAY : Infinity;
    return { slug, comando, ofertas: sp ? sp.items.length : 0, ultimo: ultimo ? new Date(ultimo).toISOString().slice(0, 10) : '—', dias };
  }).sort((a, b) => b.dias - a.dias);
  const atrasadas = lojas.filter(l => l.dias > avisar);
  const maxDias = atrasadas.length ? Math.floor(Math.min(atrasadas[0].dias, 9999)) : 0;
  const lembrete = maxDias > avisar && (maxDias - avisar) % 7 === 0;
  return { avisar, lojas, atrasadas, maxDias, lembrete };
}

function textoIssue(r, dono) {
  const n = x => x.toLocaleString('pt-PT');
  const diasTxt = d => (d === Infinity ? 'sem dados' : String(Math.floor(d)));
  const comandos = [...new Set(r.atrasadas.map(l => l.comando))];
  const linhas = [
    `${dono ? '@' + dono + ' — ' : ''}está na altura de correr as lojas do PC.`,
    '',
    `Estas lojas não são atualizadas há mais de ${r.avisar} dias. **Continuam no site** (as lojas do PC nunca desaparecem por idade), mas os preços são cada vez mais antigos.`,
    '',
    '| Loja | Último refresh | Dias | Ofertas |',
    '|---|---|---:|---:|',
    ...r.atrasadas.map(l => `| ${l.slug} | ${l.ultimo} | ${diasTxt(l.dias)} | ${n(l.ofertas)} |`),
    '',
    '**Como correr** (no PC, Git Bash, no clone do repositório):',
    '',
    '```bash',
    ...comandos,
    '```',
    '',
  ];
  const frescas = r.lojas.filter(l => l.dias <= r.avisar);
  if (frescas.length) linhas.push(`Em dia: ${frescas.map(l => `${l.slug} (${diasTxt(l.dias)} d)`).join(', ')}.`, '');
  linhas.push(
    `Esta issue é mantida pelo \`freshness-monitor.yml\` a partir de \`data/lojas-so-pc.json\`: deixa um lembrete a cada 7 dias a mais e fecha-se sozinha quando todas as lojas do PC voltarem a ter menos de ${r.avisar} dias — não a feches à mão.`,
  );
  return linhas.join('\n') + '\n';
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'lojas-so-pc.json'), 'utf8'));
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'seed-bundle.json'), 'utf8'));
  const r = avaliar(seed, cfg, args.agora ? +new Date(args.agora) : Date.now());
  const dono = process.env.GITHUB_REPOSITORY_OWNER || '';
  if (args.md) fs.writeFileSync(args.md, textoIssue(r, dono), 'utf8');
  const estado = `ATRASADAS=${r.atrasadas.length}\nMAX_DIAS=${r.maxDias}\nAVISAR_DIAS=${r.avisar}\nLEMBRETE=${r.lembrete ? 1 : 0}\n`;
  if (args.estado) fs.writeFileSync(args.estado, estado, 'utf8');
  console.log(`Lojas do PC: ${r.atrasadas.length} com mais de ${r.avisar} dias${r.atrasadas.length ? ' — ' + r.atrasadas.map(l => `${l.slug} ${Math.floor(Math.min(l.dias, 9999))}d`).join(', ') : ''}${r.lembrete ? ' · lembrete hoje' : ''}`);
}

module.exports = { avaliar, textoIssue };
if (require.main === module) main();
