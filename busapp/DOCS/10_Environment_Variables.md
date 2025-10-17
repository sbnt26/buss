# Environment Variables
**Date:** 2025-10-15

## Overview
Complete list of environment variables required for BussApp MVP. Use `.env.local` for development and secure secrets management (e.g., Docker secrets, Vault) for production.

## Required Variables

### Database
```bash
# Postgres connection string
DATABASE_URL="postgresql://user:password@localhost:5432/invoicer?schema=public"

# Individual credentials (used by Docker Compose)
DATABASE_USER=invoicer
DATABASE_PASSWORD=change_me_in_prod
DATABASE_NAME=invoicer_prod

# Connection pool settings (optional)
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

> **Poznámka:** Hodnota `DATABASE_URL` musí odpovídat `DATABASE_USER`, `DATABASE_PASSWORD` a `DATABASE_NAME`, aby Docker Compose i aplikace používaly stejné přihlašovací údaje.

### Application
```bash
# Node environment
NODE_ENV=production # 'development', 'production', 'test'

# Next.js
NEXT_PUBLIC_APP_URL=https://bussapp.cz
PORT=3000
```

### Authentication
```bash
# Session secret for JWT/cookie signing (generate with: openssl rand -hex 32)
SESSION_SECRET=your_64_char_random_hex_string_here

# JWT token expiration
JWT_EXPIRES_IN=7d # 7 days

# Password hashing rounds (bcrypt)
BCRYPT_ROUNDS=12
```

### WhatsApp Cloud API
```bash
# WhatsApp Business API credentials
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_PHONE_NUMBER_ID=987654321098765
WHATSAPP_ACCESS_TOKEN=YOUR_LONG_LIVED_ACCESS_TOKEN

# Webhook verification token (you choose this when setting up webhook)
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token_here

# App Secret for HMAC signature validation (from Meta App Dashboard)
WHATSAPP_APP_SECRET=your_app_secret_from_meta_dashboard

# API version
WHATSAPP_API_VERSION=v18.0

# Base URL for Graph API
WHATSAPP_API_BASE_URL=https://graph.facebook.com

# Messenger integration
MESSENGER_PAGE_ID=1234567890
MESSENGER_ACCESS_TOKEN=page_access_token
```

### File Storage
```bash
# Base directory for PDF storage (absolute path)
PDF_STORAGE_PATH=/data/invoices

# Public URL prefix for accessing PDFs (served via API proxy)
# Note: PDFs are NOT publicly accessible; this is for internal reference
PDF_URL_PREFIX=/api/invoices
```

### Rate Limiting
```bash
# WhatsApp messages per phone number per minute
RATE_LIMIT_WA_MESSAGES_PER_MIN=10

# API requests per IP per minute (web dashboard)
RATE_LIMIT_API_PER_IP_PER_MIN=100
```

### Logging & Monitoring
```bash
# Log level: 'debug', 'info', 'warn', 'error'
LOG_LEVEL=info

# Structured logging format: 'json' or 'pretty'
LOG_FORMAT=json

# Sentry DSN for error tracking (optional)
SENTRY_DSN=https://your_sentry_dsn_here

# Enable request logging
LOG_REQUESTS=true
```

### Email (Optional)
```bash
# SMTP settings for email notifications (optional feature)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=invoicer@example.com
SMTP_SECURE=true # true for 465, false for other ports
```

### Backups
```bash
# Backup destination path
BACKUP_PATH=/backups

# S3-compatible storage for remote backups (optional)
BACKUP_S3_ENDPOINT=https://s3.eu-central-1.amazonaws.com
BACKUP_S3_BUCKET=invoicer-backups
BACKUP_S3_ACCESS_KEY=your_access_key
BACKUP_S3_SECRET_KEY=your_secret_key
BACKUP_S3_REGION=eu-central-1

# Backup retention (days)
BACKUP_RETENTION_DAYS=30
```

### Feature Flags
```bash
# Enable/disable features
FEATURE_EMAIL_NOTIFICATIONS=false
FEATURE_AUDIT_LOG=true
FEATURE_CSV_EXPORT=true
FEATURE_DARK_MODE=true
```

## Example .env.local (Development)
```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invoicer_dev
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=invoicer_dev

SESSION_SECRET=dev_secret_change_in_production_abc123def456
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_PHONE_NUMBER_ID=987654321098765
WHATSAPP_ACCESS_TOKEN=YOUR_TOKEN_HERE
WHATSAPP_VERIFY_TOKEN=my_verify_token_123
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_BASE_URL=https://graph.facebook.com


PDF_STORAGE_PATH=/tmp/invoicer-pdfs
PDF_URL_PREFIX=/api/invoices

RATE_LIMIT_WA_MESSAGES_PER_MIN=10
RATE_LIMIT_API_PER_IP_PER_MIN=100

LOG_LEVEL=debug
LOG_FORMAT=pretty
LOG_REQUESTS=true

FEATURE_EMAIL_NOTIFICATIONS=false
FEATURE_AUDIT_LOG=true
FEATURE_CSV_EXPORT=true
FEATURE_DARK_MODE=true
```

## Example .env.production
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://bussapp.cz
PORT=3000

DATABASE_URL=postgresql://invoicer_user:STRONG_PASSWORD@db:5432/invoicer_prod
DATABASE_USER=invoicer_user
DATABASE_PASSWORD=STRONG_PASSWORD
DATABASE_NAME=invoicer_prod

SESSION_SECRET=GENERATE_WITH_openssl_rand_hex_32
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# WhatsApp credentials from Meta Business Manager
WHATSAPP_BUSINESS_ACCOUNT_ID=REAL_ACCOUNT_ID
WHATSAPP_PHONE_NUMBER_ID=REAL_PHONE_ID
WHATSAPP_ACCESS_TOKEN=REAL_ACCESS_TOKEN
WHATSAPP_VERIFY_TOKEN=STRONG_RANDOM_TOKEN
WHATSAPP_APP_SECRET=REAL_APP_SECRET
WHATSAPP_API_VERSION=v18.0
WHATSAPP_API_BASE_URL=https://graph.facebook.com


PDF_STORAGE_PATH=/data/invoices
PDF_URL_PREFIX=/api/invoices

RATE_LIMIT_WA_MESSAGES_PER_MIN=10
RATE_LIMIT_API_PER_IP_PER_MIN=100

LOG_LEVEL=info
LOG_FORMAT=json
LOG_REQUESTS=false

SENTRY_DSN=https://YOUR_SENTRY_DSN

BACKUP_PATH=/backups
BACKUP_RETENTION_DAYS=30

FEATURE_EMAIL_NOTIFICATIONS=false
FEATURE_AUDIT_LOG=true
FEATURE_CSV_EXPORT=true
FEATURE_DARK_MODE=true
```

## Security Best Practices

1. **Never commit `.env` files to Git** — Add to `.gitignore`
2. **Rotate secrets regularly** — Especially `SESSION_SECRET` and `WHATSAPP_ACCESS_TOKEN`
3. **Use strong random values** — Generate with `openssl rand -hex 32`
4. **Restrict file permissions** — `chmod 600 .env.production` on server
5. **Use environment-specific values** — Different tokens for dev/staging/prod
6. **Validate on startup** — App should fail fast if required variables are missing

## Validation Script
Create `scripts/validate-env.js` to check all required variables on startup:
```javascript
const required = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_APP_SECRET',
  'PDF_STORAGE_PATH'
];

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
});
```

