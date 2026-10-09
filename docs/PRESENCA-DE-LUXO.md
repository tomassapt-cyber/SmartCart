# Presença de Luxo — validação final

Proposta revalidada em `main` `99e8ef8ef47a7bda112a3118277837b870296aad`: **1047 ofertas**, 1047 ativas, 0 inativas; **zero produtos novos**. A recolha completa do PC terminou em 9 outubro 2026 e permanece dentro do limite de frescura de 24h. 23 conflitos de unidade/quantidade foram excluídos; nomes alternativos sem identidade física comprovada não são associados. O gel Inocos 5600355751449 continua apenas candidato ao existente 5600355736804, sem criação nem associação automática.

O scraper lê o preço explícito **com IVA**: o preço principal e o JSON-LD da loja são líquidos. Confirma GTIN, URL, dados visíveis, stock e ausência de suplementos por artigo. Não publica um catálogo parcial. Robots, 403, 429 ou desafios impedem a recolha, sem contorno.

[Teste no GitHub](https://github.com/tomassapt-cyber/SmartCart/actions/runs/37930339207): acesso público a três fichas com o robô declarado passou, assim como descoberta, integração, preservação de produtos/outras lojas, portes desconhecidos, roundtrip do seed e os quatro passos de geração de produção. A recolha completa agendada continua no GitHub, **três vezes por dia**.

A [fonte oficial de portes](https://presencadeluxo.pt/content/21--condicoes-de-envios-e-recolhas) apresenta 3,05 € mais IVA no continente abaixo de 39 €, exceções por peso e tarifas das ilhas não publicadas. Não foi inventado um valor com IVA nem uma taxa única. O frontend já inclui #36: custo desconhecido fica `null`, é assinalado como calculado no checkout e não entra em totais entregues fictícios.

Imagens alteradas nesta proposta: **0**. A auditoria disponível não sinalizou ausência/placeholder/erro nos produtos correspondentes; não equivale a uma nova verificação HTTP de todas as imagens. As duas imagens oficiais Maia já presentes no main foram reconfirmadas com HTTP 200, 800×800 e hashes iguais à revisão visual anterior.

Esta revisão também atualiza a recolha Maia para 3011 ofertas (2704 ativas, 307 inativas), sem produtos novos. As restantes lojas são preservadas integralmente. Snapshot antes/depois: 99/100 lojas, 85150/85150 produtos e 286614/287662 ofertas. JSON compacto +470530 bytes; chamadas/escritas Supabase **0**, crescimento físico Postgres não medido.

O teste cloud Maia respondeu **403, servidor Cloudflare, `cf-mitigated: challenge`, título “Just a moment…”**, no primeiro pedido a robots.txt. Isto não foi confundido com sucesso de scraping. Enquanto a loja não permitir o robô, as execuções agendadas apenas integram um ficheiro completo/fresco fornecido pelo PC; o integrador rejeita mais de 24h e preserva o catálogo. Um ensaio manual de recolha cloud continua disponível após alteração das condições de acesso. O helper `scripts/refresh-farmacianovadamaia-pc.py` recolhe, publica apenas o ficheiro cru com recuperação de conflito sem force e desencadeia a integração na cloud. Máximo três tentativas locais por 24h. **Não foi instalado agendamento Windows**.

Portes desconhecidos não foram inventados, demo.html não foi alterado e não foi acedido ao Supabase. O painel de ofertas e as contagens reais da BD só podem ser verificados quando terminar a restrição do Supabase. Distinguir integração no código/seed de disponibilidade confirmada no painel antes de marcar a loja como concluída no Excel.
