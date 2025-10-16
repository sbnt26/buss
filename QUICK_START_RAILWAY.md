# 🚂 Railway Quick Start

## ⚡ 5 minut k nasazení

### 1. Instaluj Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login

```bash
railway login
```

### 3. Vytvoř projekt

```bash
railway init
# Zadej název: invoicer-app
```

### 4. Přidej PostgreSQL

```bash
railway add
# Vyber: PostgreSQL
```

### 5. Nastav environment variables

```bash
railway variables set SESSION_SECRET=$(openssl rand -base64 48)
railway variables set JWT_EXPIRES_IN=7d
railway variables set NODE_ENV=production
```

### 6. Spusť migrace

```bash
# Připoj se k databázi
railway connect postgres

# V psql konzoli spusť:
\i migrations/001_initial_schema.sql
\q
```

### 7. Deploy

**Varianta A - Railway CLI:**
```bash
railway up
```

**Varianta B - GitHub (doporučeno):**
```bash
# Push do GitHubu
git add .
git commit -m "Initial Railway setup"
git push

# V Railway dashboard:
# Settings → Connect GitHub Repository
```

### 8. Získej URL

```bash
railway domain
# Nebo v dashboard: Settings → Domains
```

---

## 💻 Lokální vývoj

### S Railway databází:
```bash
railway run npm run dev
```

### S lokální Docker DB:

1. Vytvoř `.env.local`:
```bash
DATABASE_URL=postgresql://invoicer:password@localhost:5432/invoicer_dev
SESSION_SECRET=dev_secret_min_32_chars
NODE_ENV=development
```

2. Spusť Docker DB:
```bash
./scripts/setup-dev-db.sh
```

3. Vyvíjej normálně:
```bash
npm run dev
```

---

## 🔧 Užitečné příkazy

```bash
# Logy
railway logs

# Dashboard
railway open

# Připojení k DB
railway connect postgres

# Seznam variables
railway variables

# Změna projektu
railway link
```

---

## ✅ Done!

Tvoje aplikace běží na Railway! 🎉

Kompletní návod: `RAILWAY_SETUP.md`
