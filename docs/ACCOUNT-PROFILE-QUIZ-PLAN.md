# GirlMath — Account, Profile & Quiz (next session plan)

> Last updated: 2026-05-22. Read this in full before opening any file.

## Goals

Move from `email + password → empty profile` to a sign-up flow that gets enough
data to **personalize the catalog** (skincare suggestions, store proximity,
points-redeemable rewards) without being annoying.

Three deliverables in order:
1. **Supabase schema migration** for `profiles` + helper tables
2. **Account page** at `/conta` with 4 tabs (Perfil · Skincare · Preferências · Avatar)
3. **Suave onboarding quiz** triggered the first time a logged-in user opens the catalog (skippable, gives points)

---

## 1. Supabase schema

One main `profiles` table linked 1:1 with `auth.users`. RLS: each user can
read/update only their own row. Insert is done by trigger when a new user
signs up (Supabase pattern).

```sql
-- 001_profiles.sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Identity
  display_name text,
  avatar_url text,                    -- URL completa, ou 'preset:flower' / 'dicebear:seed-xyz'
  gender text check (gender in ('feminino', 'masculino', 'outro', 'nao_dizer')),
  birth_date date,
  district text,                      -- ISO 3166-2 PT code (PT-01..PT-30) ou null
  -- Skincare profile (do quiz)
  skin_type text[] default '{}',      -- ['oleosa','sensivel'] (multi possível)
  skin_concerns text[] default '{}',  -- ['acne','manchas','rugas','hidratacao','poros','olheiras','vermelhidao']
  skin_allergies text[] default '{}', -- ['fragrancia','alcool','retinol','aha','bha']
  routine_steps int check (routine_steps between 0 and 10),
  skincare_goal text,                 -- single choice
  -- Hair profile (opcional)
  hair_type text,                     -- 'lisos','ondulados','cacheados','afro','quimico'
  -- Lifestyle / preferences
  budget_monthly_eur int check (budget_monthly_eur between 0 and 1000),
  preferences text[] default '{}',    -- ['cruelty-free','vegan','sem-fragrancia','embalagem-eco']
  -- Notifications (subscritas)
  notify_brands text[] default '{}',  -- ['bioderma','la-roche-posay']
  notify_discount_threshold_pct int default 20,
  notify_telegram boolean default false,
  -- Points
  points int default 0,
  points_lifetime int default 0,      -- nunca diminui (para badges)
  -- Meta
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_quiz_at timestamptz,           -- null = quiz não feito, mostra prompt
  quiz_skipped_count int default 0    -- conta cliques no "agora não"
);

alter table public.profiles enable row level security;

create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger: cria row em profiles quando user é criado
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Audit trail (events do user — points earned, quiz answers, etc.)
create table if not exists public.profile_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,           -- 'quiz_step_done','points_earned','avatar_changed',...
  payload jsonb default '{}',
  created_at timestamptz default now()
);
create index on public.profile_events (user_id, created_at desc);

alter table public.profile_events enable row level security;
create policy "Users read own events" on public.profile_events
  for select using (auth.uid() = user_id);
create policy "Users insert own events" on public.profile_events
  for insert with check (auth.uid() = user_id);
```

**Migration file:** `database/migrations/001_profiles.sql` (já existe pasta `database/`)
**Apply path:** Supabase dashboard → SQL Editor → paste → Run. (Não usar Supabase CLI até termos workflow CI/CD.)

---

## 2. Account page (`/conta`)

Layout: tab bar horizontal em cima, card de conteúdo grande em baixo. Mobile = tabs em vertical scroll.

```
┌──────────────────────────────────────────────────────────┐
│  PERFIL · SKINCARE · PREFERÊNCIAS · AVATAR · NOTIFICAÇÕES│
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Tab "PERFIL":                                           │
│   - Nome a mostrar (text input)                          │
│   - Sexo (radio: F/M/Outro/N.D.)                         │
│   - Data nascimento (date picker)                        │
│   - Distrito (dropdown PT-01..PT-30)                     │
│   - Budget mensal cosmética (€ slider, 0-200)            │
│                                                          │
│  Tab "SKINCARE":                                         │
│   - Tipo de pele (chips multi-select)                    │
│   - Preocupações (chips multi-select)                    │
│   - Alergias / evitar (chips multi-select)               │
│   - Rotina actual (stepper 0-10 passos)                  │
│   - Objectivo 3 meses (radio cards visuais)              │
│   - Tipo de cabelo (chips single-select, opcional)       │
│                                                          │
│  Tab "PREFERÊNCIAS":                                     │
│   - Éticas (chips multi: cruelty-free, vegan, etc.)     │
│                                                          │
│  Tab "AVATAR":                                           │
│   - Grid 6 col de avatares pré-definidos (~24 opções)    │
│   - "Personalizar com DiceBear" → 8 estilos              │
│   - "Carregar foto" (feature futura, desactivada agora)  │
│                                                          │
│  Tab "NOTIFICAÇÕES":                                     │
│   - Marcas a seguir (autocomplete chips)                 │
│   - Threshold de desconto (slider 10%-50%)               │
│   - Telegram opt-in (checkbox + link bot)                │
│                                                          │
│  Botão "Guardar" em rodapé (sticky em mobile)            │
└──────────────────────────────────────────────────────────┘
```

**Implementação:** novo ficheiro `account.html` servido como `/conta`. Reutilizar paleta GirlMath. Form usa `fetch` direto ao Supabase REST API com JWT do user.

---

## 3. Onboarding quiz

**Trigger:** primeiro login após signup, OU clique no banner "Personaliza" na home.
**Pode ser fechado:** botão "Agora não" no topo. Counter `quiz_skipped_count` em `profiles` — se passar 3x, escondemos para sempre o banner (não chatear).

**Estrutura:** Stories-style, 1 pergunta por step, ícones visuais. 6 perguntas:

| # | Pergunta | Tipo | Mapeia para |
|---|---|---|---|
| 1 | Como descreves a tua pele? | Cards multi-select (4 opções) | `skin_type` |
| 2 | Qual é a tua preocupação principal? | Cards multi (3 max de 7) | `skin_concerns` |
| 3 | Há algum ingrediente que te dá problemas? | Chips multi (skippable) | `skin_allergies` |
| 4 | Quantos produtos usas por dia? | Slider visual 0-7+ | `routine_steps` |
| 5 | Qual o teu objectivo nos próximos 3 meses? | Cards single (5 opções) | `skincare_goal` |
| 6 | E o cabelo? (opcional) | Cards single 5 tipos | `hair_type` |

**Recompensa:**
- Cada step respondida = **+10 pts** (60 pts total se tudo respondido)
- Bónus de **+40 pts** ao chegar ao fim (100 pts total = primeiro tier "BUD")
- Toast ao terminar: "Acabaste o quiz! Já tens 100 pts — podes resgatar um brinde"

**Implementação:** modal full-screen no demo.html (não página separada). Estado guardado em memória + saved no submit ao Supabase via batch update.

---

## 4. Avatars

**Fase 1 (agora, esta sessão):**
- **Pré-definidos:** 24 SVGs no estilo Claude Design Artifact (paleta lilás/azul/amarelo). Foco em variedade — mulher/homem/non-binary, várias cores de pele, alguns com óculos, alguns com cabelo curto/longo. Servidos de `/avatars/preset-{01..24}.svg`.
- **DiceBear:** lib JS embedded. Estilos a oferecer: `avataaars`, `adventurer`, `lorelei`, `notionists`, `personas`. Utilizador escolhe estilo + seed (string aleatória). Avatar guardado como `dicebear:lorelei:tomas-2026`.

**Fase 2 (depois, talvez Q3):**
- AI photo upload via Replicate `fofr/face-to-many` ou OpenAI `gpt-image-1`
- Custo estimado: ~€0.03–0.05/geração
- GDPR: foto da pessoa = dado biométrico sensível. Precisamos de consentimento explícito + apagar a foto original após gerar.
- **Não fazer até termos uma política de privacidade séria.**

---

## 5. Pontos — wiring real

Actualmente todos os users têm `0 pts` static na nav. Após implementar isto:

- Header nav mostra `${profiles.points} pts` (fetch ao carregar página)
- Carrinho ao finalizar pode resgatar pts em brindes (250pts/400pts/600pts já definidos no UI)
- Quiz dá pts (60+40=100)
- Mais pts no futuro: review de produto (+5), partilhar referral (+50), aniversário (+100), comprar via afiliado (+5%)

---

## Ordem de execução (próxima sessão, ~3-4h focadas)

1. **Migration Supabase** (15 min) — paste SQL no dashboard, verificar trigger funciona criando user de teste
2. **Account page bones** (45 min) — HTML/CSS dos 5 tabs, sem form submit ainda
3. **Form submit + Supabase wiring** (45 min) — fetch GET/PATCH com JWT, error handling
4. **Avatars pré-definidos** (30 min) — 24 SVGs, grid picker
5. **DiceBear lib** (15 min) — embedded, 5 estilos, seed randomizer
6. **Onboarding quiz modal** (60 min) — 6 steps, animações, recompensa, save batch
7. **Pontos wiring** (15 min) — fetch points, update nav badge, toast on quiz reward
8. **Testar** (30 min) — signup novo, completar quiz, verificar pts, editar perfil

---

## Decisões a confirmar ANTES de começar

1. Confirmas o schema da tabela `profiles` em cima? (mais um campo que falta? algum chave a remover?)
2. **Distrito** PT-01..PT-30 ou cidade livre (texto)? PT codes são oficiais ISO mas dropdown longo.
3. **Notificações Telegram** já trabalhamos hoje ou parqueamos para fase 3 com push?
4. **Pontos por quiz**: 100 total ou ajustar?
5. Há mais alguma coisa que viste hoje e queres mudar antes desta sessão?
