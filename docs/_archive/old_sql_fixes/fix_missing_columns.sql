-- =====================================================
-- FIX MISSING COLUMNS - Dashboard Bug Fixes
-- Run these queries in Supabase SQL Editor
-- =====================================================

-- 1. ADD EMAIL TO STAFF TABLE
-- This allows storing staff email addresses
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN staff.email IS 'Staff member email address';

-- 2. ADD DESCRIPTION TO SERVICES TABLE
-- This allows adding service descriptions for customers
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN services.description IS 'Detailed service description for customers';

-- 3. ADD AGENT_ENABLED TO TENANTS TABLE
-- This allows Owner to enable/disable Bella AI agent
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN tenants.agent_enabled IS 'Controls whether AI voice agent is active (Owner can toggle ON/OFF)';

-- 4. FIX RLS POLICY FOR CLIENTS TABLE
-- Allow authenticated users to INSERT clients
DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON clients;

CREATE POLICY "Allow authenticated users to insert clients"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also ensure users can view their own tenant's clients
DROP POLICY IF EXISTS "Users can view clients from their tenant" ON clients;

CREATE POLICY "Users can view clients from their tenant"
ON clients
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Allow updates for authenticated users
DROP POLICY IF EXISTS "Users can update clients from their tenant" ON clients;

CREATE POLICY "Users can update clients from their tenant"
ON clients
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to check if columns were added successfully
-- =====================================================

-- Check staff columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'staff' AND column_name = 'email';

-- Check services columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'services' AND column_name = 'description';

-- Check tenants columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tenants' AND column_name = 'agent_enabled';

-- Check RLS policies on clients
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'clients';

-- =====================================================
-- SUCCESS!
-- All missing columns added and RLS policies fixed
-- Now your dashboard should work perfectly!
-- =====================================================
