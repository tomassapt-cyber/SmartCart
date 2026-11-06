'use strict';
/**
 * Perfumes da seleção (data/perfumes-selecao.json, decisão do Tomás 2026-11-06).
 * linhaDoPerfume({ name, brand }) → a linha da seleção a que o artigo pertence,
 * ou null. Exige: a marca (no campo brand ou no nome), TODAS as palavras da linha,
 * uma palavra de fragrância (EDT, EDP, parfum…, ou a categoria da loja) e nenhuma palavra de exclusão
 * (desodorizante, gel de banho, estojo…). Sem rede; usado por leitores e auditorias.
 */
const fs = require('fs');
const path = require('path');

const FICHEIRO = path.join(__dirname, '..', '..', 'data', 'perfumes-selecao.json');
let cache = null;

// minúsculas, sem acentos, «N°5»/«Nº 5»/«No.5» → «n 5», pontuação → espaço
function normalizar(s) {
  return ' ' + String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\bn\s*[°ºo.]\s*(\d)/g, 'n $1')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ').trim() + ' ';
}
const tem = (texto, termo) => texto.includes(' ' + termo + ' ');

function carregar() {
  if (cache) return cache;
  const j = JSON.parse(fs.readFileSync(FICHEIRO, 'utf8'));
  cache = {
    excluir: j.excluir.map(t => normalizar(t).trim()),
    fragrancia: j.fragrancia.map(t => normalizar(t).trim()),
    linhas: j.linhas.map((l, i) => ({ ...l, id: i, marcas: l.marca.map(m => normalizar(m).trim()), palavras: normalizar(l.linha).trim().split(' ') })),
  };
  return cache;
}

function linhaDoPerfume(item) {
  const c = carregar();
  const nome = normalizar(item.name);
  const marca = normalizar(item.brand);
  const tudo = normalizar((item.brand || '') + ' ' + (item.name || ''));
  if (c.excluir.some(t => tem(nome, t))) return null;
  // fragrância: uma palavra do nome (EDT, EDP, parfum…) ou a categoria da própria loja
  if (!c.fragrancia.some(t => tem(nome, t)) && !/fragr|perfum|parfum/i.test(item.category || '')) return null;
  for (const l of c.linhas) {
    if (!l.marcas.some(m => tem(tudo, m) || marca.trim() === m)) continue;
    // a linha tem de estar no NOME (não basta a marca): todas as palavras, em sequência.
    // Linha contida no nome da marca («nina» em «nina ricci»): tira-se a marca antes,
    // senão «Nina Ricci L'Air du Temps» passava por Nina.
    const linha = l.palavras.join(' ');
    let alvo = nome;
    for (const m of l.marcas) if (m !== linha && tem(' ' + m + ' ', linha)) alvo = alvo.replace(new RegExp(`(?<= )${m}(?= )`, 'g'), '').replace(/ +/g, ' ');
    if (!tem(alvo, linha)) continue;
    return l;
  }
  return null;
}

module.exports = { linhaDoPerfume, normalizar, carregar };
