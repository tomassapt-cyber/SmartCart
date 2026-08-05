#!/usr/bin/env node
/**
 * O ARTEFACTO em data/idx/ tem o que o site precisa de ler?
 * ============================================================================
 * O verify-search-index.js compara o CONSTRUTOR com as funcoes do site. Isso nao
 * chega: o construtor pode estar certo e o ficheiro em disco ser de uma versao
 * anterior. Foi o que aconteceu em 2026-08-05 -- o construtor ja' produzia o
 * campo `ab` e o artefacto publicado nao o tinha, porque o build-search-index.js
 * NAO corre no build do Vercel (so' os pedacos e o inject).
 *
 * Sem `ab`, o cartao mostra o minimo ao volume de referencia em vez do minimo
 * absoluto e apresenta precos ACIMA do real em ~4,9% dos produtos.
 *
 * Uso: node scripts/verify-index-artifact.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'data', 'idx');

let mau = 0;
const ok = (nome, cond, det) => {
  if (cond) console.log(`  ✓ ${nome}`);
  else { console.log(`  ✗ ${nome}${det ? '  — ' + det : ''}`); mau++; }
};

if (!fs.existsSync(path.join(DIR, 'versao.txt'))) {
  console.error('  ✗ data/idx/versao.txt não existe — o índice nunca foi gerado');
  process.exit(1);
}
const versao = fs.readFileSync(path.join(DIR, 'versao.txt'), 'utf8').trim();
const ficheiro = path.join(DIR, `search-${versao}.json`);
ok(`o ficheiro da versão ${versao} existe`, fs.existsSync(ficheiro), ficheiro);
if (!fs.existsSync(ficheiro)) process.exit(1);

const i = JSON.parse(fs.readFileSync(ficheiro, 'utf8'));
const tam = fs.statSync(ficheiro).size;
console.log(`  ${(tam / 1048576).toFixed(2)} MB · ${i.n.toLocaleString('pt-PT')} produtos\n`);

// os campos que o cliente lê (rebuildCatalogIndexesFromSources)
for (const campo of ['e', 'nm', 'b', 'c', 's', 'mn', 'mx', 'pr', 'ab']) {
  ok(`campo "${campo}" presente e completo`,
    Array.isArray(i[campo]) && i[campo].length === i.n,
    Array.isArray(i[campo]) ? `${i[campo].length} de ${i.n}` : 'em falta');
}

// o `ab` tem de ser MESMO diferente do `mn`, senão não vale o espaço que ocupa
if (Array.isArray(i.ab)) {
  const menores = i.ab.filter((v, k) => v > 0 && i.mn[k] > 0 && v < i.mn[k]).length;
  const iguais = i.ab.filter((v, k) => v > 0 && v === i.mn[k]).length;
  console.log(`\n  ab < mn em ${menores.toLocaleString('pt-PT')} produtos · igual em ${iguais.toLocaleString('pt-PT')}`);
  // medido em 2026-08-05: 2.460. Uma queda grande quer dizer que as variantes
  // deixaram de entrar no cálculo; uma subida grande, que algo mudou de fórmula.
  ok('ab difere de mn no número esperado de produtos (1.500–4.000)',
    menores >= 1500 && menores <= 4000, `${menores}`);
  // ⚠️ O `ab` PODE ser maior que o `mn`, e nao e' defeito do indice.
  // O mn sai do offerPriceAtVol (demo.html), que escolhe a variante ao volume
  // de referencia e NAO verifica o stock dela. O ab sai do bestOfferFor, que
  // exige in_stock !== false. Quando a variante mais barata ao volume de
  // referencia esta' esgotada, o mn conta-a e o ab nao -> mn < ab.
  // Verificado em 2026-08-05: 19 produtos, 19 explicados por essa variante.
  // Os dois campos replicam fielmente as duas funcoes do site, e a incoerencia
  // e' do site, nao do indice: nesses 19 o cartao anuncia um preco ESGOTADO
  // (o Rene Furterer mostra 12,60 EUR quando o mais barato em stock sao 22,18).
  // Corrigir isso e' mudar o comportamento do site -- decisao a' parte, nao
  // desta migracao. Aqui so' se vigia que o numero nao dispara.
  const maiores = i.ab.filter((v, k) => v > 0 && i.mn[k] > 0 && v > i.mn[k]).length;
  console.log(`  ab > mn em ${maiores} produtos (variante esgotada ao volume de referência)`);
  ok('os casos de ab > mn continuam residuais (< 200)', maiores < 200, `${maiores}`);
}

ok('nenhum produto sem lojas', i.s.every(v => v > 0), `${i.s.filter(v => !(v > 0)).length} com zero`);
ok('nenhum produto sem preço mínimo', i.mn.every(v => v > 0), `${i.mn.filter(v => !(v > 0)).length} sem`);

console.log(`\n⇒ ${mau === 0 ? '✓ O ARTEFACTO SERVE' : `✗ ${mau} PROBLEMAS — não publicar`}`);
process.exit(mau === 0 ? 0 : 1);
