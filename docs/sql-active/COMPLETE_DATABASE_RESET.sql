-- =============================================
-- COMPLETE DATABASE RESET + FRESH ENTERPRISE SCHEMA
-- WARNING: This will DELETE ALL DATA!
-- Run this in Supabase SQL Editor
-- =============================================
-- =============================================
-- STEP 1: DROP ALL FUNCTIONS FIRST
-- =============================================
DROP FUNCTION IF EXISTS get_my_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS create_dashboard_user(text, text, text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS delete_dashboard_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
-- =============================================
-- STEP 2: DROP ALL TABLES (Order matters - dependencies first)
-- =============================================
-- Drop tables with foreign keys first
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS waitlist CASCADE;
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS sms_templates CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS staff_services CASCADE;
DROP TABLE IF EXISTS staff_timeoff CASCADE;
DROP TABLE IF EXISTS staff_working_hours CASCADE;
DROP TABLE IF EXISTS staff_roles CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS business_settings CASCADE;
DROP TABLE IF EXISTS tenant_hours CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
-- =============================================
-- STEP 3: CREATE FRESH ENTERPRISE SCHEMA
-- =============================================
-- TENANTS TABLE (Your Salons)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    timezone TEXT DEFAULT 'America/Chicago',
    ai_enabled BOOLEAN DEFAULT TRUE,
    agent_enabled BOOLEAN DEFAULT TRUE,
    default_buffer_min INTEGER DEFAULT 15,
    open_time TIME DEFAULT '09:00',
    close_time TIME DEFAULT '21:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- PROFILES TABLE (Dashboard Login Users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    tenant_id UUID REFERENCES tenants(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'stylist')),
    staff_id UUID,
    profile_picture_url TEXT,
    can_login BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
-- STAFF TABLE (Employees who work in salon)
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'stylist' CHECK (role IN ('owner', 'manager', 'stylist')),
    color TEXT DEFAULT '#4ECDC4',
    profile_picture_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    can_take_bookings BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- SERVICES TABLE (With Gap Filling Logic!)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL,
    -- Total duration in minutes
    processing_duration INTEGER DEFAULT 0,
    -- Gap duration (stylist free time)
    gap_start_offset INTEGER DEFAULT 0,
    -- When gap starts after service begins
    can_be_booked_in_gap BOOLEAN DEFAULT FALSE,
    -- Can this fit in someone's gap?
    price DECIMAL(10, 2) NOT NULL,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    color TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- CLIENTS TABLE
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    is_vip BOOLEAN DEFAULT FALSE,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- BOOKINGS TABLE (The Brain - With Gap Logic!)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    client_id UUID REFERENCES clients(id),
    stylist_id UUID REFERENCES staff(id) NOT NULL,
    service_id UUID REFERENCES services(id) NOT NULL,
    -- Time Logic
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    -- Gap Logic
    gap_start_time TIMESTAMPTZ,
    gap_end_time TIMESTAMPTZ,
    is_gap_booking BOOLEAN DEFAULT FALSE,
    -- Status & Money
    status TEXT DEFAULT 'pending' CHECK (
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
    ),
    total_price DECIMAL(10, 2),
    deposit_amount DECIMAL(10, 2),
    stripe_payment_intent_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- STAFF WORKING HOURS
CREATE TABLE staff_working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    staff_id UUID REFERENCES staff(id) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (
        day_of_week BETWEEN 0 AND 6
    ),
    -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- STAFF TIME OFF
CREATE TABLE staff_timeoff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    staff_id UUID REFERENCES staff(id) NOT NULL,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- STAFF SERVICES (Which staff can do which services)
CREATE TABLE staff_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) NOT NULL,
    service_id UUID REFERENCES services(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, service_id)
);
-- PAYMENTS
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    client_id UUID REFERENCES clients(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT,
    stripe_payment_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'completed', 'failed', 'refunded')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- PRODUCTS (Retail Inventory)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2),
    quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    category TEXT,
    brand TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- WAITLIST
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    service_id UUID REFERENCES services(id),
    preferred_date DATE,
    preferred_time TEXT,
    notes TEXT,
    status TEXT DEFAULT 'waiting' CHECK (
        status IN ('waiting', 'contacted', 'booked', 'cancelled')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- CALL LOGS (AI Voice Agent History)
CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    caller_phone TEXT,
    call_duration INTEGER,
    transcript TEXT,
    action_taken TEXT,
    booking_id UUID REFERENCES bookings(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- SMS TEMPLATES
CREATE TABLE sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- STEP 4: CREATE PERFORMANCE INDEXES
-- =============================================
CREATE INDEX idx_bookings_tenant_start ON bookings(tenant_id, start_time);
CREATE INDEX idx_bookings_stylist_start ON bookings(stylist_id, start_time);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_clients_tenant_phone ON clients(tenant_id, phone);
CREATE INDEX idx_clients_tenant_email ON clients(tenant_id, email);
CREATE INDEX idx_staff_tenant ON staff(tenant_id);
CREATE INDEX idx_staff_active ON staff(is_active);
CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_services_active ON services(is_active);
CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
-- =============================================
-- STEP 5: CREATE RLS POLICIES (FIXED - No Infinite Loop)
-- =============================================
-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_timeoff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;
-- Helper function for tenant isolation
CREATE OR REPLACE FUNCTION get_my_tenant_id() RETURNS UUID AS $$
SELECT tenant_id
FROM profiles
WHERE user_id = auth.uid()
LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
-- Profiles: User sees only own profile
CREATE POLICY "Users see own profile" ON profiles FOR
SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON profiles FOR
UPDATE USING (user_id = auth.uid());
CREATE POLICY "Allow insert for authenticated" ON profiles FOR
INSERT WITH CHECK (true);
-- Tenants: Users see their tenant
CREATE POLICY "Tenant access" ON tenants FOR ALL USING (id = get_my_tenant_id());
-- All other tables: Tenant isolation
CREATE POLICY "Tenant isolation" ON staff FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON services FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON clients FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON bookings FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON products FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON payments FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON waitlist FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON call_logs FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON sms_templates FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON staff_working_hours FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON staff_timeoff FOR ALL USING (tenant_id = get_my_tenant_id());
-- Staff services (no tenant_id, join through staff)
CREATE POLICY "Staff services access" ON staff_services FOR ALL USING (
    staff_id IN (
        SELECT id
        FROM staff
        WHERE tenant_id = get_my_tenant_id()
    )
);
-- =============================================
-- STEP 6: INSERT INITIAL DATA
-- =============================================
-- Create your salon
INSERT INTO tenants (name, slug, timezone, open_time, close_time)
VALUES (
        'Luxe Aurea',
        'luxe-aurea',
        'America/Chicago',
        '09:00',
        '21:00'
    );
-- Create owner profile (linked to existing auth user)
INSERT INTO profiles (
        user_id,
        tenant_id,
        email,
        full_name,
        role,
        can_login
    )
SELECT au.id,
    (
        SELECT id
        FROM tenants
        WHERE slug = 'luxe-aurea'
    ),
    'owner@gmail.com',
    'Jazil',
    'owner',
    true
FROM auth.users au
WHERE au.email = 'owner@gmail.com';
-- Create staff members
INSERT INTO staff (
        tenant_id,
        full_name,
        email,
        role,
        color,
        can_take_bookings
    )
VALUES (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'Sarah Johnson',
        'sarah@luxeaurea.com',
        'manager',
        '#FF6B6B',
        true
    ),
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'Emily Davis',
        'emily@luxeaurea.com',
        'stylist',
        '#4ECDC4',
        true
    ),
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'Jessica Brown',
        'jessica@luxeaurea.com',
        'stylist',
        '#95E1D3',
        true
    );
-- Create services (With Gap Filling Logic!)
INSERT INTO services (
        tenant_id,
        name,
        description,
        duration,
        processing_duration,
        gap_start_offset,
        can_be_booked_in_gap,
        price,
        category
    )
VALUES -- Hair Color has 45 min gap after 60 mins
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'Hair Color',
        'Full hair coloring service',
        180,
        45,
        60,
        false,
        120.00,
        'Hair'
    ),
    -- Regular services
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'Haircut',
        'Professional haircut and styling',
        60,
        0,
        0,
        false,
        50.00,
        'Hair'
    ),
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'Highlights',
        'Partial or full highlights',
        120,
        30,
        45,
        false,
        95.00,
        'Hair'
    ),
    -- Small services that CAN be booked in gaps
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'Blow Dry',
        'Professional blow dry and styling',
        30,
        0,
        0,
        true,
        35.00,
        'Hair'
    ),
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'Deep Conditioning',
        'Intensive hair treatment',
        45,
        0,
        0,
        true,
        45.00,
        'Treatment'
    ),
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'Manicure',
        'Classic manicure',
        30,
        0,
        0,
        true,
        25.00,
        'Nails'
    ),
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'Pedicure',
        'Spa pedicure',
        45,
        0,
        0,
        true,
        40.00,
        'Nails'
    );
-- Create SMS templates
INSERT INTO sms_templates (tenant_id, name, template)
VALUES (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'booking_confirmation',
        'Hi {client_name}! Your appointment at Luxe Aurea is confirmed for {date} at {time} with {stylist}. Reply CANCEL to cancel.'
    ),
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'reminder_24h',
        'Reminder: Your appointment at Luxe Aurea is tomorrow at {time}. See you soon!'
    ),
    (
        (
            SELECT id
            FROM tenants
            WHERE slug = 'luxe-aurea'
        ),
        'review_request',
        'Thanks for visiting Luxe Aurea! We hope you loved your service. Please leave us a review: {review_link}'
    );
-- =============================================
-- STEP 7: CREATE USER MANAGEMENT FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION create_dashboard_user(
        p_email TEXT,
        p_password TEXT,
        p_full_name TEXT,
        p_role TEXT,
        p_staff_id UUID DEFAULT NULL
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_user_id UUID;
v_tenant_id UUID;
BEGIN -- Check if email already exists
IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = p_email
) THEN RETURN json_build_object(
    'success',
    false,
    'error',
    'Email already registered'
);
END IF;
-- Get tenant_id
SELECT id INTO v_tenant_id
FROM tenants
LIMIT 1;
-- Validate role
IF p_role NOT IN ('owner', 'manager', 'stylist') THEN RETURN json_build_object('success', false, 'error', 'Invalid role');
END IF;
-- Validate password
IF LENGTH(p_password) < 6 THEN RETURN json_build_object(
    'success',
    false,
    'error',
    'Password must be at least 6 characters'
);
END IF;
-- Create auth user
INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        jsonb_build_object('full_name', p_full_name, 'role', p_role),
        NOW(),
        NOW()
    )
RETURNING id INTO v_user_id;
-- Create profile
INSERT INTO profiles (
        user_id,
        tenant_id,
        email,
        full_name,
        role,
        staff_id,
        can_login
    )
VALUES (
        v_user_id,
        v_tenant_id,
        p_email,
        p_full_name,
        p_role,
        p_staff_id,
        true
    );
RETURN json_build_object('success', true, 'user_id', v_user_id);
END;
$$;
-- =============================================
-- VERIFY SETUP
-- =============================================
SELECT '✅ Database reset complete!' as status;
SELECT 'Tenant: ' || name || ' (' || timezone || ')' as tenant
FROM tenants;
SELECT 'Staff: ' || COUNT(*) || ' members' as staff
FROM staff;
SELECT 'Services: ' || COUNT(*) || ' items' as services
FROM services;
SELECT 'Owner Profile: ' || email as owner
FROM profiles
WHERE role = 'owner';