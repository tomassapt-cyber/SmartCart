# Retoma do backend CosMath — 8/10/2026

Projeto único: **Cosmath `oghtbdcfvtgryouwsdae`, eu-central-1**.

## Estado conhecido e ação imediata

O relatório de 8/10 documenta HTTP 402 por quota de Storage e um email de 7/10 que diz que o projeto ainda não estava pausado. Não é uma confirmação do estado atual. Abrir o dashboard deste projeto e registar estado, data/hora de observação, data real do ciclo e utilização de Storage/Database. Visitar o dashboard é uma das ações indicadas pela documentação para gerar atividade; não garante que o problema de quota esteja resolvido. Não confiar em chamadas 402 para impedir a pausa. Não criar pings artificiais nem contornar a restrição.

A documentação pública consultada em 8/10 fala em pausa por baixa atividade de BD numa janela de sete dias e restauro até um ano. O email referido no relatório fala em 90 dias: conservar esse prazo prudente e pedir esclarecimento ao suporte. O texto para o suporte já existe em `correcoes-2026-10-08/SUPABASE-E-LOJAS.md`; não foi enviado.

## Sequência de retoma

1. Confirmar o estado no dashboard. HTTP 540 é documentado como projeto pausado; tratar a pausa separadamente do 402. Se pausado, usar o procedimento de Resume project do dashboard e confirmar o resultado; não recriar o projeto nem mudar o URL para outro projeto.
2. Confirmar libertação da restrição, sem assumir que acontecerá exatamente em 15/10. O adiamento do script expira em `2026-10-16T00:00:00Z` (01:00 de Lisboa). Se continuar 402, confirmar ciclo/utilização e contactar suporte. Não repetir gravações nem fazer upgrade pago.
3. O limpador existente usa a API de Storage. Confirmar o log `bucket "catalog" apagado` ou ausência confirmada do bucket, depois confirmar utilização real no dashboard. Um workflow verde com 402 significa apenas adiamento. Nunca apagar metadados de Storage por SQL. A limpeza já agendada não foi executada nem alterada nesta tarefa.
4. Depois da limpeza confirmada, desativar apenas o schedule de 30 minutos do limpador, mantendo a opção manual. Essa alteração fica para a confirmação real da limpeza.
5. Integrar primeiro o PR #25; depois a proposta de estados/cache. Não alterar `scripts/push-catalog-to-db.js` por este segundo PR, evitando conflito. O wrapper exige os três sinais de contagens do #25 e falha se ainda estiver instalada a versão antiga.
6. Invalidar apenas a cache de sync que possa ter sido republicada durante o bloqueio, ou usar um prefixo novo numa correção revista, para obrigar a ler o estado da BD. Não usar `--completo` por rotina: reescreve todo o catálogo e pode aumentar a ocupação física. Registar a primeira leitura `estado lido da BD`, contagens e linhas realmente enviadas. Cache ausente não obriga a sync completo.
7. Exigir contagens exatas HTTP válidas de stores/products/offers, verificadas contra o payload final do próprio run. São limites inferiores: o guardrail pode conservar linhas antigas. Contagens não provam que cada preço/linha está atualizado. Validar amostras por chave, preço, timestamp e variantes. Confirmar também contagem de `offer_variants` se a tabela estiver disponível; o #25 ainda não verifica essa tabela.
8. Confirmar cache nova apenas quando o script a gravou, e uma segunda corrida com `estado do último sync`, mudanças plausíveis e contagens válidas. Se o guardrail impedir limpeza, rever a razão antes de aceitar o estado como espelho exato.
9. Testar o painel Ver preços com produtos de várias lojas e volumes: preço, stock, portes e data. Confirmar pesquisa, histórico de preços e variantes. Medir Database e Storage no dashboard depois da retoma. Os 329 MB são históricos, não atuais.

## Estados da proposta de CI

| Estado | Significado | Guardar cache |
|---|---|---|
| `deferred_storage_quota` | 402 específico dentro da janela prevista; nenhuma confirmação de sync | Não |
| `verified` | Processo completo com as três contagens finais | Só se o script anunciou gravação e o ficheiro existe |
| `failed` | Secrets ausentes, erro, pausa, processo incompleto ou versão sem #25 | Não |

O adiamento continua a poder deixar o workflow verde para respeitar a janela atual, mas passa a aparecer explicitamente no resumo do job. Consumidores que dependam apenas de `workflow_run.conclusion=success`, incluindo deploy-branch, precisam de revisão própria antes de usar verde como prova de BD atualizada. Esta proposta não altera o deploy nem a cadência de bots.

## Impacto e limites

Nenhuma loja, produto ou oferta foi alterada nesta tarefa; zero bytes escritos na BD. A proposta afeta a execução do sync de todo o catálogo, sem acrescentar linhas. Crescimento real da BD só se mede depois da retoma, incluindo índices e versões de linhas. `demo.html` não foi alterado. Não houve acesso ao dashboard autenticado, execução de SQL, limpeza de Storage, upgrade ou pedido de service key.

Fontes oficiais consultadas em 8/10/2026:

- [Pausa e retoma](https://supabase.com/docs/guides/platform/free-project-pausing)
- [HTTP 402 e 540](https://supabase.com/docs/guides/troubleshooting/http-status-codes)
- [Restrições e faturação](https://supabase.com/docs/guides/platform/billing-faq)
