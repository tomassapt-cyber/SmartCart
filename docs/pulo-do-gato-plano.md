# 🐱 Pulo do Gato — Análise & Plano de Implementação

Fonte: `Pulo do gato (3).pdf` (4 páginas, 29 referências visuais anotadas).
Análise pormenor-a-pormenor + plano faseado, mapeado à arquitetura atual do
CosMath (site estático + localStorage; backend ainda não existe).

---

## LEITURA GLOBAL

O documento define a evolução do CosMath de *comparador de preços* para
**plataforma de lifestyle de skincare "para as girlies"** com 5 pilares:

1. **Nova linguagem visual** — degradê sonhador + cartões brancos + cantos
   redondos + botões translúcidos; neutros/cinzas foscos onde possível.
2. **Avatar personalizado ("boneco")** — identidade sem cara real, com
   acessórios de skincare colecionáveis (a gamificação vira COLEÇÃO).
3. **Feed social fechado** — só se publica o carrinho ou a rotina; partilha
   em formato "fatura" com preços pagos e poupança.
4. **Rotina + calendário + streaks** — checklist diário, vista mensal tipo
   GitHub, dias especiais, brindes por consistência.
5. **Scan de produto** — foto/código de barras → ficha no CosMath.

O fio condutor: **hábito diário** (rotina/streaks) + **expressão pessoal**
(avatar/colagens/carrinho pastel) + **prova social** (feed/fatura) em cima da
nossa vantagem única (preços verificados em 47 lojas + histórico).

---

## ANÁLISE PORMENOR A PORMENOR

### Página 1 — Estética & Avatar

| Pormenor do PDF | Análise | Implicação para nós |
|---|---|---|
| "Fundo degradê colorido com páginas por cima em branco, letras brancas no título, cantos redondos, botões meio-transparentes" (ref: app *Memories*) | Direção de arte clara: aurora-gradient suave (rosa/lavanda/pêssego), cartões brancos elevados, glassmorphism leve | Criar **design tokens** novos (CSS vars): `--grad-hero`, `--card-radius: 16-20px`, botões `backdrop-filter: blur` translúcidos. Aplicar 1º ao hero + modais |
| Ref app de skincare com IA: scan facial → "Skin Age", métricas (Moisture/Acne/Wrinkles), "Your skin routine plan is ready", checklist "Today's routine" 0/4, secção "Share your experience" | É o blueprint do nosso **fluxo rotina**: questionário → plano → checklist diário → partilha. (O scan facial IA é aspiracional/fase distante; o resto é executável) | O quiz existente evolui para **gerador de rotina** com passos concretos; "Today's routine" = checklist diário (Pilar 4) |
| Avatar: "não vou querer a cara, vou querer 1 boneco personalizado" estilo *starter-pack* (foto colada em boneco) | Privacidade + brincadeira. O boneco é ilustrado, estilo colagem pastel | **Avatar builder** por camadas (base + pele/cabelo + acessórios). SVG/PNG por camadas, guardado em localStorage (fase 1) |
| Acessórios do boneco: eyepatches, rolos de cabelo, touca, fones grandes, lacinhos | Acessórios TEMÁTICOS de skincare — reforçam a identidade da plataforma | Desenhar set inicial de ~12 acessórios (2 exclusivos de streak) |
| "Mais tarde: vender acessórios digitais; exclusivos por streaks/desafios; premium grátis p/ influencers, pago p/ plebe" | Modelo de monetização leve + aquisição via influencers. Gamificação = coleção, não só pontos | Fase 3 (precisa backend/pagamentos). Desenhar já o sistema de RARIDADE (comum/streak/premium) para não refazer |

### Página 2 — Feed social

| Pormenor | Análise | Implicação |
|---|---|---|
| "No feed só se pode publicar a partilha do carrinho ou da rotina" | Genial: conteúdo 100% estruturado (nada de moderação de texto livre), sempre ligado a produtos → cada post é shoppable | O post é um OBJETO (lista de EANs + preços à data). Render nosso, sempre bonito |
| Botões do feed: **Copiar carrinho** · gostar · guardar · Ver rotina | "Copiar carrinho" é o killer feature — social commerce direto: 1 clique → o carrinho do influencer no teu bundle optimizer (com OS TEUS melhores preços!) | Já temos o bundle/carrinho e optimizeBundle — copiar carrinho é mapear EANs → bundleState. Executável cedo (com posts seed) |
| Partilha tipo **fatura** com "preços que pagou e o que poupou" (ref RICH GIRLS: recibo com código de barras, "LESS IS MORE") | Formato icónico e partilhável fora da plataforma (IG stories). A poupança é o nosso dado-assinatura | **Gerador de fatura-imagem** (canvas → PNG): itens, total, "Poupaste X€ vs preço médio", código de barras decorativo, rodapé CosMath. Viraliza a marca |
| Colagens com os bonecos disponíveis | UGC controlado: colagem = boneco + produtos (cutouts das nossas imagens) + fundo pastel | Editor de colagem simples (fase 2); templates prontos primeiro |
| Carrinho customizável (cores pastel), mais tarde **malinhas** à venda | Skin do carrinho = expressão + monetização futura | Fase 1: 4-5 cores pastel do ícone/página do carrinho (localStorage). Malinhas = fase 3 |
| "Alturas temáticas: o que compro para as minhas férias" (ref cesta de praia) | Coleções editoriais sazonais que geram posts | **Coleções temáticas** curadas (Férias/Verão, Back to School, SOS Inverno) — páginas de catálogo filtrado com hero editorial. Executável JÁ |

### Página 3 — Páginas core

| Pormenor | Análise | Implicação |
|---|---|---|
| Landing "simples porém elegante e engaging para as girlies", ref TellMi (editorial limpo, fotografia grande, tipografia script de assinatura) | O nosso hero atual é denso; a ref pede AR: menos blocos, fotografia/produto grande, 1 CTA | Redesenho do hero: menos widgets, gradiente suave, título forte, quiz como CTA principal |
| "Manter os neutros quando possível" + "gosto das cores assim cinzas foscos" | O rosa/pastel é ACENTO, não base. Base = brancos/cremes/cinzas foscos | Tokens: `--bg-neutral #f5f4f2`, cinza fosco `#8b8b8b`, acentos pastel só em CTAs/badges |
| Ref "SKIN CARE amazon faves" (tipografia preta GIGANTE + cutouts) para "questionário do onboarding, criação de conta, questionário para rotina" | Onboarding com personalidade editorial: cada pergunta = página limpa com type enorme + produto cutout | Restyle do quiz: 1 pergunta/ecrã, tipografia display, progresso subtil |
| Ref "área pessoal" (flat-lay cinza studio com objetos) | Perfil = "a minha prateleira": os MEUS produtos/rotina/conquistas dispostos como flat-lay | Página de perfil v2: rotina + favoritos + streak + boneco, estética flat-lay |
| Ref scan de produto (câmara identifica + barcode + resultado com rating) | Scan → ficha do produto → comparação de preços. Com câmara web/PWA: **BarcodeDetector** API lê EAN → temos match direto no seed! | **Scan por código de barras é 100% executável** (web, sem backend): EAN → openPriceAnalyzer(ean). Killer para uso em loja física! |

### Página 4 — Calendário, streaks & brindes

| Pormenor | Análise | Implicação |
|---|---|---|
| Calendário diário: checklist de produtos (Cleanser, Vitamin C, SPF, Hair Oil), "vai marcando o que já usou" | O CORE do hábito. Os itens vêm da rotina do utilizador (produtos reais do nosso catálogo) | **Routine tracker** localStorage: rotina AM/PM → checklist diário |
| "Os utilizadores podem atribuir um emoji personalizado a cada título" | Personalização barata que cria afeto | Campo emoji por passo da rotina ✓ trivial |
| Vista mensal "tipo GitHub, cada dia completo fica preenchido" | Heatmap de consistência — prova visual do hábito (e formato partilhável) | Grid mensal com células preenchidas por % de conclusão |
| Dias especiais no calendário: 🎁 brindes · 🚀 lançamentos (+waiting list antecipada) · 🎂 aniversário (brinde se comprar) · ⭐ double XP | O calendário vira canal de marketing/retensão além de tracker | Fase 1: marcar dias especiais estáticos (JSON curado). Waiting lists/brindes reais = fase 3 (backend) |
| "Se completar N dias seguidos ganha 1 brinde" + ref UI "14/15 Day streak" com semana em pontos e estatísticas | Streak com meta visível (X/15) e recompensa | Streak counter + progresso p/ próxima conquista; recompensa fase 1 = acessório de avatar exclusivo (digital, sem custo) |
| "Brindes em 3D todos bonitos" (refs: charms — patinho, gummy bear, corações, dados) | Estética charm/Y2K nas recompensas — mesmo as digitais devem parecer objetos de desejo | Ilustrar conquistas como CHARMS 3D-style (imagens estáticas primeiro); físicos = fase 3 |

---

## O QUE JÁ TEMOS QUE ENCAIXA

| Ativo atual | Papel no plano |
|---|---|
| Comparação fiável 47 lojas + verificação 3×/dia | A fundação de confiança de tudo |
| Histórico de preços + conselho compra/espera | Alimenta a "fatura" (poupança real) e alertas |
| Bundle/carrinho + optimizeBundle + portes | Motor do "Copiar carrinho" |
| Quiz/quizzes existentes | Embrião do onboarding de rotina |
| Fórum (localStorage) | Fundações do feed (substituível pelo feed estruturado) |
| PR_STATE perfil + rating widget | Embrião da conta/área pessoal |
| displayName/imagens limpas por produto | Cutouts para colagens/fatura |

---

## PLANO FASEADO

### FASE 1 — "Girlie Glow-Up" (sem backend, 100% executável já)
*Objetivo: nova pele + hábito diário + partilha viral. Tudo client-side.*

1. **Design tokens novos** (degradê aurora, cantos 16-20px, botões translúcidos,
   base neutra/cinza fosco, pastel como acento) → aplicar a hero, cards, modais.
2. **Onboarding editorial**: restyle do quiz (1 pergunta/ecrã, type display
   estilo "SKIN CARE", cutouts) → output = **rotina AM/PM** com produtos do
   catálogo (aproveita matching por categoria/pele que o quiz já usa).
3. **A Minha Rotina + Tracker diário**: checklist com emoji por passo;
   histórico em localStorage.
4. **Calendário mensal tipo GitHub** + **streak com meta** (X dias → desbloqueia
   acessório de avatar exclusivo). Dias especiais estáticos via JSON curado.
5. **Avatar builder v1**: boneco base + ~12 acessórios skincare (SVG em camadas,
   localStorage). 2 acessórios só-por-streak.
6. **Fatura partilhável (PNG)**: gerar imagem do carrinho/rotina com preços,
   total e "Poupaste X€", código de barras decorativo, branding CosMath —
   download/Web Share API.
7. **Scan por código de barras** (BarcodeDetector/PWA): EAN → modal de
   comparação. (Fallback: input manual do código.)
8. **Coleções temáticas** editoriais (Férias, etc.) — catálogo filtrado + hero.
9. **Carrinho pastel**: 4-5 temas de cor (localStorage).

### FASE 2 — Social light (backend mínimo: Supabase)
1. Contas reais (o código já tem TODOs "quando o backend Supabase estiver pronto").
2. **Feed estruturado**: publicar carrinho/rotina (objeto de EANs), like/guardar,
   **Copiar carrinho** entre utilizadores.
3. Perfil público com boneco + rotina + streak.
4. Alertas de preço por email (liga ao histórico que já grava).
5. Sync cross-device de rotina/streaks/avatar.

### FASE 3 — Economia & marca
1. Waiting lists de lançamentos (dias 🚀 no calendário).
2. Brindes reais por streak/aniversário (parcerias com as 47 lojas!).
3. Acessórios premium do avatar (influencer grátis / pago / desafio).
4. Malinhas (skins pagas do carrinho) + colagens UGC.
5. Double XP days / economia de pontos completa.

---

## RISCOS & GUARDA-CORPOS

- **Peso da página**: o index já tem ~58MB embebidos. As novas superfícies
  (rotina/calendário/avatar) devem ser leves e lazy (padrão price-history:
  fetch só quando abre).
- **Identidade dupla**: a estética girlie não pode diluir a CONFIANÇA
  (verificação/valores) — manter selos e honestidade visual nos preços.
- **localStorage primeiro**: tudo da Fase 1 funciona sem conta; a migração
  para Supabase importa o estado local (desenhar as chaves já com isso em
  mente: `cm.routine.v1`, `cm.streak.v1`, `cm.avatar.v1`).
- **Sem claims falsas**: brindes/waiting lists só aparecem quando existirem
  (lição das perks fictícias que já limpámos).

## ORDEM DE ATAQUE RECOMENDADA (Fase 1)

`1. tokens+hero → 2. rotina (quiz→plano→tracker) → 3. calendário+streak →
4. fatura partilhável → 5. scan barcode → 6. avatar v1 → 7. coleções → 8. carrinho pastel`

Racional: 1-3 criam o LOOP DIÁRIO (valor recorrente), 4-5 criam AQUISIÇÃO
(partilha viral + uso em loja), 6-8 são deleite/retenção.
