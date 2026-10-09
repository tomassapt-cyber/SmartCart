# Farmácia Nova da Maia — revalidação de 9/10/2026

Atualização de integração: o catálogo foi reconstruído num clone isolado do `main` atual e reaplicado após os refreshes Pharma GDD/Santa Marta (`d05aa9e316ca2baac82e5c142a1747755ff7a279`), já com a correção de portes desconhecidos (#36), a qualidade #34/#35 e a privacidade C1. A mesma recolha concluída às 01:10 UTC produziu **3 010 ofertas** (2 699 em stock, 311 indisponíveis), **0 produtos novos** e **2 imagens verificadas**. O seed passou a **85 120 produtos brutos e 99 lojas**; pack/unpack repetido sem alterações adicionais. O build local gerou índice, sitemap e página com **68 993 produtos visíveis e 240 970 ofertas no render**. Nenhum acesso ao Supabase. Revalidar o resultado no runner e no `main` final antes de interpretar contagens como produção.

Revalidação de 9/10/2026 contra `main` `6a1174b35dab25bb3705b29082b92976b50a1132`. As 3 010 ofertas anteriores continuam a identificar produtos existentes. A recolha nova percorreu 150 páginas públicas e prepara 3 010 ofertas (2 699 com stock e 311 indisponíveis), com zero produtos novos; preserva os 85 113 produtos do catálogo e todas as ofertas/lojas anteriores. Dois URLs de imagem oficiais revistos ao vivo e visualmente: Esthederm 150 ml (anterior 404) e Hansaplast pés 150 ml (anterior ausente).

Os [termos oficiais](https://farmacianovadamaia.pt/pt/content/3-termos-e-condicoes), secção 10.2.1, confirmam portes por peso, sem tabela fiável ou limiar grátis confirmado. O #36, já integrado, representa esse custo como desconhecido e exclui estas ofertas de totais entregues inventados. Nenhuma tarifa foi inventada. A validação de 3 010 ofertas continua dependente de uma corrida real no runner GitHub e da retoma do Supabase para aparecer no painel.

Matching por GTIN com checksum, equivalência UPC/EAN e aliases documentados. 325 identificadores sem par seguro e 33 conflitos ficam excluídos; revisão de equivalências por nome/tamanho incluída. Mudanças desde a recolha anterior: 109 preços e 5 estados de stock.

Validação em Node 24.19.0: integrador contra a biblioteca atual, cinco cenários offline do scraper e oito cenários simulados de push. Ensaio sem escrita, integração local e pack/unpack byte a byte. Build local passou os quatro passos de geração da Vercel (pedaços, pesquisa, sitemap e páginas), sem alterar template ou seed. Retenção dos ficheiros fonte local em vez do passo final de limpeza. Não se usou o antigo `npm run build`, que gera preços sintéticos. Recolha nos servidores GitHub continua por validar.

Proposta: +1 loja, 0 produtos novos, +3 010 ofertas, 2 imagens; seed compacto +1 481 288 bytes. BD: zero pedidos/escritas, crescimento PostgreSQL não medido. **Não acrescentar ao Excel como integrada** enquanto estes pontos estiverem pendentes. Evidência estruturada em `docs/farmacianovadamaia-validacao-2026-10-09.json`.


## Fecho técnico — recolha de 9/10 às 12:31 UTC

Nova recolha completa no PC, 150 páginas, revalidada contra `99e8ef8ef47a7bda112a3118277837b870296aad`: **3011 ofertas** (2704 ativas; 307 inativas), **zero produtos novos**, 329 identificadores sem par e 33 conflitos excluídos. Produtos e restantes lojas preservados. As duas imagens oficiais mantêm HTTP 200, 800×800 e o mesmo hash da revisão visual.

O primeiro runner (37919144641) falhou em robots.txt. O [diagnóstico explícito](https://github.com/tomassapt-cyber/SmartCart/actions/runs/37930339207) confirmou 403 Cloudflare com desafio, sem contorno. A nuvem continua preferida nas lojas acessíveis, incluindo Presença de Luxo. Nesta exceção, o PC recolhe e a cloud integra: `python scripts/refresh-farmacianovadamaia-pc.py`; o botão `so_integrar=sim` integra sem aceder à loja. Os crons mantêm três integrações/dia, recusando feeds incompletos ou com mais de 24h. O modo manual `so_integrar=nao` permite verificar recolha cloud depois de a loja permitir o robô. Nenhum agendamento Windows foi instalado.

Build/roundtrip e testes locais passaram; verificação Linux das integrações passou no run indicado. Nenhuma chamada ou escrita Supabase. A validação do painel/BD permanece condicionada à restrição até 15/10; não confundir fecho do código com integração confirmada na BD.
