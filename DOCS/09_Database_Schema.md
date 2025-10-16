# Database Schema
**Date:** 2025-10-15

## Overview
Postgres 16 relational schema for WhatsApp Invoicer MVP. All tables use `id` as bigserial primary key unless specified otherwise.

## Tables

### users
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'staff', -- 'admin', 'staff'
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
```

### organizations
```sql
CREATE TABLE organizations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ico VARCHAR(20) NOT NULL, -- IČO (Company ID)
  dic VARCHAR(20), -- DIČ (VAT ID), NULL if non-VAT payer
  is_vat_payer BOOLEAN DEFAULT TRUE,
  address_street VARCHAR(255) NOT NULL,
  address_city VARCHAR(100) NOT NULL,
  address_zip VARCHAR(20) NOT NULL,
  address_country VARCHAR(2) DEFAULT 'CZ',
  iban VARCHAR(34),
  bank_name VARCHAR(100),
  logo_path VARCHAR(500), -- Path to uploaded logo
  default_currency VARCHAR(3) DEFAULT 'CZK',
  default_vat_rate DECIMAL(5,2) DEFAULT 21.00,
  invoice_prefix VARCHAR(10) DEFAULT '', -- e.g., 'FV-' or empty
  invoice_numbering_start INT DEFAULT 1,
  whatsapp_phone_id VARCHAR(50), -- WhatsApp Business Phone Number ID
  whatsapp_business_account_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_ico ON organizations(ico);
```

### clients
```sql
CREATE TABLE clients (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  ico VARCHAR(20),
  dic VARCHAR(20),
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_zip VARCHAR(20),
  address_country VARCHAR(2) DEFAULT 'CZ',
  email VARCHAR(255),
  phone VARCHAR(50),
  whatsapp_phone VARCHAR(50), -- WhatsApp number (E.164 format)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_clients_ico ON clients(ico);
CREATE INDEX idx_clients_whatsapp ON clients(whatsapp_phone);
```

### invoices
```sql
CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(50) NOT NULL, -- e.g., '2025-00001' or 'FV-2025-00001'
  variable_symbol VARCHAR(20) NOT NULL, -- VS for payment (same as number without prefix/dashes)
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  delivery_date DATE,
  currency VARCHAR(3) DEFAULT 'CZK',
  subtotal DECIMAL(12,2) NOT NULL, -- Sum before VAT
  vat_amount DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL, -- Total including VAT
  pdf_path VARCHAR(500), -- Relative path: {orgId}/{year}/{number}.pdf
  notes TEXT,
  created_by BIGINT REFERENCES users(id),
  created_via VARCHAR(20) DEFAULT 'whatsapp', -- 'whatsapp', 'web', 'api'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  UNIQUE(organization_id, invoice_number)
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
```

### invoice_items
```sql
CREATE TABLE invoice_items (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position INT NOT NULL, -- Order in the invoice (1, 2, 3...)
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'ks', -- 'ks', 'hod', 'den', 'm2', etc.
  unit_price DECIMAL(12,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL, -- e.g., 21.00 or 0.00 for non-VAT
  subtotal DECIMAL(12,2) NOT NULL, -- quantity * unit_price
  vat_amount DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
```

### counters
```sql
CREATE TABLE counters (
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INT NOT NULL,
  last_seq INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, year)
);

-- Race-safe sequence increment
-- Usage: INSERT INTO counters (organization_id, year, last_seq) 
--        VALUES ($1, $2, 1) 
--        ON CONFLICT (organization_id, year) 
--        DO UPDATE SET last_seq = counters.last_seq + 1 
--        RETURNING last_seq;
```

### wa_conversations
```sql
CREATE TABLE wa_conversations (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  whatsapp_phone VARCHAR(50) NOT NULL, -- User's WhatsApp (E.164)
  state VARCHAR(50) NOT NULL DEFAULT 'idle', 
  -- States: 'idle', 'awaiting_client', 'awaiting_items', 'awaiting_dates', 'confirm', 'done'
  context JSONB DEFAULT '{}', -- Stores temporary data: {clientData, items[], dates{}}
  last_message_id VARCHAR(255), -- Last processed WA message ID
  timeout_at TIMESTAMPTZ, -- Conversation expires after 60 min
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, whatsapp_phone)
);

CREATE INDEX idx_wa_conversations_org_phone ON wa_conversations(organization_id, whatsapp_phone);
CREATE INDEX idx_wa_conversations_timeout ON wa_conversations(timeout_at) WHERE timeout_at IS NOT NULL;
```

### wa_message_cache
```sql
CREATE TABLE wa_message_cache (
  message_id VARCHAR(255) PRIMARY KEY, -- WhatsApp message ID
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT TRUE
);

-- Deduplicate messages (TTL 24h via cleanup job)
CREATE INDEX idx_wa_message_cache_received ON wa_message_cache(received_at);
```

### wa_rate_limits
```sql
CREATE TABLE wa_rate_limits (
  whatsapp_phone VARCHAR(50) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL, -- Use date_trunc('minute', NOW()) to bucket
  message_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (whatsapp_phone, window_start)
);

-- Cleanup old windows (TTL 10 min via cleanup job)
CREATE INDEX idx_wa_rate_limits_window ON wa_rate_limits(window_start);
```

### audit_log
```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'invoice', 'client', 'organization', 'user'
  entity_id BIGINT,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'sent', 'paid', 'cancelled'
  changes JSONB, -- Before/after values
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org ON audit_log(organization_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
```

## Migrations Strategy
- Use a migration tool (e.g., `node-pg-migrate`, Prisma, or custom SQL scripts).
- Version migrations numerically: `001_initial_schema.sql`, `002_add_columns.sql`, etc.
- Always include rollback scripts.

## Indexes & Performance
- All foreign keys have indexes for JOIN performance.
- Composite unique constraints prevent duplicate invoice numbers per organization.
- Partial indexes on `wa_conversations.timeout_at` optimize cleanup queries.

## Data Retention
- **wa_message_cache**: Delete messages older than 24 hours (daily cron).
- **wa_rate_limits**: Delete windows older than 10 minutes (hourly cron).
- **audit_log**: Optional retention policy (e.g., 1 year) for compliance.

## Backup Strategy
- Daily `pg_dump` of entire database.
- Point-in-time recovery (PITR) enabled via WAL archiving (optional for production).


