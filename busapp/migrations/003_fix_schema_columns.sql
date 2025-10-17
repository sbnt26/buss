-- Fix missing columns in database schema
-- Date: 2025-10-17

-- Add bank_account column to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS bank_account VARCHAR(64);

-- Add email column to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Rename ico column to ic in clients table (if needed for consistency)
-- Actually, the application uses both 'ico' and 'ic' inconsistently
-- Let's add 'ic' as alias to 'ico' for backward compatibility
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS ic VARCHAR(20);

-- Update ic column to match ico column data (if ico exists)
UPDATE clients SET ic = ico WHERE ico IS NOT NULL AND ic IS NULL;
