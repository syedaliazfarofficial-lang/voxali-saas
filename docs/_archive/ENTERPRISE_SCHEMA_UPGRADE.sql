-- =============================================
-- ENTERPRISE SAAS SCHEMA UPGRADE
-- Based on Gemini's Professional Review
-- Run this in Supabase SQL Editor
-- =============================================
-- =============================================
-- PART 1: ADD tenant_id TO ALL TABLES (Multi-Tenancy)
-- =============================================
-- Get our tenant ID first
DO $$
DECLARE v_tenant_id UUID;
BEGIN
SELECT id INTO v_tenant_id
FROM tenants
LIMIT 1;
RAISE NOTICE 'Your Tenant ID: %', v_tenant_id;
END $$;
-- Add tenant_id to profiles (if not exists)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE profiles
SET tenant_id = (
        SELECT id
        FROM tenants
        LIMIT 1
    )
WHERE tenant_id IS NULL;
-- Add tenant_id to staff (if not exists)  
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE staff
SET tenant_id = (
        SELECT id
        FROM tenants
        LIMIT 1
    )
WHERE tenant_id IS NULL;
-- Add tenant_id to services (if not exists)
ALTER TABLE services
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE services
SET tenant_id = (
        SELECT id
        FROM tenants
        LIMIT 1
    )
WHERE tenant_id IS NULL;
-- Add tenant_id to clients (if not exists)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE clients
SET tenant_id = (
        SELECT id
        FROM tenants
        LIMIT 1
    )
WHERE tenant_id IS NULL;
-- Add tenant_id to bookings (if not exists)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE bookings
SET tenant_id = (
        SELECT id
        FROM tenants
        LIMIT 1
    )
WHERE tenant_id IS NULL;
-- Add tenant_id to payments (if not exists)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE payments
SET tenant_id = (
        SELECT id
        FROM tenants
        LIMIT 1
    )
WHERE tenant_id IS NULL;
-- Add tenant_id to waitlist (if not exists)
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE waitlist
SET tenant_id = (
        SELECT id
        FROM tenants
        LIMIT 1
    )
WHERE tenant_id IS NULL;
-- Add tenant_id to call_logs (if not exists)
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE call_logs
SET tenant_id = (
        SELECT id
        FROM tenants
        LIMIT 1
    )
WHERE tenant_id IS NULL;
-- =============================================
-- PART 2: UPGRADE SERVICES TABLE (Gap Filling Logic)
-- =============================================
-- Add processing/gap columns to services
ALTER TABLE services
ADD COLUMN IF NOT EXISTS processing_duration INTEGER DEFAULT 0,
    -- Gap duration in minutes
ADD COLUMN IF NOT EXISTS gap_start_offset INTEGER DEFAULT 0,
    -- When gap starts (mins after service begins)
ADD COLUMN IF NOT EXISTS can_be_booked_in_gap BOOLEAN DEFAULT FALSE;
-- Can this fit in someone's gap?
-- Example: Update Hair Color for gap filling
-- Hair Color = 3 hours total
-- First 60 mins: Apply color (Busy)
-- Next 45 mins: Processing (Stylist FREE - this is the gap)
-- Last 75 mins: Wash/Style (Busy)
UPDATE services
SET processing_duration = 45,
    gap_start_offset = 60
WHERE name = 'Hair Color';
-- Short services can be booked in gaps
UPDATE services
SET can_be_booked_in_gap = TRUE
WHERE duration <= 30;
-- Blow Dry, Manicure etc.
-- =============================================
-- PART 3: UPGRADE BOOKINGS TABLE
-- =============================================
-- Add gap columns to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS gap_start_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS gap_end_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_gap_booking BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
-- Update status constraint for more options
-- First check if constraint exists and drop it
DO $$ BEGIN
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
EXCEPTION
WHEN OTHERS THEN NULL;
END $$;
-- Add new status options
ALTER TABLE bookings
ADD CONSTRAINT bookings_status_check CHECK (
        status IN (
            'pending_deposit',
            'pending',
            'confirmed',
            'checked_in',
            'in_progress',
            'completed',
            'cancelled',
            'no_show'
        )
    );
-- =============================================
-- PART 4: CREATE PRODUCTS TABLE (Retail Inventory)
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2),
    -- Purchase cost
    quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    category TEXT,
    brand TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- PART 5: CREATE SMS TEMPLATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    -- 'booking_confirmation', 'reminder_24h', 'review_request'
    template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Insert default templates
INSERT INTO sms_templates (tenant_id, name, template)
SELECT (
        SELECT id
        FROM tenants
        LIMIT 1
    ), 'booking_confirmation', 'Hi {client_name}! Your appointment at {salon_name} is confirmed for {date} at {time} with {stylist}. Reply CANCEL to cancel.'
WHERE NOT EXISTS (
        SELECT 1
        FROM sms_templates
        WHERE name = 'booking_confirmation'
    );
INSERT INTO sms_templates (tenant_id, name, template)
SELECT (
        SELECT id
        FROM tenants
        LIMIT 1
    ), 'reminder_24h', 'Reminder: Your appointment at {salon_name} is tomorrow at {time}. See you soon!'
WHERE NOT EXISTS (
        SELECT 1
        FROM sms_templates
        WHERE name = 'reminder_24h'
    );
-- =============================================
-- PART 6: PERFORMANCE INDEXES
-- =============================================
-- Booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_start ON bookings(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_stylist_start ON bookings(stylist_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
-- Client lookup (for AI)
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_email ON clients(tenant_id, email);
-- Staff queries
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);
-- Services
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
-- =============================================
-- PART 7: FIXED RLS POLICIES (No Infinite Loop)
-- Gemini's fix: Use SECURITY DEFINER function to avoid recursion
-- =============================================
-- 1. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
-- 2. Drop ALL existing policies
DROP POLICY IF EXISTS "tenant_isolation" ON profiles;
DROP POLICY IF EXISTS "tenant_isolation" ON staff;
DROP POLICY IF EXISTS "tenant_isolation" ON services;
DROP POLICY IF EXISTS "tenant_isolation" ON clients;
DROP POLICY IF EXISTS "tenant_isolation" ON bookings;
DROP POLICY IF EXISTS "tenant_isolation" ON products;
DROP POLICY IF EXISTS "Users can see own profile" ON profiles;
DROP POLICY IF EXISTS "tenant_isolation_staff" ON staff;
DROP POLICY IF EXISTS "tenant_isolation_services" ON services;
DROP POLICY IF EXISTS "tenant_isolation_clients" ON clients;
DROP POLICY IF EXISTS "tenant_isolation_bookings" ON bookings;
DROP POLICY IF EXISTS "tenant_isolation_products" ON products;
DROP POLICY IF EXISTS "tenant_isolation_sms" ON sms_templates;
-- 3. Profiles Policy (THE FIX - No Tenant Check to avoid loop)
-- User sirf apna profile dekh sakta hai
CREATE POLICY "Users can see own profile" ON profiles FOR
SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR
UPDATE USING (user_id = auth.uid());
-- 4. Generic Tenant Policy Function (Cleaner approach)
-- Ye function check karega ke user kis tenant ka hai
CREATE OR REPLACE FUNCTION get_my_tenant_id() RETURNS UUID AS $$
SELECT tenant_id
FROM profiles
WHERE user_id = auth.uid()
LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
-- 5. Policies for OTHER tables (Using the function)
-- Staff
CREATE POLICY "tenant_isolation_staff" ON staff FOR ALL USING (tenant_id = get_my_tenant_id());
-- Services  
CREATE POLICY "tenant_isolation_services" ON services FOR ALL USING (tenant_id = get_my_tenant_id());
-- Clients
CREATE POLICY "tenant_isolation_clients" ON clients FOR ALL USING (tenant_id = get_my_tenant_id());
-- Bookings
CREATE POLICY "tenant_isolation_bookings" ON bookings FOR ALL USING (tenant_id = get_my_tenant_id());
-- Products
CREATE POLICY "tenant_isolation_products" ON products FOR ALL USING (tenant_id = get_my_tenant_id());
-- SMS Templates
CREATE POLICY "tenant_isolation_sms" ON sms_templates FOR ALL USING (tenant_id = get_my_tenant_id());
-- =============================================
-- VERIFY CHANGES
-- =============================================
SELECT 'Schema upgrade complete!' as status;
-- Show updated services with gap columns
SELECT name,
    duration,
    processing_duration,
    gap_start_offset,
    can_be_booked_in_gap
FROM services;
-- Show all tables with tenant_id
SELECT table_name,
    column_name
FROM information_schema.columns
WHERE column_name = 'tenant_id'
    AND table_schema = 'public'
ORDER BY table_name;