# Setup GitHub Actions — 10 min

## 1. Tornar repo público (1 clique)

1. Vai ao teu repositório no GitHub
2. **Settings** → scroll até ao fim → **Danger Zone**
3. Clica **"Change repository visibility"** → escolhe **Public**
4. Confirma com o nome do repo

Porquê: minutos ilimitados de GitHub Actions (vs 2000/mês em repo private).

## 2. Verificar `.gitignore` (importante!)

Garante que estes ficheiros **nunca** vão para o repo:

```
data/.scrapingbee.key
data/.*.key
.env
.env.local
node_modules/
```

Já está em `.gitignore`. Mas confirma:

```bash
git check-ignore data/.scrapingbee.key
# deve devolver: data/.scrapingbee.key
```

## 3. Adicionar Secrets (3 chaves)

GitHub UI:
1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** para cada uma:

| Nome | Valor |
|---|---|
| `SCRAPINGBEE_KEY` | a tua chave ScrapingBee (a longa que começa por `RLX4...`) |
| `SUPABASE_URL` | `https://sqjtkwtoaudmfmexreqk.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` (a tua anon key) |

Os secrets ficam **encriptados** — nem tu, depois de guardar, vês o valor outra vez. Só os runners do GitHub conseguem ler.

## 4. Verificar package.json

Os scripts precisam de Node + npm packages. O CI faz `npm install playwright jsdom`, mas para correr localmente vais querer um `package.json`:

```bash
cd C:\Users\Tomas\Desktop\Cosmetics

# Se não existe ainda
npm init -y

# Adicionar dependências
npm install playwright jsdom
```

Confirma que `package.json` ficou no repo (sem `node_modules/`).

## 5. Push das changes

```bash
git add .github/ scripts/scrape-prices.js scripts/ingest-scraped.js .gitignore SETUP-CI.md
git commit -m "feat: GitHub Actions daily + weekly scrape"
git push
```

## 6. Testar o workflow manualmente

GitHub UI:
1. Repo → **Actions** tab
2. Sidebar esquerda → escolhe **"Daily price scrape"**
3. Botão direito **"Run workflow"** → seleccionar branch `main` → **Run workflow**
4. Espera ~30-60min
5. Vê o output em tempo real (logs por step)

Se correr OK, deve aparecer um commit novo do `smartcart-bot` com os preços actualizados.

## 7. Cron automático

A partir do momento que o workflow está commitado, o cron arranca sozinho:

- **Daily diff scrape**: todos os dias às 04h00 Lisboa
- **Weekly full scrape**: domingos às 03h00 Lisboa

Não precisas de fazer nada. Vais receber email do GitHub se algum corrida falhar.

## Troubleshooting

### "Resource not accessible by integration"
→ Workflow não tem `permissions: contents: write`. Já está nos YAMLs que escrevi.

### "ScrapingBee 401 unauthorized"
→ Secret `SCRAPINGBEE_KEY` está errado ou expirou. Verifica em https://app.scrapingbee.com/dashboard/account/.

### "Timeout after 5400s"
→ Scrape demorou mais que 90min. Reduz scope: aumenta `--max-age=48h` para refrescar menos vezes.

### "Nothing to commit"
→ Tudo bem. Significa que nenhum preço mudou desde a última vez.

### Quero ver os logs detalhadamente
→ Actions tab → escolhe a run → expande cada step. Está tudo visível (output do scrape, ingest, build).

## Custos

| Recurso | Custo |
|---|---|
| GitHub Actions (repo público) | **€0** |
| ScrapingBee (Hobby) | até ~1000 reqs/mês grátis, ~€49/mês depois |
| Supabase Free | **€0** até 50k MAU |
| Vercel Free | **€0** até 100GB bandwidth/mês |

Daily refresh consome ~50 PDPs WAF × 25 cred = **1250 créditos/dia × 30 = 37.500/mês**. Excede free tier. Soluções:

1. Restringe ScrapingBee só ao "diff" (produtos stale) → ~80% menos
2. Awin feeds para Notino/Sephora/Douglas/Atida → 0 créditos
3. Plano ScrapingBee Hobby €49 = 250.000 créditos/mês

Recomendação: começa free, vê quanto credit usas em 1 semana, depois decides.
