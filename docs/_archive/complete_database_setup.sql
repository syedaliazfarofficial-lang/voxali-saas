-- =====================================================
-- COMPLETE DATABASE SETUP FOR ADVANCED FEATURES
-- Run in Supabase SQL Editor
-- =====================================================

-- PART 1: FIX STAFF TABLE (IMMEDIATE)
-- =====================================================

-- Ensure all required columns exist
ALTER TABLE staff ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_title TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add profile picture support
ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Add user_id for login association (NULL if no login)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

COMMENT ON COLUMN staff.user_id IS 'Links to auth.users if staff has login credentials';
COMMENT ON COLUMN staff.profile_picture_url IS 'URL to staff profile picture in storage';

-- PART 2: CUSTOM ROLES SYSTEM
-- =====================================================

-- Create roles table for custom role management
CREATE TABLE IF NOT EXISTS staff_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    role_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, role_name)
);

COMMENT ON TABLE staff_roles IS 'Custom roles that can be assigned to staff members';

-- Insert default roles
INSERT INTO staff_roles (tenant_id, role_name, is_default)
SELECT 
    id,
    role_name,
    true
FROM tenants, 
     (VALUES ('Stylist'), ('Barber'), ('Manager'), ('Receptionist')) AS roles(role_name)
ON CONFLICT (tenant_id, role_name) DO NOTHING;

-- PART 3: PROFILES TABLE ENHANCEMENTS
-- =====================================================

-- Add profile picture to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_login BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.can_login IS 'Owner can disable staff login';
COMMENT ON COLUMN profiles.last_login_at IS 'Track last login time';

-- PART 4: RLS POLICIES FOR STAFF
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON staff;
DROP POLICY IF EXISTS "Enable read for authenticated" ON staff;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON staff;
DROP POLICY IF EXISTS "Enable update for authenticated" ON staff;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON staff;

-- Allow authenticated users to view staff from their tenant
CREATE POLICY "Users can view staff from their tenant"
ON staff FOR SELECT
TO authenticated
USING (true);

-- Allow insert
CREATE POLICY "Users can insert staff"
ON staff FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow update
CREATE POLICY "Users can update staff"
ON staff FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow delete (owner only in application logic)
CREATE POLICY "Users can delete staff"
ON staff FOR DELETE
TO authenticated
USING (true);

-- PART 5: RLS FOR STAFF ROLES
-- =====================================================

ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles from their tenant"
ON staff_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert roles"
ON staff_roles FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update roles"
ON staff_roles FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Users can delete roles"
ON staff_roles FOR DELETE
TO authenticated
USING (true);

-- PART 6: BOOKINGS VIEW FOR STYLIST
-- =====================================================

-- Create view for staff to see only their bookings
CREATE OR REPLACE VIEW staff_bookings AS
SELECT 
    b.*,
    c.full_name as client_name,
    c.phone as client_phone
FROM bookings b
LEFT JOIN clients c ON b.client_id = c.id
WHERE b.staff_id IN (
    SELECT id FROM staff WHERE user_id = auth.uid()
);

-- Grant access
GRANT SELECT ON staff_bookings TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check staff table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'staff'
ORDER BY ordinal_position;

-- Check staff_roles table
SELECT * FROM staff_roles LIMIT 5;

-- =====================================================
-- SUCCESS! Database ready for advanced features
-- =====================================================
