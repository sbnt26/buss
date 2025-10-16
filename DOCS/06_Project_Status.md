# Project Status (Planned)

## Timeline (6 weeks)
- Week 1: DB migrations, onboarding, auth skeleton
- Week 2: Invoicing CRUD, numbering, totals
- Week 3: Gotenberg integration, PDF template, FS storage
- Week 4: WhatsApp webhook + FSM, send PDF as document
- Week 5: CRM filters, CSV export, audit, rate-limit
- Week 6: DevOps (Docker Compose), backups, monitoring, polish

## Current Risks & Mitigations
- WA templates approval: submit early (buffer 3–5 days).
- Server capacity: start with 1× VPS, monitor, scale if needed.
- Legal: verify local invoice requirements; add “Neplátce DPH” path.

## Deliverables
- Running stack on VPS/local
- Admin access to CRM
- Working WA flow delivering PDFs
- Backups configured
