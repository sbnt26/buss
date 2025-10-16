-- WhatsApp Invoicer - Initial Database Schema
-- Date: 2025-10-15

-- Organizations table (must be created first due to foreign keys)
CREATE TABLE organizations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ico VARCHAR(20) NOT NULL,
  dic VARCHAR(20),
  is_vat_payer BOOLEAN DEFAULT TRUE,
  address_street VARCHAR(255) NOT NULL,
  address_city VARCHAR(100) NOT NULL,
  address_zip VARCHAR(20) NOT NULL,
  address_country VARCHAR(2) DEFAULT 'CZ',
  iban VARCHAR(34),
  bank_name VARCHAR(100),
  logo_path VARCHAR(500),
  default_currency VARCHAR(3) DEFAULT 'CZK',
  default_vat_rate DECIMAL(5,2) DEFAULT 21.00,
  invoice_prefix VARCHAR(10) DEFAULT '',
  invoice_numbering_start INT DEFAULT 1,
  whatsapp_phone_id VARCHAR(50),
  whatsapp_business_account_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_ico ON organizations(ico);

-- Users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'staff',
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- Clients table
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
  whatsapp_phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_clients_ico ON clients(ico);
CREATE INDEX idx_clients_whatsapp ON clients(whatsapp_phone);

-- Invoices table
CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(50) NOT NULL,
  variable_symbol VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  delivery_date DATE,
  currency VARCHAR(3) DEFAULT 'CZK',
  subtotal DECIMAL(12,2) NOT NULL,
  vat_amount DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  pdf_path VARCHAR(500),
  notes TEXT,
  created_by BIGINT REFERENCES users(id),
  created_via VARCHAR(20) DEFAULT 'whatsapp',
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

-- Invoice items table
CREATE TABLE invoice_items (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position INT NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'ks',
  unit_price DECIMAL(12,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  vat_amount DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Counters table for invoice numbering
CREATE TABLE counters (
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INT NOT NULL,
  last_seq INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, year)
);

-- WhatsApp conversations table
CREATE TABLE wa_conversations (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  whatsapp_phone VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL DEFAULT 'idle',
  context JSONB DEFAULT '{}',
  last_message_id VARCHAR(255),
  timeout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, whatsapp_phone)
);

CREATE INDEX idx_wa_conversations_org_phone ON wa_conversations(organization_id, whatsapp_phone);
CREATE INDEX idx_wa_conversations_timeout ON wa_conversations(timeout_at) WHERE timeout_at IS NOT NULL;

-- WhatsApp message cache table
CREATE TABLE wa_message_cache (
  message_id VARCHAR(255) PRIMARY KEY,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_wa_message_cache_received ON wa_message_cache(received_at);

-- WhatsApp rate limits table
CREATE TABLE wa_rate_limits (
  whatsapp_phone VARCHAR(50) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  message_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (whatsapp_phone, window_start)
);

CREATE INDEX idx_wa_rate_limits_window ON wa_rate_limits(window_start);

-- Audit log table
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT,
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org ON audit_log(organization_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);



