# Deployment Guide
**Date:** 2025-10-15

## Overview
Step-by-step guide to deploy BussApp MVP on a VPS (Ubuntu 22.04+) using Docker Compose with Caddy for HTTPS.

## Prerequisites

### VPS Requirements
- **OS:** Ubuntu 22.04 LTS or newer
- **RAM:** Minimum 2GB, recommended 4GB
- **CPU:** 2 cores minimum
- **Storage:** 20GB+ SSD
- **Network:** Public IP with ports 80, 443 open

### Domain & DNS
- Domain name pointing to VPS IP (e.g., `invoicer.company.com`)
- A record: `invoicer.company.com → YOUR_VPS_IP`

### WhatsApp Business API
- Meta Business Account
- WhatsApp Business App created in Meta Developer Portal
- Phone Number added and verified
- Access Token (long-lived)
- App Secret for webhook signature validation

## Step 1: Initial VPS Setup

### 1.1 Connect to VPS
```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Update system
```bash
apt update && apt upgrade -y
```

### 1.3 Create app user
```bash
adduser invoicer
usermod -aG sudo invoicer
su - invoicer
```

### 1.4 Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### 1.5 Install Git
```bash
sudo apt install git -y
```

## Step 2: Clone Repository

```bash
cd /home/invoicer
git clone https://github.com/your-org/whatsapp-invoicer.git app
cd app
```

## Step 3: Configuration

### 3.1 Create environment file
```bash
cp .env.example .env.production
nano .env.production
```

Fill in all required variables (see `10_Environment_Variables.md`):
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://bussapp.cz
DATABASE_URL=postgresql://invoicer:STRONG_PASSWORD@db:5432/invoicer_prod
DATABASE_USER=invoicer
DATABASE_PASSWORD=STRONG_PASSWORD
DATABASE_NAME=invoicer_prod
SESSION_SECRET=GENERATE_WITH_openssl_rand_hex_32
WHATSAPP_ACCESS_TOKEN=YOUR_TOKEN
# ... etc
```

### 3.2 Generate secrets
```bash
# Generate SESSION_SECRET
openssl rand -hex 32

# Generate WHATSAPP_VERIFY_TOKEN
openssl rand -hex 16

# Generate DATABASE_PASSWORD (if you don't set it manually)
openssl rand -hex 24
```

### 3.3 Set file permissions
```bash
chmod 600 .env.production
```

## Step 4: Docker Compose Setup

### 4.1 Create docker-compose.yml
```yaml
version: '3.9'

services:
  # PostgreSQL Database
  db:
    image: postgres:16-alpine
    container_name: invoicer-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DATABASE_NAME}
      POSTGRES_USER: ${DATABASE_USER}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups/db:/backups
    networks:
      - invoicer-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Next.js Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    container_name: invoicer-app
    restart: unless-stopped
    env_file:
      - .env.production
    volumes:
      - ./data/invoices:/data/invoices
      - ./logs:/app/logs
    networks:
      - invoicer-network
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Caddy Reverse Proxy (HTTPS)
  caddy:
    image: caddy:2-alpine
    container_name: invoicer-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - invoicer-network
    depends_on:
      - app

networks:
  invoicer-network:
    driver: bridge

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

### 4.2 Create Caddyfile
```bash
nano Caddyfile
```

```
invoicer.company.com {
    reverse_proxy app:3000
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    
    # Rate limiting
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 100
            window 1m
        }
    }
    
    # Logging
    log {
        output file /data/access.log
        format json
    }
}
```

### 4.3 Create Dockerfile
```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Builder
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=deps /app/node_modules ./node_modules

# Create data directories
RUN mkdir -p /data/invoices && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 4.4 Create necessary directories
```bash
mkdir -p data/invoices logs backups/db backups/files
```

## Step 5: Database Migration

> **Tip:** Načtěte si hodnoty z `.env.production` do shellu (`set -a; source .env.production; set +a`), aby příkazy používající proměnné `DATABASE_*` fungovaly bez úprav.

### 5.1 Start database only
```bash
docker compose up -d db
```

### 5.2 Run migrations
```bash
# Copy migration SQL files to container
docker cp ./migrations/001_initial_schema.sql invoicer-db:/tmp/

# Execute migrations
docker exec -i invoicer-db psql -U "$DATABASE_USER" "$DATABASE_NAME" < ./migrations/001_initial_schema.sql
```

Or use migration tool:
```bash
docker compose run --rm app npm run migrate
```

## Step 6: Build & Start Application

```bash
# Build images
docker compose build

# Start all services
docker compose up -d

# Check logs
docker compose logs -f app

# Verify all services running
docker compose ps
```

## Step 7: WhatsApp Webhook Configuration

### 7.1 Get webhook URL
Your webhook URL: `https://invoicer.company.com/api/wa/webhook`

### 7.2 Configure in Meta Developer Portal
1. Go to https://developers.facebook.com/apps
2. Select your WhatsApp app
3. Navigate to WhatsApp → Configuration
4. Set Webhook:
   - **Callback URL:** `https://invoicer.company.com/api/wa/webhook`
   - **Verify Token:** (value from `WHATSAPP_VERIFY_TOKEN` in .env)
5. Subscribe to webhook fields: `messages`
6. Click "Verify and Save"

### 7.3 Test webhook
```bash
# Check verification endpoint
curl "https://invoicer.company.com/api/wa/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"

# Should return: test123
```

## Step 8: Create First Admin User

### 8.1 Connect to database
```bash
docker exec -it invoicer-db psql -U "$DATABASE_USER" "$DATABASE_NAME"
```

### 8.2 Insert organization and user
```sql
-- Create organization
INSERT INTO organizations (name, ico, dic, is_vat_payer, address_street, address_city, address_zip, iban)
VALUES ('Your Company s.r.o.', '12345678', 'CZ12345678', true, 'Street 123', 'Prague', '11000', 'CZ65XXXXXXXXXXXXXXXXXXXX')
RETURNING id;
-- Note the returned ID (e.g., 1)

-- Create admin user (password: 'changeme123')
-- Generate hash: docker compose run --rm app node -e "console.log(require('bcrypt').hashSync('changeme123', 12))"
INSERT INTO users (email, password_hash, full_name, role, organization_id)
VALUES ('admin@company.com', '$2b$12$HASH_HERE', 'Admin User', 'admin', 1);

\q
```

### 8.3 Login
Visit `https://invoicer.company.com/login` and login with credentials.

## Step 9: Setup Backups

### 9.1 Create backup script
```bash
sudo nano /home/invoicer/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/invoicer/app/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec invoicer-db pg_dump -U invoicer invoicer_prod | gzip > "$BACKUP_DIR/db/backup_$DATE.sql.gz"

# Backup PDFs
tar -czf "$BACKUP_DIR/files/invoices_$DATE.tar.gz" /home/invoicer/app/data/invoices

# Delete backups older than 30 days
find "$BACKUP_DIR/db" -name "backup_*.sql.gz" -mtime +30 -delete
find "$BACKUP_DIR/files" -name "invoices_*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /home/invoicer/backup.sh
```

### 9.2 Setup cron job
```bash
crontab -e
```

Add:
```
# Daily backup at 3 AM
0 3 * * * /home/invoicer/backup.sh >> /home/invoicer/backup.log 2>&1

# Cleanup old WhatsApp cache daily at 4 AM
0 4 * * * docker exec invoicer-db psql -U invoicer invoicer_prod -c "DELETE FROM wa_message_cache WHERE received_at < NOW() - INTERVAL '24 hours'"
```

## Step 10: Monitoring & Maintenance

### 10.1 Check application health
```bash
curl https://invoicer.company.com/api/health
```

### 10.2 View logs
```bash
# Application logs
docker compose logs -f app

# Database logs
docker compose logs -f db

# Caddy logs
docker compose logs -f caddy

# All logs
docker compose logs -f
```

### 10.3 Restart services
```bash
# Restart app only
docker compose restart app

# Restart all services
docker compose restart

# Full rebuild (after code changes)
docker compose down
docker compose build
docker compose up -d
```

### 10.4 Update application
```bash
cd /home/invoicer/app
git pull
docker compose build
docker compose up -d
```

## Step 11: Firewall Configuration

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 12: SSL/TLS Certificate

Caddy automatically obtains and renews Let's Encrypt certificates. Verify:

```bash
docker compose logs caddy | grep -i certificate
```

## Troubleshooting

### App won't start
```bash
# Check logs
docker compose logs app

# Verify environment variables
docker compose config

# Test database connection
docker exec invoicer-app node -e "console.log(process.env.DATABASE_URL)"
```

### Webhook not receiving messages
- Verify webhook is subscribed in Meta portal
- Check HMAC signature validation in logs
- Test with Meta's webhook test tool

### PDF generation fails
```bash
# Restart app to recreate headless Chromium
docker compose restart app

# Inspect application logs for Puppeteer errors
docker compose logs app | grep -i puppeteer
```

### Database connection issues
```bash
# Check database is running
docker compose ps db

# Test connection
docker exec invoicer-db psql -U invoicer invoicer_prod -c "SELECT 1"
```

## Security Checklist

- [ ] Strong passwords for database user
- [ ] `SESSION_SECRET` is random 64-char string
- [ ] WhatsApp tokens are secure and not exposed
- [ ] `.env.production` has `chmod 600` permissions
- [ ] Firewall is enabled (only ports 22, 80, 443 open)
- [ ] Backups are configured and tested
- [ ] HTTPS is working (check with SSL Labs)
- [ ] Regular security updates (`apt update && apt upgrade`)

## Production Optimizations

### Enable log rotation
```bash
sudo nano /etc/logrotate.d/invoicer
```

```
/home/invoicer/app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
}
```

### Monitor disk space
```bash
# Add to crontab
0 */6 * * * df -h | mail -s "Disk Space Report" admin@company.com
```

### Setup monitoring (optional)
- Use Uptime Kuma, Prometheus + Grafana, or external service (UptimeRobot)
- Monitor: app health endpoint, database, disk space, memory usage

## Maintenance Schedule

- **Daily:** Automated backups
- **Weekly:** Check logs for errors, review disk space
- **Monthly:** Security updates, test backup restoration
- **Quarterly:** Review and optimize database, clean old audit logs
