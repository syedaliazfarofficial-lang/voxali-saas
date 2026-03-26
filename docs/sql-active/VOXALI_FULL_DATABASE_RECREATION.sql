-- =============================================
-- VOXALI SaaS — COMPLETE DATABASE RECREATION
-- Run this in a FRESH Supabase SQL Editor to create the entire database
-- Date: Feb 28, 2026
-- WARNING: Run on a NEW project or it will DROP everything!
-- =============================================
-- =============================================
-- PART 1: DROP EXISTING (Clean Slate)
-- =============================================
DROP FUNCTION IF EXISTS get_my_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS create_dashboard_user(text, text, text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS delete_dashboard_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_available_slots(uuid, date, uuid [], uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS create_booking_safe(
    uuid,
    uuid,
    uuid,
    uuid,
    timestamptz,
    timestamptz,
    text,
    text,
    text,
    numeric,
    numeric,
    jsonb
) CASCADE;
DROP FUNCTION IF EXISTS fn_queue_booking_notification() CASCADE;
DROP FUNCTION IF EXISTS rpc_dashboard_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS rpc_weekly_revenue(uuid) CASCADE;
DROP FUNCTION IF EXISTS rpc_recent_activity(uuid) CASCADE;
DROP FUNCTION IF EXISTS rpc_analytics_revenue(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS rpc_analytics_services(uuid) CASCADE;
DROP FUNCTION IF EXISTS rpc_analytics_statuses(uuid) CASCADE;
DROP FUNCTION IF EXISTS rpc_staff_board(uuid) CASCADE;
DROP FUNCTION IF EXISTS rpc_block_staff_today(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS rpc_unblock_staff_today(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS rpc_get_tenant_id(text) CASCADE;
DROP FUNCTION IF EXISTS rpc_delete_staff_permanent(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS rpc_check_leave_conflicts(uuid, uuid, date, date) CASCADE;
DROP FUNCTION IF EXISTS rpc_set_staff_leave(uuid, uuid, date, date, text) CASCADE;
DROP FUNCTION IF EXISTS rpc_get_staff_leaves(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS rpc_cancel_staff_leave(uuid, uuid) CASCADE;
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS salon_reviews CASCADE;
DROP TABLE IF EXISTS ai_agent_config CASCADE;
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
-- PART 2: CREATE ALL TABLES
-- =============================================
-- 2.1 TENANTS TABLE
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    -- Branding
    salon_name TEXT DEFAULT 'My Salon',
    salon_tagline TEXT DEFAULT 'Salon & Spa',
    logo_url TEXT DEFAULT NULL,
    owner_name TEXT DEFAULT 'Owner',
    -- Settings
    timezone TEXT DEFAULT 'America/Chicago',
    ai_enabled BOOLEAN DEFAULT TRUE,
    agent_enabled BOOLEAN DEFAULT TRUE,
    default_buffer_min INTEGER DEFAULT 15,
    open_time TIME DEFAULT '09:00',
    close_time TIME DEFAULT '21:00',
    -- Notification settings
    twilio_account_sid TEXT,
    twilio_auth_token TEXT,
    twilio_phone_number TEXT,
    notification_email_from TEXT,
    notifications_enabled BOOLEAN DEFAULT FALSE,
    -- Extra salon info
    salon_email TEXT,
    salon_website TEXT,
    salon_phone_owner TEXT,
    google_review_url TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.2 PROFILES TABLE (Dashboard Login Users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    tenant_id UUID REFERENCES tenants(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (
        role IN ('owner', 'manager', 'stylist', 'super_admin')
    ),
    staff_id UUID,
    profile_picture_url TEXT,
    can_login BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
-- 2.3 STAFF TABLE
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
    commission_percent DECIMAL(5, 2) DEFAULT 0,
    base_salary DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.4 SERVICES TABLE (With Gap Filling Logic)
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL,
    processing_duration INTEGER DEFAULT 0,
    gap_start_offset INTEGER DEFAULT 0,
    can_be_booked_in_gap BOOLEAN DEFAULT FALSE,
    price DECIMAL(10, 2) NOT NULL,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    color TEXT,
    display_order INTEGER DEFAULT 0,
    -- Deposit fields
    deposit_required BOOLEAN DEFAULT FALSE,
    deposit_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.5 CLIENTS TABLE
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
-- 2.6 BOOKINGS TABLE
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    client_id UUID REFERENCES clients(id),
    stylist_id UUID REFERENCES staff(id),
    service_id UUID REFERENCES services(id) NOT NULL,
    -- Time
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    -- Aliases used by create_booking_safe
    start_at TIMESTAMPTZ GENERATED ALWAYS AS (start_time) STORED,
    end_at TIMESTAMPTZ GENERATED ALWAYS AS (end_time) STORED,
    -- Gap Logic
    gap_start_time TIMESTAMPTZ,
    gap_end_time TIMESTAMPTZ,
    is_gap_booking BOOLEAN DEFAULT FALSE,
    -- Status
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
    payment_method TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.7 BOOKING ITEMS TABLE
CREATE TABLE booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES services(id) NOT NULL,
    name_snapshot TEXT,
    price_snapshot DECIMAL(10, 2),
    duration_min_snapshot INTEGER,
    cleanup_buffer_min_snapshot INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.8 STAFF WORKING HOURS
CREATE TABLE staff_working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    staff_id UUID REFERENCES staff(id) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (
        day_of_week BETWEEN 0 AND 6
    ),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.9 STAFF TIME OFF
CREATE TABLE staff_timeoff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    staff_id UUID REFERENCES staff(id) NOT NULL,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.10 STAFF SERVICES (junction table)
CREATE TABLE staff_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) NOT NULL,
    service_id UUID REFERENCES services(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, service_id)
);
-- 2.11 PAYMENTS TABLE
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    client_id UUID REFERENCES clients(id),
    amount DECIMAL(10, 2) NOT NULL,
    tip_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method TEXT,
    stripe_payment_id TEXT,
    payment_link TEXT,
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'completed', 'failed', 'refunded')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.12 PRODUCTS TABLE (Retail Inventory)
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
-- 2.13 WAITLIST TABLE
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
-- 2.14 CALL LOGS TABLE (AI Voice Agent History)
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
-- 2.15 SMS TEMPLATES
CREATE TABLE sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.16 TENANT HOURS (per-day business hours)
CREATE TABLE tenant_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (
        day_of_week BETWEEN 0 AND 6
    ),
    open_time TIME NOT NULL DEFAULT '09:00',
    close_time TIME NOT NULL DEFAULT '21:00',
    is_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, day_of_week)
);
-- 2.17 NOTIFICATION QUEUE
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    event_type TEXT NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    client_phone TEXT,
    client_email TEXT,
    client_name TEXT,
    booking_details JSONB,
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'sent', 'failed', 'skipped')
    ),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
-- 2.18 STAFF PAYMENTS (Ledger)
CREATE TABLE staff_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    staff_id UUID REFERENCES staff(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('advance', 'salary_clearance', 'commission_payout', 'tip_payout')),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.19 EXPENSES TABLE (P&L Tracking)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('supplies', 'machinery', 'rent', 'utilities', 'marketing', 'other')),
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.18 MARKETING CAMPAIGNS
CREATE TABLE marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    audience TEXT DEFAULT 'all_clients' CHECK (
        audience IN (
            'all_clients',
            'vip_only',
            'inactive',
            'new_this_month'
        )
    ),
    channel TEXT DEFAULT 'sms' CHECK (channel IN ('sms', 'email', 'both')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled')),
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.19 AI AGENT CONFIG
CREATE TABLE ai_agent_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL UNIQUE,
    system_prompt TEXT NOT NULL DEFAULT '',
    announcements TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.20 ERROR LOGS
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    source TEXT,
    error_message TEXT,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.21 COMMUNICATIONS (Unified Inbox)
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    client_id UUID REFERENCES clients(id),
    booking_id UUID REFERENCES bookings(id),
    type TEXT NOT NULL CHECK (type IN ('sms', 'email', 'whatsapp')),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'received')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.22 PAYROLL RUNS (Locked Payroll Periods)
CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    staff_id UUID REFERENCES staff(id) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_salary_allocated DECIMAL(10, 2) DEFAULT 0,
    total_commission DECIMAL(10, 2) DEFAULT 0,
    total_tips DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0,
    net_payout DECIMAL(10, 2) GENERATED ALWAYS AS (base_salary_allocated + total_commission + total_tips - deductions) STORED,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2.23 SALON REVIEWS
CREATE TABLE salon_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    client_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_public BOOLEAN DEFAULT false,
    replied_text TEXT,
    replied_at TIMESTAMPTZ
);
-- =============================================
-- PART 3: PERFORMANCE INDEXES
-- =============================================
CREATE INDEX idx_bookings_tenant_id ON bookings(tenant_id);
CREATE INDEX idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX idx_bookings_tenant_start ON bookings(tenant_id, start_time);
CREATE INDEX idx_bookings_stylist_start ON bookings(stylist_id, start_time);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX idx_clients_tenant_phone ON clients(tenant_id, phone);
CREATE INDEX idx_clients_tenant_email ON clients(tenant_id, email);
CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX idx_staff_active ON staff(is_active);
CREATE INDEX idx_services_tenant_id ON services(tenant_id);
CREATE INDEX idx_services_active ON services(is_active);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX idx_call_logs_tenant_id ON call_logs(tenant_id);
CREATE INDEX idx_business_hours_tenant ON tenant_hours(tenant_id, day_of_week);
CREATE INDEX idx_notification_queue_pending ON notification_queue(status, created_at)
WHERE status = 'pending';
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_staff_working_hours_tenant ON staff_working_hours(tenant_id);
CREATE INDEX idx_staff_working_hours_staff ON staff_working_hours(staff_id, day_of_week);
CREATE INDEX idx_marketing_campaigns_tenant ON marketing_campaigns(tenant_id);
CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX idx_staff_payments_tenant ON staff_payments(tenant_id);
CREATE INDEX idx_staff_payments_staff ON staff_payments(staff_id);
CREATE INDEX idx_expenses_tenant ON expenses(tenant_id);
CREATE INDEX idx_expenses_date ON expenses(tenant_id, expense_date);
CREATE INDEX idx_communications_client_id ON communications(client_id);
CREATE INDEX idx_payroll_runs_staff_id ON payroll_runs(staff_id);
-- =============================================
-- PART 4: ROW LEVEL SECURITY (RLS)
-- =============================================
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
ALTER TABLE tenant_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
-- Helper function
CREATE OR REPLACE FUNCTION get_my_tenant_id() RETURNS UUID AS $$
SELECT tenant_id
FROM profiles
WHERE user_id = auth.uid()
LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
-- Profile policies
CREATE POLICY "Users see own profile" ON profiles FOR
SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON profiles FOR
UPDATE USING (user_id = auth.uid());
CREATE POLICY "Allow insert for authenticated" ON profiles FOR
INSERT WITH CHECK (true);
-- Tenant policies
CREATE POLICY "Tenant access" ON tenants FOR ALL USING (id = get_my_tenant_id());
-- Tenant isolation for all tables
CREATE POLICY "Tenant isolation" ON staff FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON services FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON clients FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON bookings FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON products FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON payments FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON waitlist FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON call_logs FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON communications FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON payroll_runs FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON sms_templates FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON staff_working_hours FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON staff_timeoff FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON tenant_hours FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON staff_payments FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "Tenant isolation" ON expenses FOR ALL USING (tenant_id = get_my_tenant_id());
-- Staff services policy (no tenant_id, join through staff)
CREATE POLICY "Staff services access" ON staff_services FOR ALL USING (
    staff_id IN (
        SELECT id
        FROM staff
        WHERE tenant_id = get_my_tenant_id()
    )
);
-- Service role full access for notification_queue
CREATE POLICY "Service role full access on notification_queue" ON notification_queue FOR ALL USING (true) WITH CHECK (true);
-- Marketing & AI config open policies (for anon access via RPC)
CREATE POLICY "anon_marketing_all" ON marketing_campaigns FOR ALL USING (true) WITH CHECK (true);

-- Salon Reviews policies
CREATE POLICY "Super Admin full access on salon_reviews" ON salon_reviews FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'));
CREATE POLICY "Tenants full access to own reviews" ON salon_reviews FOR ALL USING (tenant_id = get_my_tenant_id());
CREATE POLICY "anon_reviews_insert" ON salon_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_reviews_read_public" ON salon_reviews FOR SELECT USING (is_public = true);
CREATE POLICY "anon_ai_config_all" ON ai_agent_config FOR ALL USING (true) WITH CHECK (true);
-- Super Admin policies
CREATE POLICY "Super Admin full tenants access" ON tenants FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'super_admin'
    )
);
CREATE POLICY "Super Admin view all profiles" ON profiles FOR
SELECT TO authenticated USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM profiles sa
            WHERE sa.user_id = auth.uid()
                AND sa.role = 'super_admin'
        )
    );
-- =============================================
-- PART 5: FUNCTIONS — AI Booking System
-- =============================================
-- 5.1 get_available_slots — timezone-aware slot finder
CREATE OR REPLACE FUNCTION get_available_slots(
        p_tenant_id UUID,
        p_date DATE,
        p_service_ids UUID [] DEFAULT NULL,
        p_staff_id UUID DEFAULT NULL,
        p_slot_interval INTEGER DEFAULT 30
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_tenant RECORD;
v_day_of_week INTEGER;
v_total_duration INTEGER := 0;
v_service RECORD;
v_staff RECORD;
v_wh RECORD;
v_slot_start TIME;
v_slot_end TIME;
v_open_time TIME;
v_close_time TIME;
v_is_open BOOLEAN;
v_conflict_count INTEGER;
v_slots JSON [] := '{}';
v_all_services JSON [] := '{}';
v_salon_tz TEXT;
v_slot_utc TIMESTAMPTZ;
BEGIN
SELECT * INTO v_tenant
FROM tenants
WHERE id = p_tenant_id;
IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'Tenant not found');
END IF;
-- Read timezone from tenant table (NOT hardcoded!)
v_salon_tz := COALESCE(v_tenant.timezone, 'America/Chicago');
v_day_of_week := EXTRACT(
    DOW
    FROM p_date
);
SELECT open_time,
    close_time,
    is_open INTO v_open_time,
    v_close_time,
    v_is_open
FROM tenant_hours
WHERE tenant_id = p_tenant_id
    AND day_of_week = v_day_of_week;
IF NOT FOUND THEN v_open_time := v_tenant.open_time;
v_close_time := v_tenant.close_time;
v_is_open := TRUE;
END IF;
IF NOT v_is_open THEN RETURN json_build_object(
    'ok',
    true,
    'date',
    p_date,
    'salon_timezone',
    v_salon_tz,
    'is_closed',
    true,
    'message',
    'Salon is closed on this day',
    'slots',
    '[]'::json
);
END IF;
IF p_service_ids IS NOT NULL
AND array_length(p_service_ids, 1) > 0 THEN FOR v_service IN
SELECT id,
    name,
    duration,
    price
FROM services
WHERE id = ANY(p_service_ids)
    AND tenant_id = p_tenant_id
    AND is_active = TRUE LOOP v_total_duration := v_total_duration + v_service.duration;
v_all_services := v_all_services || json_build_object(
    'id',
    v_service.id,
    'name',
    v_service.name,
    'duration',
    v_service.duration,
    'price',
    v_service.price
);
END LOOP;
END IF;
IF v_total_duration = 0 THEN v_total_duration := 60;
END IF;
v_total_duration := v_total_duration + COALESCE(v_tenant.default_buffer_min, 15);
FOR v_staff IN
SELECT s.id,
    s.full_name
FROM staff s
WHERE s.tenant_id = p_tenant_id
    AND s.is_active = TRUE
    AND s.can_take_bookings = TRUE
    AND (
        p_staff_id IS NULL
        OR s.id = p_staff_id
    )
    AND NOT EXISTS (
        SELECT 1
        FROM staff_timeoff st
        WHERE st.staff_id = s.id
            AND p_date BETWEEN st.start_datetime::date AND st.end_datetime::date
    ) LOOP FOR v_wh IN
SELECT start_time,
    end_time
FROM staff_working_hours
WHERE staff_id = v_staff.id
    AND tenant_id = p_tenant_id
    AND day_of_week = v_day_of_week
    AND is_working = TRUE LOOP v_slot_start := GREATEST(v_wh.start_time, v_open_time);
v_slot_end := LEAST(v_wh.end_time, v_close_time);
WHILE v_slot_start + (v_total_duration || ' minutes')::interval <= v_slot_end LOOP v_slot_utc := (p_date + v_slot_start) AT TIME ZONE v_salon_tz;
SELECT COUNT(*) INTO v_conflict_count
FROM bookings b
WHERE b.stylist_id = v_staff.id
    AND b.status NOT IN ('cancelled', 'no_show')
    AND b.start_time < v_slot_utc + (v_total_duration || ' minutes')::interval
    AND b.end_time > v_slot_utc;
IF v_conflict_count = 0 THEN v_slots := v_slots || json_build_object(
    'staff_id',
    v_staff.id,
    'staff_name',
    v_staff.full_name,
    'time',
    to_char(v_slot_start, 'HH12:MI AM'),
    'time_end',
    to_char(
        (
            v_slot_start + (v_total_duration || ' minutes')::interval
        )::time,
        'HH12:MI AM'
    ),
    'start_at',
    to_char(v_slot_utc, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'end_at',
    to_char(
        v_slot_utc + (v_total_duration || ' minutes')::interval,
        'YYYY-MM-DD"T"HH24:MI:SS"Z"'
    ),
    'display_start',
    to_char(v_slot_start, 'HH12:MI AM'),
    'display_end',
    to_char(
        (
            v_slot_start + (v_total_duration || ' minutes')::interval
        )::time,
        'HH12:MI AM'
    ),
    'total_minutes',
    v_total_duration
);
END IF;
v_slot_start := v_slot_start + (p_slot_interval || ' minutes')::interval;
END LOOP;
END LOOP;
END LOOP;
RETURN json_build_object(
    'ok',
    true,
    'date',
    p_date,
    'salon_timezone',
    v_salon_tz,
    'is_closed',
    false,
    'total_duration_min',
    v_total_duration,
    'slots_count',
    array_length(v_slots, 1),
    'slots',
    to_json(v_slots)
);
END;
$$;
-- 5.2 create_booking_safe — atomic booking with conflict prevention
CREATE OR REPLACE FUNCTION create_booking_safe(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_client_id UUID,
        p_service_id UUID,
        p_start_at TIMESTAMPTZ,
        p_end_at TIMESTAMPTZ,
        p_status TEXT DEFAULT 'pending_deposit',
        p_notes TEXT DEFAULT '',
        p_payment_method TEXT DEFAULT 'card',
        p_total_price NUMERIC DEFAULT 0,
        p_deposit_amount NUMERIC DEFAULT 0,
        p_booking_items JSONB DEFAULT '[]'
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_conflict_count INTEGER;
v_booking_id UUID;
v_item JSONB;
BEGIN
SELECT COUNT(*) INTO v_conflict_count
FROM bookings b
WHERE b.stylist_id = p_staff_id
    AND b.tenant_id = p_tenant_id
    AND b.status NOT IN ('cancelled', 'no_show')
    AND b.start_time < p_end_at
    AND b.end_time > p_start_at;
IF v_conflict_count > 0 THEN RETURN json_build_object(
    'ok',
    false,
    'error',
    'TIME_CONFLICT',
    'message',
    'This time slot is no longer available. Please choose another time.'
);
END IF;
INSERT INTO bookings (
        tenant_id,
        stylist_id,
        client_id,
        service_id,
        start_time,
        end_time,
        status,
        notes,
        payment_method,
        payment_status,
        total_price,
        deposit_amount,
        created_at,
        updated_at
    )
VALUES (
        p_tenant_id,
        p_staff_id,
        p_client_id,
        p_service_id,
        p_start_at,
        p_end_at,
        p_status,
        p_notes,
        p_payment_method,
        CASE
            WHEN p_deposit_amount > 0 THEN 'deposit_pending'
            ELSE 'unpaid'
        END,
        p_total_price,
        p_deposit_amount,
        NOW(),
        NOW()
    )
RETURNING id INTO v_booking_id;
FOR v_item IN
SELECT *
FROM jsonb_array_elements(p_booking_items) LOOP
INSERT INTO booking_items (
        booking_id,
        service_id,
        name_snapshot,
        price_snapshot,
        duration_min_snapshot
    )
VALUES (
        v_booking_id,
        (v_item->>'service_id')::UUID,
        v_item->>'name_snapshot',
        (v_item->>'price_snapshot')::NUMERIC,
        (v_item->>'duration_min_snapshot')::INTEGER
    );
END LOOP;
RETURN json_build_object(
    'ok',
    true,
    'booking_id',
    v_booking_id,
    'status',
    p_status,
    'start_at',
    p_start_at,
    'end_at',
    p_end_at,
    'deposit_required',
    p_deposit_amount > 0,
    'deposit_amount',
    p_deposit_amount
);
END;
$$;
-- 5.3 Notification Trigger — queues email/SMS with SALON TIMEZONE
CREATE OR REPLACE FUNCTION fn_queue_booking_notification() RETURNS TRIGGER AS $$
DECLARE v_client RECORD;
v_service RECORD;
v_stylist RECORD;
v_event TEXT;
v_tenant RECORD;
v_tz TEXT;
BEGIN
SELECT notifications_enabled,
    timezone INTO v_tenant
FROM tenants
WHERE id = NEW.tenant_id;
IF NOT COALESCE(v_tenant.notifications_enabled, FALSE) THEN RETURN NEW;
END IF;
v_tz := COALESCE(v_tenant.timezone, 'America/Chicago');
IF TG_OP = 'INSERT' THEN v_event := 'booking_created';
ELSIF OLD.status IS DISTINCT
FROM NEW.status THEN v_event := 'booking_' || NEW.status;
ELSE RETURN NEW;
END IF;
SELECT name,
    phone,
    email INTO v_client
FROM clients
WHERE id = NEW.client_id;
SELECT name INTO v_service
FROM services
WHERE id = NEW.service_id;
SELECT full_name INTO v_stylist
FROM staff
WHERE id = NEW.stylist_id;
INSERT INTO notification_queue (
        tenant_id,
        event_type,
        booking_id,
        client_phone,
        client_email,
        client_name,
        booking_details
    )
VALUES (
        NEW.tenant_id,
        v_event,
        NEW.id,
        v_client.phone,
        v_client.email,
        v_client.name,
        jsonb_build_object(
            'service',
            v_service.name,
            'stylist',
            v_stylist.full_name,
            'date',
            to_char(NEW.start_time AT TIME ZONE v_tz, 'YYYY-MM-DD'),
            'time',
            to_char(NEW.start_time AT TIME ZONE v_tz, 'HH12:MI AM'),
            'price',
            NEW.total_price,
            'status',
            NEW.status
        )
    );
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 5.4 Notification Trigger
DROP TRIGGER IF EXISTS trg_booking_notification ON bookings;
CREATE TRIGGER trg_booking_notification
AFTER
INSERT
    OR
UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION fn_queue_booking_notification();
-- =============================================
-- PART 6: FUNCTIONS — Dashboard RPC
-- =============================================
-- 6.1 Dashboard Stats
CREATE OR REPLACE FUNCTION rpc_dashboard_stats(p_tenant_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_bookings_today BIGINT;
v_revenue_today NUMERIC;
v_new_clients BIGINT;
v_calls_today BIGINT;
BEGIN
SELECT COUNT(*) INTO v_bookings_today
FROM bookings
WHERE tenant_id = p_tenant_id
    AND start_time::date = CURRENT_DATE;
SELECT COALESCE(SUM(total_price), 0) INTO v_revenue_today
FROM bookings
WHERE tenant_id = p_tenant_id
    AND start_time::date = CURRENT_DATE
    AND status NOT IN ('cancelled', 'no_show');
SELECT COUNT(*) INTO v_new_clients
FROM clients
WHERE tenant_id = p_tenant_id
    AND created_at::date = CURRENT_DATE;
SELECT COUNT(*) INTO v_calls_today
FROM call_logs
WHERE tenant_id = p_tenant_id
    AND created_at::date = CURRENT_DATE;
RETURN json_build_object(
    'bookings_today',
    v_bookings_today,
    'revenue_today',
    v_revenue_today,
    'new_clients',
    v_new_clients,
    'calls_today',
    v_calls_today
);
END;
$$;
-- 6.2 Weekly Revenue
CREATE OR REPLACE FUNCTION rpc_weekly_revenue(p_tenant_id UUID) RETURNS TABLE(day TEXT, revenue NUMERIC) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT TO_CHAR(d.dt, 'Dy') AS day,
    COALESCE(SUM(b.total_price), 0) AS revenue
FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        '1 day'
    ) AS d(dt)
    LEFT JOIN bookings b ON b.tenant_id = p_tenant_id
    AND b.start_time::date = d.dt
    AND b.status NOT IN ('cancelled', 'no_show')
GROUP BY d.dt
ORDER BY d.dt;
END;
$$;
-- 6.3 Recent Activity
CREATE OR REPLACE FUNCTION rpc_recent_activity(p_tenant_id UUID) RETURNS TABLE(
        id UUID,
        client_name TEXT,
        service_name TEXT,
        stylist_name TEXT,
        status TEXT,
        start_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT b.id,
    COALESCE(c.name, 'Walk-in'),
    COALESCE(s.name, 'Unknown'),
    COALESCE(st.full_name, 'Any'),
    b.status,
    b.start_time,
    b.created_at
FROM bookings b
    LEFT JOIN clients c ON c.id = b.client_id
    LEFT JOIN services s ON s.id = b.service_id
    LEFT JOIN staff st ON st.id = b.stylist_id
WHERE b.tenant_id = p_tenant_id
ORDER BY b.created_at DESC
LIMIT 10;
END;
$$;
-- 6.4 Analytics Revenue
CREATE OR REPLACE FUNCTION rpc_analytics_revenue(p_tenant_id UUID, p_days INTEGER DEFAULT 30) RETURNS TABLE(day DATE, revenue NUMERIC, booking_count BIGINT) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT d.dt::date,
    COALESCE(SUM(b.total_price), 0),
    COUNT(b.id)
FROM generate_series(
        CURRENT_DATE - (p_days - 1) * INTERVAL '1 day',
        CURRENT_DATE,
        '1 day'
    ) AS d(dt)
    LEFT JOIN bookings b ON b.tenant_id = p_tenant_id
    AND b.start_time::date = d.dt
    AND b.status NOT IN ('cancelled', 'no_show')
GROUP BY d.dt
ORDER BY d.dt;
END;
$$;
-- 6.5 Analytics Services
CREATE OR REPLACE FUNCTION rpc_analytics_services(p_tenant_id UUID) RETURNS TABLE(
        service_name TEXT,
        booking_count BIGINT,
        total_revenue NUMERIC
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT s.name,
    COUNT(b.id),
    COALESCE(SUM(b.total_price), 0)
FROM bookings b
    JOIN services s ON s.id = b.service_id
WHERE b.tenant_id = p_tenant_id
    AND b.status NOT IN ('cancelled', 'no_show')
GROUP BY s.name
ORDER BY total_revenue DESC;
END;
$$;
-- 6.6 Analytics Statuses
CREATE OR REPLACE FUNCTION rpc_analytics_statuses(p_tenant_id UUID) RETURNS TABLE(status TEXT, count BIGINT) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT b.status,
    COUNT(*)
FROM bookings b
WHERE b.tenant_id = p_tenant_id
GROUP BY b.status
ORDER BY count DESC;
END;
$$;
-- 6.7 Staff Board
CREATE OR REPLACE FUNCTION rpc_staff_board(p_tenant_id UUID) 
RETURNS TABLE(
        id UUID,
        full_name TEXT,
        role TEXT,
        color TEXT,
        is_active BOOLEAN,
        bookings_count BIGINT,
        revenue NUMERIC,
        is_blocked_today BOOLEAN,
        commission_percent NUMERIC,
        base_salary NUMERIC
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT s.id,
    s.full_name,
    s.role,
    s.color,
    s.is_active,
    COUNT(b.id),
    COALESCE(SUM(b.total_price), 0),
    EXISTS(
        SELECT 1
        FROM staff_timeoff t
        WHERE t.staff_id = s.id
            AND t.start_datetime::date <= CURRENT_DATE
            AND t.end_datetime::date >= CURRENT_DATE
    ),
    s.commission_percent,
    s.base_salary
FROM staff s
    LEFT JOIN bookings b ON b.stylist_id = s.id
    AND b.start_time >= date_trunc('month', CURRENT_DATE)
    AND b.status NOT IN ('cancelled', 'no_show')
WHERE s.tenant_id = p_tenant_id
GROUP BY s.id,
    s.full_name,
    s.role,
    s.color,
    s.is_active,
    s.commission_percent,
    s.base_salary
ORDER BY revenue DESC;
END;
$$;

-- 6.7.1 Update Staff Payroll
CREATE OR REPLACE FUNCTION rpc_update_payroll(
    p_tenant_id UUID, 
    p_staff_id UUID, 
    p_commission NUMERIC,
    p_salary NUMERIC
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE staff 
    SET commission_percent = p_commission,
        base_salary = p_salary
    WHERE id = p_staff_id AND tenant_id = p_tenant_id;
    
    RETURN json_build_object('success', true);
END;
$$;
-- 6.8 Block/Unblock Staff
CREATE OR REPLACE FUNCTION rpc_block_staff_today(p_tenant_id UUID, p_staff_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_existing BIGINT;
BEGIN
SELECT COUNT(*) INTO v_existing
FROM staff_timeoff
WHERE staff_id = p_staff_id
    AND start_datetime::date = CURRENT_DATE;
IF v_existing > 0 THEN RETURN json_build_object(
    'success',
    false,
    'error',
    'Already blocked today'
);
END IF;
INSERT INTO staff_timeoff (
        tenant_id,
        staff_id,
        start_datetime,
        end_datetime,
        reason
    )
VALUES (
        p_tenant_id,
        p_staff_id,
        CURRENT_DATE::timestamptz,
        (
            CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second'
        )::timestamptz,
        'Sick Day (blocked from dashboard)'
    );
RETURN json_build_object('success', true);
END;
$$;
CREATE OR REPLACE FUNCTION rpc_unblock_staff_today(p_tenant_id UUID, p_staff_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
DELETE FROM staff_timeoff
WHERE staff_id = p_staff_id
    AND tenant_id = p_tenant_id
    AND start_datetime::date = CURRENT_DATE;
RETURN json_build_object('success', true);
END;
$$;
-- 6.9 Get Tenant ID by slug
CREATE OR REPLACE FUNCTION rpc_get_tenant_id(p_slug TEXT DEFAULT 'luxe-aurea') RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
SELECT id INTO v_id
FROM tenants
WHERE slug = p_slug
LIMIT 1;
RETURN v_id;
END;
$$;
-- =============================================
-- PART 7: FUNCTIONS — Staff Leave Management
-- =============================================
CREATE OR REPLACE FUNCTION rpc_delete_staff_permanent(p_tenant_id UUID, p_staff_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_active BOOLEAN;
BEGIN
SELECT is_active INTO v_active
FROM staff
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
IF v_active IS NULL THEN RETURN json_build_object('success', false, 'error', 'Staff not found');
END IF;
IF v_active = true THEN RETURN json_build_object(
    'success',
    false,
    'error',
    'Cannot delete active staff. Deactivate first.'
);
END IF;
DELETE FROM staff_timeoff
WHERE staff_id = p_staff_id
    AND tenant_id = p_tenant_id;
DELETE FROM staff_services
WHERE staff_id = p_staff_id;
UPDATE bookings
SET stylist_id = NULL
WHERE stylist_id = p_staff_id
    AND tenant_id = p_tenant_id;
DELETE FROM staff
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true);
END;
$$;
CREATE OR REPLACE FUNCTION rpc_check_leave_conflicts(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_start_date DATE,
        p_end_date DATE
    ) RETURNS TABLE(
        booking_id UUID,
        client_name TEXT,
        service_name TEXT,
        start_time TIMESTAMPTZ,
        status TEXT
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT b.id,
    COALESCE(c.name, 'Walk-in'),
    COALESCE(s.name, 'Unknown'),
    b.start_time,
    b.status
FROM bookings b
    LEFT JOIN clients c ON c.id = b.client_id
    LEFT JOIN services s ON s.id = b.service_id
WHERE b.tenant_id = p_tenant_id
    AND b.stylist_id = p_staff_id
    AND b.start_time::date >= p_start_date
    AND b.start_time::date <= p_end_date
    AND b.status NOT IN ('cancelled', 'no_show')
ORDER BY b.start_time;
END;
$$;
CREATE OR REPLACE FUNCTION rpc_set_staff_leave(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_start_date DATE,
        p_end_date DATE,
        p_reason TEXT DEFAULT 'Leave'
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
INSERT INTO staff_timeoff (
        tenant_id,
        staff_id,
        start_datetime,
        end_datetime,
        reason
    )
VALUES (
        p_tenant_id,
        p_staff_id,
        p_start_date::timestamptz,
        (
            p_end_date + INTERVAL '1 day' - INTERVAL '1 second'
        )::timestamptz,
        p_reason
    )
RETURNING id INTO v_id;
RETURN json_build_object('success', true, 'leave_id', v_id);
END;
$$;
CREATE OR REPLACE FUNCTION rpc_get_staff_leaves(p_tenant_id UUID, p_staff_id UUID) RETURNS TABLE(
        id UUID,
        start_datetime TIMESTAMPTZ,
        end_datetime TIMESTAMPTZ,
        reason TEXT
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT t.id,
    t.start_datetime,
    t.end_datetime,
    t.reason
FROM staff_timeoff t
WHERE t.tenant_id = p_tenant_id
    AND t.staff_id = p_staff_id
    AND t.end_datetime >= NOW()
ORDER BY t.start_datetime;
END;
$$;
CREATE OR REPLACE FUNCTION rpc_cancel_staff_leave(p_tenant_id UUID, p_leave_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
DELETE FROM staff_timeoff
WHERE id = p_leave_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true);
END;
$$;
-- =============================================
-- PART 8: FUNCTIONS — User Management
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
BEGIN IF EXISTS (
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
SELECT id INTO v_tenant_id
FROM tenants
LIMIT 1;
IF p_role NOT IN ('owner', 'manager', 'stylist') THEN RETURN json_build_object('success', false, 'error', 'Invalid role');
END IF;
IF LENGTH(p_password) < 6 THEN RETURN json_build_object(
    'success',
    false,
    'error',
    'Password must be at least 6 characters'
);
END IF;
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
-- PART 9: GRANT PERMISSIONS
-- =============================================
GRANT EXECUTE ON FUNCTION get_available_slots TO anon,
    authenticated,
    service_role;
GRANT EXECUTE ON FUNCTION create_booking_safe TO service_role;
GRANT EXECUTE ON FUNCTION rpc_dashboard_stats TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_weekly_revenue TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_recent_activity TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_analytics_revenue TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_analytics_services TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_analytics_statuses TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_staff_board TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_block_staff_today TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_unblock_staff_today TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_tenant_id TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_delete_staff_permanent(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_check_leave_conflicts(UUID, UUID, DATE, DATE) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_set_staff_leave(UUID, UUID, DATE, DATE, TEXT) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_staff_leaves(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_cancel_staff_leave(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION create_dashboard_user TO anon,
    authenticated,
    service_role;
-- =============================================
-- PART 10: pg_cron (Enable extension first in Dashboard > Database > Extensions)
-- =============================================
-- After enabling pg_cron extension, run:
-- SELECT cron.schedule(
--     'process-notification-queue',
--     '* * * * *',
--     $$
--     SELECT net.http_post(
--         url := 'YOUR_SUPABASE_URL/functions/v1/send-notification',
--         headers := jsonb_build_object(
--             'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--             'Content-Type', 'application/json'
--         ),
--         body := '{}'::jsonb
--     );
--     $$
-- );
-- =============================================
-- VERIFY
-- =============================================
SELECT '✅ VOXALI DATABASE RECREATION COMPLETE!' as status;
SELECT count(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public';
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
ORDER BY routine_name;