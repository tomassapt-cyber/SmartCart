# Trabalhar no aspeto do site

Este guia é para quem vai mexer no **design** do CosMath.

## A ideia

Não há ficheiro de rascunho nem versão paralela. **O `demo.html` é o site.**
O build pega nele, enche-o com os dados das lojas e publica. Mexes no aspeto
aqui, e quando estiver bom vai online como está — sem ninguém ter de converter,
copiar ou reescrever nada.

## Ver o site enquanto trabalhas

```bash
npx --yes http-server . -p 5175 -c-1 --silent
```

E abre **http://localhost:5175/demo.html**

Vais ver o site completo: 74 lojas, 165 produtos com fotografia, preços reais,
comparação entre lojas, ficha de produto, carrinho, quizzes. Tudo funciona.

Isso chama-se **modo de desenho** e liga-se sozinho: quando o `demo.html` é
aberto sem passar pelo build, carrega uma amostra guardada em
`data/preview-arranque.json` para haver produtos no ecrã. A consola do navegador
confirma-o com uma etiqueta `MODO DE DESENHO`.

> A amostra são produtos e preços verdadeiros, mas **congelados**. Não é a
> base de dados a sério, e nunca é usada no site publicado — lá os dados entram
> pelo build. Serve só para veres o que estás a desenhar.

## O que podes mexer à vontade

O ficheiro tem 18 mil linhas, mas está arrumado:

| o quê | onde | tamanho |
|---|---|---|
| **CSS** — cores, espaços, tipos de letra, formas, sombras, animações | **um único bloco `<style>`**, no topo | 239 KB |
| **HTML** — a estrutura do que aparece no ecrã | espalhado, mas só 38 KB no total | 38 KB |
| JavaScript — a lógica | 5 blocos `<script>` | 510 KB |

**O CSS é teu.** É contíguo, não tem lógica pelo meio, e mexer lá não parte
nada. Há 38 variáveis de cor e espaçamento logo no início (`:root`) — mudá-las
muda o site inteiro de uma vez.

**O HTML também**, com um cuidado: não apagues atributos que comecem por
`id=`, `data-` ou classes que o JavaScript use para encontrar elementos. Se
tiveres dúvida sobre uma classe, pergunta — é mais rápido do que arriscar.

**O JavaScript não é para mexer.** Se precisares de uma mudança que exija
lógica nova (um componente que não existe, uma secção que se comporta de outra
maneira), diz — passa a ser trabalho de programação, não de CSS.

## Como isto vai para o site

1. Mexes no `demo.html`
2. Vês em `http://localhost:5175/demo.html`
3. Quando estiver bom, o ficheiro é enviado para o repositório
4. O build corre sozinho e o site fica com o teu design

Não há passo de integração. **O ficheiro em que trabalhaste é o que vai
online.**

## O que NÃO vais ver no modo de desenho

- O catálogo tem 165 produtos em vez de milhares — chega para desenhar, mas os
  contadores mostram números pequenos ("11 produtos comparados")
- Contas de utilizador e a prateleira pessoal precisam de base de dados
- A pesquisa só encontra dentro dos 165

Nada disso é avaria: é a amostra a ser pequena de propósito, para o ficheiro
abrir depressa.

## Uma regra que vale a pena saber

Emojis só até à versão 12.0 — os mais recentes não aparecem em telemóveis mais
antigos e ficam quadrados brancos.
