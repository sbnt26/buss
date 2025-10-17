# BussApp — Kompletní technická dokumentace
**Datum:** 2025-10-15

## Přehled dokumentů

Tato dokumentace poskytuje kompletní specifikaci pro vývoj BussApp MVP - aplikace pro tvorbu faktur přes WhatsApp s webovým CRM.

---

## 📋 Základní dokumenty

### 1. [01_Technical_Requirements.md](./01_Technical_Requirements.md)
**Technické požadavky**
- Funkční a nefunkční požadavky
- Cíle projektu a omezení
- Technologický stack
- Bezpečnostní požadavky

### 2. [05_PRD.md](./05_PRD.md)
**Product Requirements Document**
- Definice problému a řešení
- Cílová skupina a use cases
- Úspěšové metriky
- Předpoklady a rizika

### 3. [06_Project_Status.md](./06_Project_Status.md)
**Status projektu**
- 6týdenní timeline
- Deliverables
- Aktuální rizika a mitigace

---

## 🏗️ Architektura & Implementace

### 4. [07_Technology_Stack.md](./07_Technology_Stack.md)
**Technologický stack**
- Frontend: Next.js 14, React 18, Tailwind CSS
- Backend: Next.js API Routes, Postgres 16, Puppeteer
- Integrace: WhatsApp Cloud API
- DevOps: Docker Compose, Caddy

### 5. [02_Backend_Implementation.md](./02_Backend_Implementation.md)
**Backend implementace** (rozšířeno)
- API endpoints a architektura
- FSM pro WhatsApp konverzace (detailní state transitions)
- Race-safe číslování faktur
- PDF rendering (DPH vs. neplátce DPH)
- Rate limiting (WhatsApp + API)
- Error handling a retry strategie
- Validace vstupů (Zod schemas)
- Backup strategie

### 6. [04_Frontend_Implementation.md](./04_Frontend_Implementation.md)
**Frontend implementace**
- Next.js App Router stránky
- Komponenty (TanStack Table, React Hook Form)
- Styling (Tailwind CSS)
- State management

### 7. [03_User_Flow_Diagram.md](./03_User_Flow_Diagram.md)
**User flow diagram**
- Mermaid sequence diagram
- Kompletní tok od WhatsApp zprávy k PDF

---

## 🔌 API & Databáze

### 8. [08_API_Spec.md](./08_API_Spec.md)
**API specifikace** (kompletně rozšířeno)
- **WhatsApp webhook** (GET/POST)
- **Authentication** (signup, login, logout, me)
- **Invoices** (list, detail, create, preview, update status, resend, PDF stream, CSV export)
- **Clients** (CRUD operace)
- **Organization/Settings** (nastavení firmy, logo upload)
- **Dashboard** (stats, recent invoices)
- **Audit log** (audit trail)
- **Health/Utility** (health check, version)
- Error response formát
- Rate limits (detaily pro všechny endpointy)
- Pagination

### 9. [09_Database_Schema.md](./09_Database_Schema.md) ✨ **NOVÝ**
**Databázové schéma**
- Kompletní DDL pro všechny tabulky:
  - `users`, `organizations`, `clients`
  - `invoices`, `invoice_items`, `counters`
  - `wa_conversations`, `wa_message_cache`, `wa_rate_limits`
  - `audit_log`
- Indexy a performance optimalizace
- Migrace strategie
- Backup a retention policies

---

## ⚙️ Konfigurace & Deployment

### 10. [10_Environment_Variables.md](./10_Environment_Variables.md) ✨ **NOVÝ**
**Environment variables**
- Kompletní seznam všech proměnných prostředí
- Database, Authentication, WhatsApp API
- PDF generator (Puppeteer), File Storage, Rate Limiting
- Logging & Monitoring, Email (optional), Backups
- Feature flags
- Příklady pro development i production
- Security best practices
- Validation script

### 11. [11_Deployment_Guide.md](./11_Deployment_Guide.md) ✨ **NOVÝ**
**Deployment guide**
- Krok za krokem nasazení na VPS (Ubuntu 22.04)
- Docker Compose setup (app, db, caddy)
- Dockerfile a Caddyfile
- Database migrace
- WhatsApp webhook konfigurace
- Vytvoření prvního admin uživatele
- Backup setup (cron jobs)
- Firewall a SSL/TLS
- Troubleshooting
- Security checklist
- Production optimalizace
- Maintenance schedule

---

## 🧪 Testing

### 12. [12_Testing_Strategy.md](./12_Testing_Strategy.md) ✨ **NOVÝ**
**Testing strategie**
- Testing pyramid (unit 70%, integration 25%, E2E 5%)
- Tech stack: Jest, Testing Library, Playwright, Supertest
- **Unit tests:** Finanční kalkulace, QR kódy, utils
- **Integration tests:** API endpoints, WhatsApp webhook, race conditions
- **E2E tests:** Kompletní WhatsApp flow, CRM operace
- **Manual testing checklist:** WhatsApp flow, web CRM, security, performance
- Test data management a seed scripts
- CI/CD integrace (GitHub Actions)
- Coverage goals a quality gates

---

## 📖 Jak číst tuto dokumentaci

### Pro Product Managery
1. Začněte s `05_PRD.md` a `01_Technical_Requirements.md`
2. Pokračujte `06_Project_Status.md` pro timeline

### Pro vývojáře
1. **Přehled:** `07_Technology_Stack.md` + `03_User_Flow_Diagram.md`
2. **Backend:** `02_Backend_Implementation.md` + `09_Database_Schema.md` + `08_API_Spec.md`
3. **Frontend:** `04_Frontend_Implementation.md`
4. **Konfigurace:** `10_Environment_Variables.md`
5. **Testing:** `12_Testing_Strategy.md`

### Pro DevOps
1. `11_Deployment_Guide.md` — primární dokument
2. `10_Environment_Variables.md` — konfigurace
3. `07_Technology_Stack.md` — infrastruktura

---

## 🎯 Klíčové vlastnosti dokumentace

✅ **Kompletní** — Všechny aspekty aplikace pokryté  
✅ **Profesionální** — Production-ready specifikace  
✅ **Implementovatelné** — Konkrétní code snippets a příklady  
✅ **Bezpečné** — Security best practices zabudované  
✅ **Testovatelné** — Detailní testing strategie  
✅ **Deployovatelné** — Krok za krokem deployment guide  

---

## 📝 Verze dokumentace

| Verze | Datum | Změny |
|-------|-------|-------|
| 2.0 | 2025-10-15 | Kompletní rozšíření na profesionální úroveň |
| 1.0 | 2025-10-15 | První verze základní dokumentace |

---

## 📧 Kontakt

Pro dotazy k dokumentaci kontaktujte tým na: [vaše@email.cz]
