# Nastavení Databáze v Railway

## 1. Přidání PostgreSQL

### Přes Railway Dashboard:
1. Otevřete https://railway.app/project/b61b8be2-abe6-4dbf-b06e-a9b979f6c966
2. Klikněte **"+ New"**
3. Vyberte **"Database"** → **"Add PostgreSQL"**
4. Railway automaticky propojí databázi s aplikací

### Přes Railway CLI:
```bash
railway add
# Vyberte: PostgreSQL
```

## 2. Ověření připojení

Zkontrolujte, že `DATABASE_URL` je nastavena:
```bash
railway variables
```

## 3. Spuštění migrací

Po přidání databáze spusťte migrace:

```bash
# Připojte se k Railway prostředí
railway run bash

# Spusťte migrace
bash run-migrations.sh

# Nebo přímo:
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_add_bank_account_to_organizations.sql
```

## 4. Ověření databáze

```bash
# Připojte se k databázi
railway run psql $DATABASE_URL

# Zkontrolujte tabulky
\dt

# Ověřte strukturu
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

## 5. Nastavení SESSION_SECRET

Vygenerujte náhodný string (min 32 znaků):
```bash
openssl rand -base64 32
```

Nastavte v Railway:
```bash
railway variables set SESSION_SECRET="<vygenerovany-string>"
```

## 6. Redeploy

```bash
railway up
```

## Řešení problémů

### Databáze se nepřipojuje
- Zkontrolujte `railway variables` že obsahuje `DATABASE_URL`
- Zkontrolujte logy: `railway logs`

### Migrace selhaly
```bash
# Připojte se k databázi a zkontrolujte stav
railway run psql $DATABASE_URL
\dt
```

### Health check selhává
- Zkontrolujte `/api/health` endpoint
- Měl by vracet `{ status: 'healthy', services: { database: 'ok' } }`

