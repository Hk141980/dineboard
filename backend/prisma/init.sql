-- ============================================
-- DineBoard — PostgreSQL RLS Init
-- Run this on database creation
-- ============================================

-- Enable Row Level Security on tenant-scoped tables
-- Note: RLS policies are applied after Prisma creates the tables
-- Run this script after `prisma db push`

-- Create the function to get current tenant
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
  SELECT current_setting('app.current_tenant', true);
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper: Enable RLS on a table and create policy
-- Usage: After Prisma creates tables, run:
-- ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation ON <table_name>
--   USING (tenant_id::text = current_tenant_id());

-- We'll apply these policies programmatically after Prisma migration
-- See backend/prisma/apply-rls.js
