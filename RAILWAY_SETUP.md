# 🚂 Railway Setup Guide

Kompletní návod pro nasazení aplikace na Railway s lokálním vývojem.

## 📋 Prerekvizity

- Node.js 20+
- Git
- Railway account (zdarma na [railway.app](https://railway.app))

## 🚀 Krok za krokem

### 1. Instalace Railway CLI

```bash
npm install -g @railway/cli
```

Nebo pomocí Homebrew (macOS):
```bash
brew install railway
```

### 2. Login do Railway

```bash
railway login
```

Otevře se prohlížeč pro autorizaci. Po přihlášení se vrať do terminálu.

### 3. Inicializace projektu

```bash
# V rootu projektu
cd /Users/samuelbenett/Documents/Business/BussApp/buss

# Vytvoř nový Railway projekt
railway init

# Zadej název projektu, např: "invoicer-app"
```

### 4. Přidání PostgreSQL databáze

```bash
# Přidej PostgreSQL addon
railway add

# Vyber: PostgreSQL
# Railway automaticky vytvoří databázi a nastaví DATABASE_URL
```

### 5. Nastavení Environment Variables

```bash
# Otevře Railway dashboard
railway open

# Nebo přidej variables přímo z CLI:
railway variables set SESSION_SECRET=$(openssl rand -base64 48)
railway variables set JWT_EXPIRES_IN=7d
railway variables set NODE_ENV=production
railway variables set UPLOAD_DIR=/app/uploads
```

### 7. Database migrations

Railway automaticky spustí migrace při deployi díky `package.json` scriptům.

Nebo můžeš spustit manuálně:

```bash
# Připoj se k Railway databázi
railway connect postgres

# V psql konzoli:
\i migrations/001_initial_schema.sql
\q
```

### 8. Přidej vlastní doménu

1. V Railway dashboardu otevři **Settings → Domains**.
2. Klikni **Add Custom Domain** a zadej `bussapp.cz`.
3. Přidej i `www.bussapp.cz` (pokud chceš přesměrování na hlavní doménu).
4. Railway zobrazí DNS záznamy (CNAME/ALIAS). Zanes je u registrátora a počkej na propagaci.
5. Jakmile se stav změní na **Verified**, je doména připravena.
6. Ujisti se, že v sekci Variables máš `NEXT_PUBLIC_APP_URL=https://bussapp.cz`, případně další produkční proměnné (WhatsApp/Messenger, SESSION_SECRET, DATABASE_URL). Změna spustí redeploy.
7. Po nasazení otestuj dostupnost: `curl -I https://bussapp.cz/api/health` a otevři `https://bussapp.cz` v prohlížeči.

### 9. První deploy

```bash
# Railway automaticky detekuje Next.js a nasadí
railway up

# Nebo z GitHubu (doporučeno):
# 1. Push do GitHubu
git add .
git commit -m "Initial commit"
git push

# 2. V Railway dashboard připoj GitHub repo
# Settings → Connect GitHub Repository
```

### 10. Získání URL aplikace

```bash
# Railway ti přidělí doménu
railway domain

# Nebo přidej vlastní doménu
# V Railway dashboard: Settings → Domains → Add Custom Domain
```

## 💻 Lokální vývoj s Railway

### Varianta A: Railway databáze remote

```bash
# Spusť app lokálně s Railway environment variables
railway run npm run dev

# Otevři http://localhost:3000
# Používá Railway PostgreSQL databázi
```

### Varianta B: Lokální databáze + Railway pro deploy

Vytvoř `.env.local` pro lokální vývoj:

```bash
# .env.local (gitignored)
DATABASE_URL=postgresql://invoicer:invoicer_dev@localhost:5432/invoicer_dev
SESSION_SECRET=local_dev_secret_32_chars_minimum
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

Spusť lokální databázi:
```bash
# Docker
docker run -d \
  --name invoicer-db \
  -e POSTGRES_USER=invoicer \
  -e POSTGRES_PASSWORD=invoicer_dev \
  -e POSTGRES_DB=invoicer_dev \
  -p 5432:5432 \
  postgres:16-alpine

# Migrace
docker exec -i invoicer-db psql -U invoicer -d invoicer_dev < migrations/001_initial_schema.sql
```

Normální vývoj:
```bash
npm run dev
```

Deploy na Railway:
```bash
git push  # Automatický deploy
# nebo
railway up
```

## 🔧 Railway specifické konfigurace

### railway.json (volitelné)

Vytvoř `railway.json` pro pokročilé nastavení:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### nixpacks.toml (volitelné)

Pro pokročilé build nastavení:

```toml
[phases.setup]
nixPkgs = ["nodejs-20_x", "postgresql"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

## 📊 Monitorování

### Logy

```bash
# Sleduj logy v reálném čase
railway logs

# Nebo v dashboard
railway open
# → Záložka "Deployments" → Klikni na deployment → "View Logs"
```

### Metriky

V Railway dashboard:
- CPU usage
- Memory usage
- Network traffic
- Request count

## 🔄 Automatický deploy

Railway podporuje automatický deploy z GitHubu:

1. **Push triggered deploy:**
   ```bash
   git push origin main
   # → Railway automaticky nasadí novou verzi
   ```

2. **Preview deployments:**
   - Pull requesty automaticky dostanou preview URL
   - Každá branch může mít vlastní deploy

## 💾 Database backups

Railway automaticky zálohuje PostgreSQL:
- Denní automatické backups
- 7 dní retention na Hobby plánu
- 14 dní retention na Pro plánu

### Manuální backup:

```bash
# Export databáze
railway connect postgres
pg_dump invoicer_prod > backup.sql

# Nebo použij Railway CLI
railway run pg_dump $DATABASE_URL > backup.sql
```

### Restore:

```bash
railway connect postgres
# V psql:
\i backup.sql
```

## 🐛 Troubleshooting

### Build fails

```bash
# Zkontroluj logy
railway logs

# Zkontroluj Node.js verzi v package.json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Database connection errors

```bash
# Ověř DATABASE_URL
railway variables

# Test connection
railway run node -e "console.log(process.env.DATABASE_URL)"
```

### Environment variables

```bash
# Seznam všech variables
railway variables

# Přidej novou
railway variables set KEY=value

# Smaž
railway variables delete KEY
```

## 💰 Ceny

### Hobby Plan (Starter)
- **$5/měsíc** - $5 free credit pro první měsíc
- PostgreSQL included
- 500 GB egress
- Komunita podpora

### Pro Plan
- **$20/měsíc** per user
- Více resources
- Priority support
- Team features

### Pay-as-you-go
- Platíš pouze za použití
- $0.000463 per GB-hour (compute)
- $0.25 per GB (egress)

## 📚 Další zdroje

- [Railway Docs](https://docs.railway.app/)
- [Railway Templates](https://railway.app/templates)
- [Railway Discord](https://discord.gg/railway)

## 🎯 Quick Commands

```bash
# Lokální vývoj s Railway env
railway run npm run dev

# Deploy
railway up

# Logy
railway logs

# Otevři dashboard
railway open

# Connect to database
railway connect postgres

# Seznam variables
railway variables

# Změň projekt
railway link
```

## ✅ Checklist před prvním deployem

- [ ] Railway CLI nainstalované
- [ ] Login do Railway (`railway login`)
- [ ] Projekt inicializovaný (`railway init`)
- [ ] PostgreSQL přidaná (`railway add`)
- [ ] Environment variables nastavené
- [ ] GitHub repo připojené (nebo `railway up`)
- [ ] Migrace spuštěné
- [ ] Aplikace běží na Railway URL

---

**Happy deploying! 🚀**


