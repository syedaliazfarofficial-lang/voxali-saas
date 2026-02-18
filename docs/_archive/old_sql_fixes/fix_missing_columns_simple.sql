-- =====================================================
-- FIX MISSING COLUMNS - Simple Version (No RLS Changes)
-- Run these queries in Supabase SQL Editor
-- =====================================================

-- 1. ADD EMAIL TO STAFF TABLE
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. ADD DESCRIPTION TO SERVICES TABLE
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. ADD AGENT_ENABLED TO TENANTS TABLE
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN DEFAULT true;

-- 4. SIMPLE RLS FIX FOR CLIENTS - Allow All Authenticated Users
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON clients;

-- Allow INSERT
CREATE POLICY "Enable insert for authenticated users"
ON clients FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow SELECT (read)
CREATE POLICY "Enable read for authenticated users"
ON clients FOR SELECT
TO authenticated
USING (true);

-- Allow UPDATE
CREATE POLICY "Enable update for authenticated users"
ON clients FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- DONE! All columns added and RLS simplified.
-- =====================================================
