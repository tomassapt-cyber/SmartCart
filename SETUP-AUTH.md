# Setup auth + notificações — 15 min

## 1) Supabase (5 min)

1. Vai a https://supabase.com → **Start your project** → cria conta com GitHub ou email.
2. **New project**:
   - Name: `smartcart`
   - Region: **West EU (Ireland)** ← mais perto de PT
   - Database password: gera + guarda num gestor de palavras-passe
   - Plan: Free
3. Espera 2 min até "Setting up project…" terminar.
4. Vai a **Settings → API**:
   - Copia **Project URL** (algo como `https://xxxxxxxxxxxx.supabase.co`)
   - Copia **anon public** key (chave longa começada por `eyJ…`)

## 2) Serviço de email para os avisos de registo (3 min)

> [2026-07-29] Isto era um bot de Telegram, com o token colado dentro do SQL.
> Passou a ser **email**, e a chave deixou de ir para dentro do código: fica no
> cofre (Vault) do Supabase, cifrada. O corpo de uma função lê-se no dashboard
> e em qualquer backup — nunca é sítio para uma chave.

1. Cria conta em **resend.com** (gratuita — 3.000 emails/mês).
2. Em **API Keys** → *Create API Key* → copia a chave (começa por `re_`).
3. Não precisas de domínio próprio: enquanto não verificares um, o Resend deixa
   enviar do remetente de teste `onboarding@resend.dev` **para o email com que
   te registaste**. É esse que vais usar no passo seguinte.

## 3) Correr o SQL no Supabase

1. Copia `database/schema-supabase.sql` **todo** — já não há nada para
   substituir à mão.
2. No Supabase → **SQL Editor** → **New query** → cola → **Run** (canto inferior direito).
3. Verifica em **Table Editor** que aparecem 3 tabelas: `profiles`, `routine_products`, `routine_actions`.
4. Guarda os segredos do email, uma vez só, numa query nova:

   ```sql
   select vault.create_secret('re_a_tua_chave_aqui', 'resend_api_key');
   select vault.create_secret('tu@exemplo.com',      'signup_notify_email');
   ```

   Se saltares este passo nada rebenta — o registo funciona na mesma, só não
   recebes o aviso. Podes fazê-lo mais tarde.

## 4) Configurar a app

1. Abre `demo.html` no editor.
2. Procura por `SUPABASE_URL = ''` (linha ~3340) e cola o teu Project URL.
3. Procura por `SUPABASE_ANON_KEY = ''` (linha seguinte) e cola a anon key.
4. Guarda o ficheiro.

## 5) Configurar email do Supabase (importante — senão os emails ficam em rate-limit)

Por defeito, Supabase usa o seu próprio servidor SMTP que tem limite de **3 emails/hora**. Para produção, define o teu SMTP:

- **Free fix temporário**: vai a **Authentication → Providers → Email** e desactiva "Confirm email" — assim os users não precisam de confirmar email. Útil para testes; reactiva antes de lançar a sério.
- **Para lançamento real**: vai a **Authentication → Email Templates → SMTP Settings** e configura com [Resend](https://resend.com) (free 3k emails/mês) ou [Brevo](https://brevo.com).

## 6) Testar (1 min)

1. Abre `demo.html` no browser.
2. Clica no ícone de perfil (silhueta) no header.
3. **Sign up** com email + password.
4. Em poucos segundos deves receber um email com assunto "CosMath — novo registo: …".
5. Volta ao demo.html → vais ver o teu perfil criado e a poder adicionar produtos.
6. Refresh da página → continua login (sessão guardada em localStorage).

## Troubleshooting

**"failed to fetch" ao fazer signup**
→ Verifica que copiaste a URL e a anon key sem espaços.
→ Verifica em **Authentication → URL Configuration → Site URL**: deve ser onde estás a abrir o demo (ex: `http://localhost:8080` ou `file://...`). Para teste local rápido, podes adicionar `*` em **Redirect URLs** (não fazer em produção).

**Não recebes o email de aviso**
→ Confirma que os segredos existem: `select name from vault.secrets order by name;` — têm de aparecer `resend_api_key` e `signup_notify_email`.
→ Vê **Logs → Postgres Logs**: a função escreve lá um `warning` a dizer o que correu mal (não consegue ler o cofre, o Resend recusou, etc.).
→ Vê o painel do Resend em **Emails**: mostra entregas e recusas com o motivo.
→ Enquanto não verificares um domínio teu no Resend, o destino **tem** de ser o email da tua conta Resend — para outros endereços eles recusam.
→ O registo do utilizador nunca falha por causa disto: se o aviso não sair, a conta é criada na mesma.

**Quero apagar tudo e recomeçar**
→ SQL Editor: `drop schema public cascade; create schema public;` (DESTRÓI tudo). Depois corre o schema-supabase.sql de novo.

## O que está guardado e onde

- **Auth (email + password hash + session)**: `auth.users` — gerido pelo Supabase, não tocas
- **Perfil de skincare**: `public.profiles`
- **Rotina**: `public.routine_products`
- **Log de ações**: `public.routine_actions` (para análises futuras)

Tudo em PostgreSQL real, em servidor europeu (GDPR), encriptado at-rest.
