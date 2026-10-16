# Build e metadados — ligação Claude/Codex

Estado: frontend e função para revisão; não integrar sem build e prova de cache CDN. Base main 361df29. O ramo inclui as alterações dos #76/#77/#80, sem merge no main.

## Divisão

Claude: scripts/build-vercel.sh, catálogo, build/metadados e origem única. Codex: frontend/prepare-pages.cjs, frontend/product-page.mjs, api/seo-product.mjs, demo.html e routing/cache. Não foi alterado scripts/build-vercel.sh nesta proposta.

O Claude chama `node frontend/prepare-pages.cjs` depois do inject e antes da limpeza final. O adaptador extrai CSS/scripts clássicos inline para assets/cm-<hash>.js/css, conservando posição e ordem. JSON de dados fica no HTML. Gera index.html, catalogo.html e seo-shell.html leves. Não reescreve o demo.html. Os assets têm cache immutable de um ano; não entram no Git.

## Contrato público v1

`/seo-meta/manifest.json`: `{"v":1,"version":"<hash alfanumérico de 8 a 64 caracteres>","site":"https://origem-publica"}`.

`/seo-meta/<version>/<bucket>.json`: objeto indexado por EAN/id sintético, com valores `{e,n,b,s,lo,i?}`. Id completo `e`; nome `n`; marca `b`; lojas com oferta publicável em stock `s` (inteiro); mínimo em cêntimos `lo` (inteiro, -1 sem preço); imagem HTTP(S) opcional `i`. Usar índice filtrado do mesmo build. `lo` tem de coincidir com o desde da UI, incluindo variantes, packs e stock. No caminho do índice, usar ab válido antes de mn (absBest ?? bestPrice), não min(mn,ab): foram encontradas 27 diferenças nesta captura. Referência exportada indexMinimum() no módulo frontend. Não usar preços antigos de popularidade. Hash muda quando conteúdo muda. Sem dados pessoais.

Bucket: FNV-1a de 32 bits, seed 2166136261, multiplicador 16777619, sobre UTF-16 code units, módulo 512. Referência: função exportada bucket() em frontend/product-page.mjs. Um JSON por bucket, mesmo vazio. Pedaços versionados com cache immutable; manifesto/shell com revalidação.

O build deve manter uma só origem configurável e injetar `<meta name="cm-site" content="ORIGEM">` na shell global. Usar a mesma origem no manifesto, robots, sitemap e páginas legais com canonical absoluto. O frontend consome esse meta; as fichas recebem a origem pelo manifesto. Sem esta ligação, a homepage ainda usa location.origin e o domínio não está centralizado: não declarar esta tarefa concluída.

## Função

Rewrite `/produto/:ean/:resto*` para `/api/seo-product?ean=:ean`. Função edge normal, **sem middleware**. Respostas públicas 200: cache CDN fresca 300 s, stale-while-revalidate 600 s. Erros 404/503 com no-store. GET/HEAD, sem corpo no HEAD, sem cookies/personalização ou Supabase. Header X-Cosmath-Catalog identifica versão; a CDN é por deployment e por URL, deve ser verificada em preview.

Head/JSON-LD e resumo visível usam os mesmos dados. Um h1 visível; ao fechar a ficha, o JS repõe heading e título da homepage. O noindex/no-store experimental do #79 não é copiado. Este PR novo continua em rascunho até integração e validação, não foi autorizado para merge.

## Validação conjunta pendente

Ligar build; testar variante/pack/stock contra a UI; repetir portes e Chromium; confirmar canonical/og:url antes e depois de JS, origem alternativa, HEAD/404/503 e iPhone. Provar MISS seguido de HIT no preview e medir transferência comprimida: headers sozinhos não provam cache. Ler uma semana de consumo real no painel Vercel antes de declarar custo mensal validado. Sem isso, não abrir em produção.

Fontes: https://vercel.com/docs/caching/cache-control-headers e https://vercel.com/docs/caching/cdn-cache .
