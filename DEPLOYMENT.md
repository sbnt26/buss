# 🚀 Deployment Guide

Kompletní návod pro nasazení WhatsApp Invoice aplikace na VPS.

## 📋 Předpoklady

### Lokální vývoj
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (nebo použijte Docker)
- Git

### Produkční VPS
- Ubuntu 22.04 LTS (nebo podobný Linux)
- Docker & Docker Compose nainstalované
- 2+ GB RAM
- 20+ GB disk space
- Doménové jméno s DNS nastavením

## 🏗️ Lokální vývoj

### 1. Naklonujte repozitář

\`\`\`bash
git clone <repository-url>
cd buss
\`\`\`

### 2. Nainstalujte dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Vytvořte .env.local

\`\`\`bash
cp .env.example .env.local
\`\`\`

Upravte \`.env.local\` a vyplňte:
- \`DATABASE_URL\` - connection string
- \`SESSION_SECRET\` - náhodný secret (min 32 znaků)

### 4. Spusťte databázi

\`\`\`bash
docker compose --profile dev up -d db
\`\`\`

### 5. Spusťte migrace

\`\`\`bash
# Pokud používáte Docker databázi:
docker compose exec db psql -U invoicer -d invoicer_dev -f /docker-entrypoint-initdb.d/001_initial_schema.sql

# Nebo lokálně:
psql -U your_user -d invoicer_dev -f migrations/001_initial_schema.sql
\`\`\`

### 6. Spusťte vývojový server

\`\`\`bash
npm run dev
\`\`\`

Aplikace běží na http://localhost:3000

## 🌐 Produkční nasazení na VPS

### 1. Příprava VPS

#### Instalace Dockeru

\`\`\`bash
# Aktualizace systému
sudo apt update && sudo apt upgrade -y

# Instalace Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalace Docker Compose
sudo apt install docker-compose-plugin -y

# Restart shellu pro aplikaci group changes
exit  # a znovu se přihlaste
\`\`\`

### 2. Nahrání kódu na VPS

#### Varianta A: Git clone

\`\`\`bash
git clone <repository-url> /opt/invoicer
cd /opt/invoicer
\`\`\`

#### Varianta B: SCP/RSYNC

\`\`\`bash
# Lokálně:
rsync -avz --exclude 'node_modules' --exclude '.next' . user@your-vps:/opt/invoicer/
\`\`\`

### 3. Vytvoření .env.production

\`\`\`bash
cd /opt/invoicer
cp .env.example .env.production
\`\`\`

Upravte \`.env.production\`:

\`\`\`bash
# Database
DATABASE_NAME=invoicer_prod
DATABASE_USER=invoicer
DATABASE_PASSWORD=<strong-random-password>
DATABASE_URL=postgresql://invoicer:<password>@db:5432/invoicer_prod

# Application
NODE_ENV=production
PORT=3000

# Authentication (CRITICAL - use strong random secrets)
SESSION_SECRET=<generate-random-64-char-string>
JWT_EXPIRES_IN=7d

# WhatsApp Cloud API (if using)
WHATSAPP_PHONE_NUMBER_ID=<your-phone-number-id>
WHATSAPP_ACCESS_TOKEN=<your-access-token>
WHATSAPP_APP_SECRET=<your-app-secret>
WHATSAPP_BUSINESS_ACCOUNT_ID=<your-business-account-id>


# File Storage
UPLOAD_DIR=./uploads/invoices

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
WHATSAPP_RATE_LIMIT_PER_MINUTE=10
\`\`\`

**Generování secrets:**

\`\`\`bash
# Session secret (64 znaků)
openssl rand -base64 48

# Pro WhatsApp webhook secret
openssl rand -hex 32
\`\`\`

### 4. Nastavení domény v Caddyfile

`Caddyfile` je už přizpůsobený pro `bussapp.cz` (včetně přesměrování z `www`).
Pokud potřebujete staging nebo jinou doménu, naklonujte blok a upravte jej podle potřeby.

### 5. Nasazení aplikace

\`\`\`bash
# Validace environment variables
node scripts/validate-env.js production

# Deploy (automatizovaný skript)
./scripts/deploy.sh
\`\`\`

Nebo manuálně:

\`\`\`bash
# Build a start
docker compose --profile prod build
docker compose --profile prod up -d

# Sledování logů
docker compose --profile prod logs -f app
\`\`\`

### 6. Kontrola zdraví služeb

\`\`\`bash
# Zkontrolujte běžící kontejnery
docker compose --profile prod ps

# Health check
curl http://localhost:3000/api/health

# Logy
docker compose logs app
docker compose logs db
docker compose logs caddy
\`\`\`

### 7. Konfigurace firewall

\`\`\`bash
# UFW firewall
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
\`\`\`

## 🔐 Zabezpečení

### 1. SSL/TLS

Caddy automaticky získá Let's Encrypt certifikáty pro vaši doménu.

### 2. Firewall

Ujistěte se, že jsou otevřené pouze porty 80, 443, a 22 (SSH).

### 3. Secrets management

- **NIKDY** necommitujte \`.env.production\` do gitu
- Používejte silná hesla (min 32 znaků)
- Rotujte secrets pravidelně (každých 90 dní)

### 4. Updates

\`\`\`bash
# Aktualizace systému
sudo apt update && sudo apt upgrade -y

# Aktualizace Docker images
docker compose pull
docker compose up -d
\`\`\`

## 💾 Zálohy

### Automatické zálohy (cron)

\`\`\`bash
# Nastavení automatických záloh (2 AM denně)
./scripts/setup-cron.sh

# Vytvoření zálohy manuálně
./scripts/backup-db.sh

# Zálohy se ukládají do ./backups/
# Automaticky se mažou zálohy starší než 30 dní
\`\`\`

### Obnova z zálohy

\`\`\`bash
# Seznam záloh
ls -lh backups/

# Obnova
./scripts/restore-db.sh backups/invoicer_backup_20250115_120000.sql.gz
\`\`\`

### S3 zálohy (volitelné)

Pro dlouhodobé ukládání můžete nastavit AWS S3:

\`\`\`bash
# Instalace AWS CLI
sudo apt install awscli -y
aws configure

# Upload zálohy
aws s3 cp backups/invoicer_backup_$(date +%Y%m%d).sql.gz s3://your-bucket/backups/
\`\`\`

## 📊 Monitoring

### Logy

\`\`\`bash
# Aplikační logy
docker compose logs -f app

# Databázové logy
docker compose logs -f db

# Všechny logy
docker compose logs -f
\`\`\`

### Health checks

\`\`\`bash
# Aplikace
curl http://localhost:3000/api/health

# Databáze
docker compose exec db pg_isready -U invoicer
\`\`\`

### Resource usage

\`\`\`bash
# Docker stats
docker stats

# Disk usage
df -h
du -sh /opt/invoicer/*
\`\`\`

## 🔄 CI/CD (volitelné)

### GitHub Actions

Vytvořte \`.github/workflows/deploy.yml\`:

\`\`\`yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: \${{ secrets.VPS_HOST }}
          username: \${{ secrets.VPS_USER }}
          key: \${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/invoicer
            git pull origin main
            ./scripts/deploy.sh
\`\`\`

## 🐛 Troubleshooting

### Aplikace nejede

\`\`\`bash
# Zkontrolujte logy
docker compose logs app

# Restart
docker compose restart app
\`\`\`

### Database connection errors

\`\`\`bash
# Zkontrolujte, že DB běží
docker compose ps db

# Test připojení
docker compose exec db psql -U invoicer -d invoicer_prod -c "SELECT 1;"
\`\`\`

### PDF generování nefunguje

```bash
# Restartujte aplikaci (obnoví headless Chromium)
docker compose restart app

# Sledujte logy pro Puppeteer chyby
docker compose logs app | grep -i puppeteer
```
### Nedostatečná paměť

\`\`\`bash
# Zkontrolujte paměť
free -h

# Vyčistěte Docker
docker system prune -a

# Přidejte swap (pokud nemáte)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
\`\`\`

## 📱 WhatsApp Setup (volitelné)

1. Vytvořte Meta Business Account
2. Přidejte WhatsApp Business App
3. Získejte credentials (Phone Number ID, Access Token)
4. Nastavte webhook URL: \`https://bussapp.cz/api/wa/webhook\`
5. Ověřte webhook s verify tokenem
6. Přidejte credentials do \`.env.production\`

Detaily v [DOCS/02_Backend_Implementation.md](DOCS/02_Backend_Implementation.md)

## 📚 Další dokumentace

- [API Specification](DOCS/08_API_Spec.md)
- [Database Schema](DOCS/09_Database_Schema.md)
- [Environment Variables](DOCS/10_Environment_Variables.md)
- [Testing Strategy](DOCS/12_Testing_Strategy.md)

## 🆘 Podpora

V případě problémů:
1. Zkontrolujte logy: \`docker compose logs -f\`
2. Ověřte health check: \`curl localhost:3000/api/health\`
3. Přečtěte si troubleshooting sekci výše
4. Otevřete issue na GitHubu



