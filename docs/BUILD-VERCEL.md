# O build do Vercel — o que não fazer

## ⚠️ NÃO acrescentar chaves ao `vercel.json`

O `vercel.json` é validado contra um esquema que **rejeita propriedades
desconhecidas**. Uma chave a mais — mesmo uma nota inofensiva com um nome
começado por `_` — faz a Vercel recusar o deploy **no mesmo segundo em que o
recebe**, sem sequer correr o build.

Aconteceu em 2026-08-05: acrescentei `"_nota_buildCommand"` para documentar a
ordem dos passos e os deploys falharam **todos durante 9 horas e 46 minutos**.
O site continuou a servir a versão das 01:58 e nada do que foi enviado nesse
intervalo chegou aos utilizadores.

Notas sobre o build vivem **aqui**, neste ficheiro. Não no JSON.

## Como saber se um deploy aterrou (e porque é que o óbvio não serve)

Nada disto é sinal de sucesso:

| sinal | porquê não serve |
|---|---|
| o workflow "Deploy branch sync (Vercel)" a verde | só empurra o branch; não sabe o que a Vercel fez com ele |
| o branch `deploy` ter o commit certo | idem |
| o site responder 200 | serve a versão anterior, que continua lá |

O que serve:

```bash
gh api repos/tomassapt-cyber/SmartCart/deployments --jq '.[0].id'
gh api repos/tomassapt-cyber/SmartCart/deployments/<id>/statuses --jq '.[0].state'
```

`success` é a única resposta boa. E o **tempo até falhar** diz o tipo de avaria:

- **falha no mesmo segundo** → a Vercel recusou à entrada: `vercel.json` inválido,
  quota, ou limite de deployments. O build não correu.
- **falha ao fim de minutos** → o build correu e rebentou: memória, disco, tempo,
  ou um passo que devolveu erro.

Complementarmente, o `Age` do CDN a crescer sem parar em `curl -I https://smart-cart-zx55.vercel.app/`
quer dizer que nenhum deploy novo aterrou desde há `Age` segundos.

## A ordem dos passos do `buildCommand`

Hoje: `build-product-shards.js` → `inject-seed-into-demo.js`.

Se algum dia entrar o `build-search-index.js`, tem de ser **antes** do inject:
escreve `data/idx/` e `data/startup-block.json`, e o inject lê os dois para os
meter no `#hp-data` (`idx_version` + `arranque`). Trocar a ordem faz a página
sair com a versão do índice vazia e o caminho novo desligado — sem erro nenhum.

As guardas `|| echo` protegem contra um passo que devolve código de erro. **Não**
protegem contra o build inteiro morrer por memória, disco ou tempo, nem contra
uma recusa à entrada.

## O `buildCommand` tem um limite de 256 caracteres

Foi a **segunda** causa da paragem de 2026-08-05, escondida atrás da primeira.
Depois de tirar a chave desconhecida, os deploys voltaram — e voltaram a falhar
assim que o passo do índice entrou outra vez. Instantaneamente, outra vez.

  199 caracteres → aceite
  300 caracteres → recusado, no mesmo segundo, sem explicação

Por isso o build vive agora em `scripts/build-vercel.sh` e o `vercel.json` tem
só `"buildCommand": "bash scripts/build-vercel.sh"` (28 caracteres). No script
não há limite de tamanho e cabem comentários — que era o que eu queria fazer no
JSON e desencadeou tudo isto.

**Passos novos vão para o script, nunca para o JSON.**

## `rewrites`: o endereço próprio por produto (2026-09-26)

O `vercel.json` passou a ter:

```json
"rewrites": [
  { "source": "/produto/:resto*", "destination": "/index.html" }
]
```

**Porquê.** Até agora uma ficha de produto não tinha endereço nenhum: abria em
sobreposição, por JavaScript, sem tocar no URL. Não se podia partilhar o link de
um produto, o botão Voltar do telemóvel saía do site, e nenhum dos 49.397
produtos podia ser indexado pelo Google — o que fecha o canal de aquisição de um
site de comparação de preços.

Agora cada produto tem `/produto/<ean>-<slug>`. O servidor entrega sempre a
aplicação; é o `seoAbrirDoEndereco()` do `demo.html` que lê o caminho e abre a
ficha certa, escrevendo também o `canonical`, o Open Graph e o JSON-LD
(`AggregateOffer` — o tipo que descreve «o mesmo produto em N lojas, de X a Y»,
e é o que faz o Google mostrar «desde 3,32 €»).

**Sem o rewrite, um link directo dava 404** e tudo isto não servia de nada.

**E porque é que a explicação está aqui e não no JSON.** Este comentário não pode
viver no `vercel.json`: o ficheiro é validado contra `openapi.vercel.sh/vercel.json`,
que **rejeita propriedades desconhecidas** — mesmo com nome começado por `_` ou
`//`. Uma chave a mais faz a Vercel recusar o deploy **à entrada**, sem correr o
build e sem dizer porquê; custou 9h46 de site parado a 5 de Agosto de 2026. Ao
escrever o rewrite acima quase repeti o erro, com um `"//"` dentro do objecto.
**Nada que não esteja no esquema entra no `vercel.json`.**
