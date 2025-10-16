-- Add bank account column to organizations for separate account number storage
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS bank_account VARCHAR(64);
