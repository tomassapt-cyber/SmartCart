# Páginas legais — rascunho, não integrar

Base: `e529aa75a7c91f285ec581129a19f458ed12f63c` (main obtido em 16/10/2026). Tomás confirmou nesta sessão que a entidade e os dados legais ainda não estão definidos. Este PR fica em rascunho e não está autorizado para merge ou publicação.

## Alterações

- Novos `privacidade.html`, `termos.html`, `cookies.html`, `contacto.html` e `paginas-legais.css`, a partir dos rascunhos de 28/09.
- `demo.html`: quatro ligações no rodapé, mantendo CRLF; nenhuma alteração à lógica de portes, conta ou carrinho.
- `scripts/build-sitemap.js`: quatro páginas fixas. `cleanUrls: true` já existe e não requer mudança de configuração.
- Texto alinhado com o código: favoritos locais e sincronizados, separação entre contas e cópia pendente até 60 dias; carrinho local durante 30 dias; medicação só no dispositivo; pedidos de imagens aos servidores/CDN das lojas; formulário de alertas oculto; não foi encontrada afiliação ativa.
- Removidas promessas sobre um painel de consentimento, identificadores e prazos de estatísticas que não existem no `demo.html` atual. O evento `search_events` continua descrito e o pedido técnico pode transmitir IP ao prestador. Não se altera o tracking neste PR.

## Por preencher/confirmar pelo Tomás antes de publicar

Há **25 ocorrências de `class="falta"`**, incluindo repetições entre páginas (os rascunhos fornecidos não tinham as 17 indicadas no pedido).

- Nome/denominação, NIF/NIPC, morada e email público: por definir, sem urgir resposta nesta sessão.
- Datas de publicação nas três políticas.
- Entidade RAL e Livro de Reclamações: determinar aplicabilidade e ligações em função da entidade.
- Região efetiva do projeto Supabase; entidade contratante e transferências no contrato.
- Localização e condições do serviço DiceBear.
- DPA e garantias de transferência efetivamente aplicáveis à conta/plano da Vercel e do Supabase.
- Retenção efetiva das cópias de segurança. Não prometer eliminação em «alguns dias» sem prova.
- Validar juridicamente os fundamentos e a retenção de `search_events` e a classificação das finalidades de armazenamento antes da publicação. Não se aplicaram migrações nem se consultou o Supabase restringido.

Fontes consultadas em 16/10/2026: [CNPD — cookies](https://www.cnpd.pt/media/x2zdus50/nota-informativa-cnpd_cookies_20210625.pdf), [Vercel — termos](https://vercel.com/legal/terms), [Vercel — DPA](https://vercel.com/legal/dpa), [Supabase — DPA](https://supabase.com/legal/customer-resources/data-processing-addendum). A existência de documentos públicos não confirma os acordos da conta do Tomás.

## Validação

- Portes verificados: 16/16; portes desconhecidos: passou.
- Build local: shards, índice, sitemap e inject em modo deploy passaram, sem rede/Supabase. Catálogo não alterado pelo PR.
- Servidor local próprio em `http://cosmath.localhost:5194`, com BD capturada por fetch falso: quatro rotas HTTP 200, um h1 e `pt-PT` por página; sem overflow horizontal a 375 px. Captura de cookies inspecionada.
- iPhone físico: por verificar pelo Tomás; Chromium não prova compatibilidade Safari.
- Resultados finais Chromium registados na descrição do PR.

Impacto: zero alterações a lojas, produtos, ofertas, imagens do catálogo ou dimensão da BD; só páginas estáticas e navegação. Os artefactos gerados, a BD local e capturas não entram no commit.

## Revisão após análise do Claude

Corrigidas a frequência de recolha (varia por loja) e as perguntas obrigatórias do questionário. Os 180 dias constam das migrações 007/008, mas o trigger de purga é probabilístico e executado com novos inserts: não prova eliminação ao segundo nem que esteja aplicado remotamente. O prazo previsto está agora no rascunho, com confirmação obrigatória antes de publicar. A migração 015 de apagar conta também carece de confirmação remota; não se consultou o Supabase bloqueado. O fundamento/consentimento de respostas que possam revelar saúde fica expressamente pendente de validação. As quatro novas canonicals usam caminhos relativos, sem introduzir cópias do domínio; a origem configurável será tratada no PR SEO. O #77 exclui docs/ e Markdown internos do deploy Vercel.
