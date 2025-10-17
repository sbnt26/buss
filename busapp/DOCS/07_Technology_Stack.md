# Technology Stack

## Frontend
- Next.js 14+ (App Router), React 18, Tailwind CSS, TanStack Table, React Hook Form + Zod

## Backend
- Next.js Route Handlers (API), Node 20, Postgres 16 (pg), Handlebars

## Integrations
- WhatsApp Cloud API (webhook + send document)
- Puppeteer (headless Chromium HTML→PDF)

## Storage
- Postgres for relational data & FSM
- Filesystem for PDFs (`/data/invoices/...`)

## DevOps
- Docker Compose (app, db, caddy)
- Caddy for TLS reverse proxy
- Backups: pg_dump + rsync PDFs
