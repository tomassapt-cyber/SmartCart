# Protótipo edge — só medição, não integrar

Autorizado pelo Tomás depois da revisão do Claude, em 16/10/2026. Não é a implementação SEO final. Atua nos endereços existentes `/produto/*`, no preview do PR; não cria uma segunda versão ou flag pública.

O build deriva metadados do índice filtrado e reparte-os em 512 pedaços estáticos, mais um manifesto. A função edge importa apenas o módulo Web API pequeno, nunca o índice/catálogo. Faz fetch ao manifesto, ao pedaço e à shell estática; mantém cache de memória limitada a 34 entradas durante 60 segundos. Falhas devolvem 503, desconhecidos 404. Não lê nem escreve em Supabase.

As respostas deste protótipo têm `X-Robots-Tag: noindex` e `Cache-Control: private, no-store`: evita indexação experimental e permite medir invocações sem as esconder atrás de cache de resposta. **Isto tem de ser revisto antes de qualquer utilização em produção.** Não fazer merge.

Title, description, canonical, Open Graph e Product/AggregateOffer são escritos no HTML inicial, com escape HTML/JSON e contagens/preços da ficha. O mínimo respeita `mn`/`ab`, incluindo variantes. A origem pública é lida do valor COSMATH_SITE ou do Sitemap no robots existente; não foi acrescentada outra cópia literal do domínio.

Limitações deliberadas de medição: o corpo continua a aplicação atual; ainda falta conteúdo inicial específico da ficha, resolver as origens/canonicals após JS nos previews e centralizar o domínio em todos os consumidores. A integração com a correção pequena de canonical e os PRs #75/#76/#77 será feita apenas numa implementação final aprovada. A .vercelignore repete a proteção do #77 para não expor documentos neste preview.

Testes: `node --test scripts/test-seo-edge.test.mjs`, cobrindo escape/injeção, preço e canonical, ausência de preço, falhas estáticas, cache, HEAD, chaves especiais e métodos. As medições locais e HTTP do preview serão registadas no relatório da sessão e na descrição do PR. Server-Timing separa o tempo de obtenção de recursos e a transformação; é tempo decorrido na função, **não medição de CPU faturada**.

Referências: https://vercel.com/docs/routing-middleware/getting-started e https://vercel.com/docs/functions/runtimes/edge.
