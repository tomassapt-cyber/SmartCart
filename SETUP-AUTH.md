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

## 2) Telegram bot (3 min)

1. Abre Telegram no telemóvel → procura **@BotFather** → conversa.
2. Envia `/newbot` → escolhe nome (ex: `SmartCart Notifier`) e username (tem de acabar em `bot`, ex: `smartcart_notifier_bot`).
3. Recebes mensagem com **token** — algo como `1234567890:AAExxxxxxxxxxxxxxxxxxxxxxx`. Copia.
4. Procura **@userinfobot** → `/start` → diz-te o teu **chat id** (número, ex: `123456789`).

## 3) Correr o SQL no Supabase

1. Abre `database/schema-supabase.sql` no editor.
2. Faz **find & replace**:
   - `{{TELEGRAM_BOT_TOKEN}}` → cola o teu token (mantém as plicas: `'1234567890:AAE...'`)
   - `{{TELEGRAM_CHAT_ID}}` → cola o teu chat_id (também com plicas: `'123456789'`)
3. Copia o SQL **todo** (já com os valores substituídos).
4. No Supabase → **SQL Editor** → **New query** → cola → **Run** (canto inferior direito).
5. Verifica em **Table Editor** que aparecem 3 tabelas: `profiles`, `routine_products`, `routine_actions`.

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
4. Em 1-2 segundos deves receber notificação no Telegram: "🌸 Novo registo no SmartCart!".
5. Volta ao demo.html → vais ver o teu perfil criado e a poder adicionar produtos.
6. Refresh da página → continua login (sessão guardada em localStorage).

## Troubleshooting

**"failed to fetch" ao fazer signup**
→ Verifica que copiaste a URL e a anon key sem espaços.
→ Verifica em **Authentication → URL Configuration → Site URL**: deve ser onde estás a abrir o demo (ex: `http://localhost:8080` ou `file://...`). Para teste local rápido, podes adicionar `*` em **Redirect URLs** (não fazer em produção).

**Não recebes Telegram**
→ Verifica no **SQL Editor → Database → Functions**: clica em `notify_telegram_on_signup` → vê se os tokens estão lá.
→ Vai a **Database → Webhooks** ou **Logs → Postgres Logs** para ver se há erros.
→ Confirma que falaste com o bot pelo menos 1x (envia-lhe `/start` no Telegram, senão ele não pode enviar-te mensagens).

**Quero apagar tudo e recomeçar**
→ SQL Editor: `drop schema public cascade; create schema public;` (DESTRÓI tudo). Depois corre o schema-supabase.sql de novo.

## O que está guardado e onde

- **Auth (email + password hash + session)**: `auth.users` — gerido pelo Supabase, não tocas
- **Perfil de skincare**: `public.profiles`
- **Rotina**: `public.routine_products`
- **Log de ações**: `public.routine_actions` (para análises futuras)

Tudo em PostgreSQL real, em servidor europeu (GDPR), encriptado at-rest.
