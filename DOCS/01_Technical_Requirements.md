# Technical Requirements — WhatsApp Invoicer MVP
**Date:** 2025-10-15

## Goals
- Web onboarding → WhatsApp chatbot → PDF invoice into WhatsApp → CRM to filter/manage/download invoices.
- Self-hosted minimal SaaS dependencies (only WhatsApp Cloud API is external).

## Functional Requirements
- User registration/login and onboarding (company details, IBAN, VAT, defaults).
- WhatsApp chat flow to create invoices.
- PDF generation with CZ legal fields + QR payment (SPD 1.0).
- CRM list + filters, invoice detail, status changes (draft/sent/paid/overdue), CSV export.
- Audit log of key actions.
- Role-based access (admin, staff).

## Non‑Functional Requirements
- Availability: 99%+ single‑node target (VPS).
- Latency: PDF delivered to WhatsApp within 2 minutes of confirmation.
- Security: HMAC validation of WA webhook; PDF streamed via authenticated API (no public URLs).
- Data: stored in Postgres 16; PDFs on local filesystem with daily backups.
- Privacy: GDPR-friendly, EU hosting, ability to delete client data.
- Scalability: 100 invoices/hour on single VPS.
- Observability: structured logging, basic metrics, alert on high error rate.

## Constraints
- Stack fixed: Next.js 14+ (App Router), Postgres 16, Gotenberg, Filesystem storage, WhatsApp Cloud API, Caddy/HTTPS.
- No MinIO, no Puppeteer, no BullMQ, no extra DBs in MVP.
