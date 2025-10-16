# Product Requirements Document — BussApp MVP
**Date:** 2025-10-15

## Problem
Freelancers and small firms want to issue invoices instantly from WhatsApp and keep a clean archive on the web without juggling tools.

## Objectives
- Create an invoice via WhatsApp within 2 minutes.
- Web CRM with filters and status management.
- Self-hosted, minimal cost, GDPR-friendly.

## Users & Jobs-to-be-done
- **Issuer (admin/staff):** Quickly issue and send invoices; track unpaid; export CSV.
- **Client (recipient):** Receive invoice PDF; (optional email cc).

## Scope
See Technical Requirements (MUST/SHOULD).

## Success Metrics
- TTFW (time to first working invoice) < 1 day from deploy.
- 95% invoices delivered to WhatsApp < 120s.
- <1% duplicate/failed webhook events.

## Assumptions
- User has WhatsApp Business Cloud API access.
- VPS with Docker or local Postgres + Gotenberg.

## Risks
- 24h WhatsApp window → require templates for proactive messages.
- PDF rendering performance → use Gotenberg; limit concurrency.
- Data loss → daily DB & file backups.
