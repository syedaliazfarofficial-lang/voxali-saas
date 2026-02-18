-- ============================================
-- MULTI-TENANT SAAS - DATABASE MIGRATION
-- WEEK 1: Core Architecture
-- ============================================

-- This SQL creates the complete multi-tenant foundation
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: CREATE TENANTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    
    -- Subscription Management
    subscription_status TEXT DEFAULT 'active', -- active, suspended, trial, cancelled
    subscription_plan TEXT DEFAULT 'basic', -- basic, pro, enterprise
    trial_ends_at TIMESTAMPTZ,
    subscription_starts_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Limits
    max_staff INT DEFAULT 10,
    max_bookings_per_month INT DEFAULT 1000,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), -- Super Admin who added them
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business Settings (can be customized per tenant)
    business_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "18:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
        "thursday": {"open": "09:00", "close": "18:00", "closed": false},
        "friday": {"open": "09:00", "close": "18:00", "closed": false},
        "saturday": {"open": "10:00", "close": "16:00", "closed": false},
        "sunday": {"open": "00:00", "close": "00:00", "closed": true}
    }',
    timezone TEXT DEFAULT 'America/New_York',
    booking_buffer INT DEFAULT 15,
    agent_enabled BOOLEAN DEFAULT true
);

-- Enable RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Tenants RLS Policies
DROP POLICY IF EXISTS "Super admin can view all tenants" ON tenants;
CREATE POLICY "Super admin can view all tenants" ON tenants
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
    );

DROP POLICY IF EXISTS "Tenant admins can view own tenant" ON tenants;
CREATE POLICY "Tenant admins can view own tenant" ON tenants
    FOR SELECT USING (
        id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Super admin can manage all tenants" ON tenants;
CREATE POLICY "Super admin can manage all tenants" ON tenants
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
    );

-- ============================================
-- STEP 2: RECREATE PROFILES TABLE (WITH TENANT SUPPORT)
-- ============================================

-- Drop existing profiles table if it has errors
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for super admin
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'tenant_admin', 'manager', 'stylist')),
    staff_id UUID, -- Will link to staff(id) after adding tenant_id to staff
    is_protected BOOLEAN DEFAULT false, -- TRUE for super admin (cannot be deleted)
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (
        auth.uid() = user_id OR
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
    );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (
        auth.uid() = user_id AND is_protected = false
    );

DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
CREATE POLICY "System can insert profiles" ON profiles
    FOR INSERT WITH CHECK (true); -- Allow system to create profiles

-- ============================================
-- STEP 3: ADD TENANT_ID TO EXISTING TABLES
-- ============================================

-- Staff Table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id);

-- Clients Table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);

-- Bookings Table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);

-- Payments Table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);

-- Services Table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);

-- ============================================
-- STEP 4: UPDATE RLS POLICIES FOR MULTI-TENANCY
-- ============================================

-- STAFF TABLE RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see only their tenant staff" ON staff;
CREATE POLICY "Users see only their tenant staff" ON staff
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
        OR
        tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage their tenant staff" ON staff;
CREATE POLICY "Admins can manage their tenant staff" ON staff
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('super_admin', 'tenant_admin')
        AND (
            (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
            OR
            tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- CLIENTS TABLE RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see only their tenant clients" ON clients;
CREATE POLICY "Users see only their tenant clients" ON clients
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
        OR
        tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Staff can manage their tenant clients" ON clients;
CREATE POLICY "Staff can manage their tenant clients" ON clients
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('super_admin', 'tenant_admin', 'manager')
        AND (
            (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
            OR
            tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- BOOKINGS TABLE RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bookings based on role" ON bookings;
CREATE POLICY "Users see bookings based on role" ON bookings
    FOR SELECT USING (
        -- Super admin sees all
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
        OR
        -- Tenant admin and manager see all tenant bookings
        (
            (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('tenant_admin', 'manager')
            AND tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
        )
        OR
        -- Stylist sees only their own bookings
        (
            (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'stylist'
            AND staff_id = (SELECT staff_id FROM profiles WHERE user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Staff can manage bookings based on role" ON bookings;
CREATE POLICY "Staff can manage bookings based on role" ON bookings
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('super_admin', 'tenant_admin', 'manager', 'stylist')
        AND (
            (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
            OR
            tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- PAYMENTS TABLE RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see payments based on role" ON payments;
CREATE POLICY "Users see payments based on role" ON payments
    FOR SELECT USING (
        -- Super admin sees all
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
        OR
        -- Tenant admin and manager see all tenant payments
        (
            (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('tenant_admin', 'manager')
            AND tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Admins and managers can manage payments" ON payments;
CREATE POLICY "Admins and managers can manage payments" ON payments
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('super_admin', 'tenant_admin', 'manager')
        AND (
            (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
            OR
            tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- SERVICES TABLE RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see only their tenant services" ON services;
CREATE POLICY "Users see only their tenant services" ON services
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
        OR
        tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage their tenant services" ON services;
CREATE POLICY "Admins can manage their tenant services" ON services
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('super_admin', 'tenant_admin')
        AND (
            (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
            OR
            tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- ============================================
-- STEP 5: CREATE SUPER ADMIN PROFILE
-- ============================================

-- First, create Super Admin auth user (MANUALLY)
-- Go to Supabase Dashboard → Authentication → Users → Add User
-- Email: your_email@example.com
-- Password: YourSecurePassword123
-- Confirm password
-- Then get the user ID and run this:

-- REPLACE 'YOUR_USER_ID_HERE' with actual UUID from auth.users
-- REPLACE 'your_email@example.com' with your actual email

-- Example:
/*
INSERT INTO profiles (user_id, email, full_name, role, is_protected, tenant_id)
VALUES (
    'YOUR_USER_ID_HERE'::uuid, -- Replace with your auth.users.id
    'your_email@example.com',
    'Super Admin',
    'super_admin',
    true, -- Protected - cannot be deleted
    NULL -- No tenant - has access to all
)
ON CONFLICT (user_id) DO UPDATE 
SET role = 'super_admin', is_protected = true;
*/

-- ============================================
-- STEP 6: CREATE TRIGGER FOR AUTO-PROFILE CREATION
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role, tenant_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'tenant_admin'),
        (NEW.raw_user_meta_data->>'tenant_id')::uuid
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 7: VERIFICATION QUERIES
-- ============================================

-- Check tenants table
SELECT * FROM tenants;

-- Check profiles
SELECT 
    p.id,
    p.user_id,
    p.tenant_id,
    p.email,
    p.full_name,
    p.role,
    p.is_protected,
    t.business_name as tenant_name
FROM profiles p
LEFT JOIN tenants t ON p.tenant_id = t.id;

-- Check staff with tenant_id
SELECT id, full_name, role, tenant_id FROM staff LIMIT 5;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('tenants', 'profiles', 'staff', 'clients', 'bookings', 'payments', 'services');

-- ============================================
-- SUCCESS!
-- ============================================

-- Next Steps:
-- 1. Manually create Super Admin user in Supabase Auth
-- 2. Insert Super Admin profile using the commented SQL in STEP 5
-- 3. Create your first tenant
-- 4. Assign existing data to tenant_id (if any)
-- 5. Build Super Admin UI
