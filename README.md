# WhatsApp Invoicer MVP

Komplexní self-hosted fakturační systém s WhatsApp chatbotem a webovým CRM.

## Přehled

- 📱 Vytváření faktur přes WhatsApp chatbot
- 💼 Webové CRM pro správu faktur a klientů
- 📄 Automatické generování PDF faktur s QR platebními kódy
- 🔒 Self-hosted řešení s minimálními závislostmi
- 🇨🇿 České faktury s podporou DPH i neplátců DPH

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend:** Next.js API Routes, Node.js 20
- **Database:** PostgreSQL 16
- **PDF Generation:** Gotenberg (Chromium-based)
- **Integration:** WhatsApp Cloud API

## Quick Start

### Prerekvizity

- Node.js 20+
- PostgreSQL 16
- Docker (pro Gotenberg)

### 1. Instalace

```bash
npm install
```

### 2. Environment Setup

Vytvořte `.env.local` soubor (můžete zkopírovat z `.env.example`):

```bash
# Minimální konfigurace pro dev

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invoicer_dev
SESSION_SECRET=$(openssl rand -hex 32)
```

### 3. Databáze

Spusťte PostgreSQL a vytvořte databázi:

```bash
# Pomocí Dockeru
docker run -d \
  --name invoicer-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=invoicer_dev \
  -p 5432:5432 \
  postgres:16-alpine

# Spusťte migraci
psql -U postgres -d invoicer_dev -f migrations/001_initial_schema.sql
```

### 4. Gotenberg (PDF Service)

```bash
docker run -d \
  --name invoicer-gotenberg \
  -p 3001:3000 \
  gotenberg/gotenberg:7
```

### 5. Spuštění

```bash
npm run dev
```

Aplikace běží na http://localhost:3000

## Vývoj

### Struktura projektu

```
/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   ├── app/               # Protected area (CRM)
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   └── onboarding/       # Onboarding wizard
├── lib/                   # Core business logic
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database client
│   ├── config.ts         # Configuration
│   └── schemas/          # Zod validation schemas
├── components/           # React components
├── migrations/           # Database migrations
├── templates/            # Handlebars templates (PDF)
├── tests/               # Unit & integration tests
└── DOCS/                # Technical documentation
```

### Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm test             # Run all tests
npm run test:unit    # Unit tests only
npm run test:integration # Integration tests
```

## Dokumentace

Kompletní technická dokumentace je v složce `/DOCS`:

- [Technical Requirements](DOCS/01_Technical_Requirements.md)
- [Backend Implementation](DOCS/02_Backend_Implementation.md)
- [Database Schema](DOCS/09_Database_Schema.md)
- [API Specification](DOCS/08_API_Spec.md)
- [Deployment Guide](DOCS/11_Deployment_Guide.md)
- [Testing Strategy](DOCS/12_Testing_Strategy.md)

Viz [README_INDEX.md](DOCS/README_INDEX.md) pro kompletní přehled.

## WhatsApp Setup

Návod na konfiguraci WhatsApp Business API najdete v [Deployment Guide](DOCS/11_Deployment_Guide.md#fáze-21-whatsapp-business-api-setup).

## Production Deployment

Pro nasazení na production VPS viz [Deployment Guide](DOCS/11_Deployment_Guide.md).

## Testování

```bash
# Unit testy
npm run test:unit

# Integration testy
npm run test:integration

# Coverage
npm run test:coverage
```

## Bezpečnost

- ✅ HMAC validace pro WhatsApp webhooky
- ✅ JWT autentizace
- ✅ Bcrypt password hashing (12 rounds)
- ✅ SQL injection prevence (parameterized queries)
- ✅ Rate limiting (WhatsApp + API)
- ✅ RBAC (admin/staff role)

## Licence

Proprietary - Internal use only

## Status

🚀 **50% Complete** - Week 1-3 Dokončeno!

### ✅ Dokončeno (Weeks 1-3)

**Week 1: Foundation**
- ✅ Next.js 14 projekt s TypeScript a Tailwind CSS
- ✅ PostgreSQL databáze se všemi tabulkami (11 tables)
- ✅ Environment configuration s validací
- ✅ Authentication core (bcrypt, JWT, middleware)

**Week 2: Auth & Business Logic**
- ✅ Complete Auth API (signup, login, logout, me)
- ✅ Registrace a přihlášení UI s validací
- ✅ 3-step onboarding wizard
- ✅ Race-safe invoice numbering
- ✅ Invoice calculations s DPH
- ✅ 29+ unit tests

**Week 3: PDF Generation**
- ✅ Gotenberg integrace s retry logicou
- ✅ Profesionální PDF template (Handlebars)
- ✅ QR platební kódy (SPD 1.0)
- ✅ File storage systém
- ✅ Complete invoice creation flow
- ✅ PDF preview & download endpoints

### 📊 Statistiky
- **Soubory:** 40+ files vytvořeno
- **Kód:** ~5000+ řádků
- **API Endpoints:** 10+ funkčních
- **Testy:** 29+ unit tests
- **Pokrok:** 50% (3 z 6 týdnů)

### 🎯 Další kroky
- ⏳ Week 4: WhatsApp Webhook & FSM (vyžaduje Meta Business setup)
- ⏳ Week 5: Web CRM Interface
- ⏳ Week 6: Testing & Deployment

