-- ============================================
-- CLEAN SETUP - SINGLE SALON (LUXE AUREA)
-- Fresh Start - Delete Old, Create New
-- ============================================

-- ⚠️ WARNING: This will DELETE ALL existing data!
-- Make sure you want a fresh start before running!

-- ============================================
-- STEP 1: DROP ALL EXISTING TABLES
-- ============================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS business_settings CASCADE;

-- Drop functions and triggers
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- STEP 2: CREATE FRESH TABLES
-- ============================================

-- ==========================================
-- PROFILES TABLE (User Logins)
-- ==========================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'stylist')),
    staff_id UUID, -- Links to staff table (NULL for owner)
    profile_picture_url TEXT,
    can_login BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX profiles_user_id_idx ON profiles(user_id);
CREATE INDEX profiles_email_idx ON profiles(email);
CREATE INDEX profiles_role_idx ON profiles(role);

COMMENT ON TABLE profiles IS 'User accounts with login credentials and roles';
COMMENT ON COLUMN profiles.role IS 'owner = full access, manager = view/edit all, stylist = own bookings only';

-- ==========================================
-- BUSINESS SETTINGS (Luxe Aurea Details)
-- ==========================================
CREATE TABLE business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT DEFAULT 'Luxe Aurea',
    phone TEXT,
    email TEXT,
    address TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    currency TEXT DEFAULT 'USD',
    
    -- Business Hours (JSONB)
    business_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "18:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
        "thursday": {"open": "09:00", "close": "18:00", "closed": false},
        "friday": {"open": "09:00", "close": "18:00", "closed": false},
        "saturday": {"open": "10:00", "close": "16:00", "closed": false},
        "sunday": {"open": "00:00", "close": "00:00", "closed": true}
    }'::jsonb,
    
    -- Booking Settings
    booking_buffer_minutes INT DEFAULT 15,
    allow_online_booking BOOLEAN DEFAULT true,
    require_deposit BOOLEAN DEFAULT false,
    deposit_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Voice Agent Settings
    agent_enabled BOOLEAN DEFAULT true,
    agent_phone_number TEXT,
    elevenlabs_agent_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO business_settings (business_name, phone, email) 
VALUES ('Luxe Aurea', '', '');

COMMENT ON TABLE business_settings IS 'Salon business information and settings';

-- ==========================================
-- STAFF TABLE
-- ==========================================
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT CHECK (role IN ('owner', 'manager', 'stylist', 'receptionist')) DEFAULT 'stylist',
    
    -- Display
    color TEXT DEFAULT '#4ECDC4',
    profile_picture_url TEXT,
    
    -- Working Hours (JSONB) - can override business hours
    working_hours JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    can_take_bookings BOOLEAN DEFAULT true,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX staff_is_active_idx ON staff(is_active);
CREATE INDEX staff_role_idx ON staff(role);

COMMENT ON TABLE staff IS 'Staff members (stylists, managers)';

-- ==========================================
-- SERVICES TABLE
-- ==========================================
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    duration INT NOT NULL, -- minutes
    price DECIMAL(10,2) NOT NULL,
    
    -- Category
    category TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Display
    color TEXT,
    display_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX services_is_active_idx ON services(is_active);
CREATE INDEX services_category_idx ON services(category);

COMMENT ON TABLE services IS 'Services offered by the salon';

-- ==========================================
-- CLIENTS TABLE
-- ==========================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    
    -- Preferences
    notes TEXT,
    preferred_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_vip BOOLEAN DEFAULT false,
    
    -- Stats (auto-calculated)
    total_visits INT DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    last_visit_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX clients_email_idx ON clients(email);
CREATE INDEX clients_phone_idx ON clients(phone);
CREATE INDEX clients_is_active_idx ON clients(is_active);

COMMENT ON TABLE clients IS 'Customer information';

-- ==========================================
-- BOOKINGS TABLE
-- ==========================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    
    -- Date & Time
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Status
    status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'confirmed',
    
    -- Client Info (saved at booking time)
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT,
    
    -- Service Info (saved at booking time)
    service_name TEXT NOT NULL,
    service_duration INT NOT NULL,
    service_price DECIMAL(10,2),
    
    -- Staff Info
    staff_name TEXT NOT NULL,
    
    -- Metadata
    notes TEXT,
    cancellation_reason TEXT,
    created_by TEXT, -- 'voice_agent', 'dashboard', 'online'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX bookings_date_idx ON bookings(booking_date);
CREATE INDEX bookings_staff_date_idx ON bookings(staff_id, booking_date);
CREATE INDEX bookings_client_idx ON bookings(client_id);
CREATE INDEX bookings_status_idx ON bookings(status);

COMMENT ON TABLE bookings IS 'Appointment bookings';

-- ==========================================
-- PAYMENTS TABLE
-- ==========================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    -- Amount
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'online', 'other')) DEFAULT 'cash',
    
    -- Status
    status TEXT CHECK (status IN ('pending', 'completed', 'refunded', 'failed')) DEFAULT 'completed',
    
    -- Details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    receipt_number TEXT,
    
    -- Metadata
    processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX payments_date_idx ON payments(payment_date);
CREATE INDEX payments_booking_idx ON payments(booking_id);
CREATE INDEX payments_status_idx ON payments(status);

COMMENT ON TABLE payments IS 'Payment transactions';

-- ==========================================
-- CALL LOGS (Voice Agent)
-- ==========================================
CREATE TABLE call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Call Details
    call_sid TEXT,
    phone_number TEXT NOT NULL,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')) DEFAULT 'inbound',
    
    -- Duration
    call_duration INT, -- seconds
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- AI Analysis
    call_summary TEXT,
    intent TEXT, -- 'booking', 'inquiry', 'cancellation', etc.
    sentiment TEXT, -- 'positive', 'neutral', 'negative'
    
    -- Linked Record
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    -- Metadata
    recording_url TEXT,
    transcript TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX call_logs_phone_idx ON call_logs(phone_number);
CREATE INDEX call_logs_started_idx ON call_logs(started_at);

COMMENT ON TABLE call_logs IS 'Voice agent call history';

-- ============================================
-- STEP 3: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES - PROFILES
-- ==========================================

-- Users can view own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update own profile (not role!)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id 
        AND role = (SELECT role FROM profiles WHERE user_id = auth.uid()) -- Can't change own role
    );

-- ==========================================
-- RLS POLICIES - STAFF
-- ==========================================

-- Everyone can view active staff
CREATE POLICY "Authenticated users can view staff" ON staff
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- Only owner and manager can insert/update/delete
CREATE POLICY "Owner and manager can manage staff" ON staff
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('owner', 'manager')
    );

-- ==========================================
-- RLS POLICIES - SERVICES
-- ==========================================

-- Everyone can view active services
CREATE POLICY "Authenticated users can view services" ON services
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- Only owner and manager can manage
CREATE POLICY "Owner and manager can manage services" ON services
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('owner', 'manager')
    );

-- ==========================================
-- RLS POLICIES - CLIENTS
-- ==========================================

-- Everyone can view clients
CREATE POLICY "Authenticated users can view clients" ON clients
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- Owner, manager can manage all clients
CREATE POLICY "Owner and manager can manage clients" ON clients
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('owner', 'manager')
    );

-- ==========================================
-- RLS POLICIES - BOOKINGS
-- ==========================================

-- Owner and manager see all bookings
-- Stylist sees only their own bookings
CREATE POLICY "Users can view bookings based on role" ON bookings
    FOR SELECT USING (
        CASE 
            WHEN (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('owner', 'manager') THEN true
            WHEN (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'stylist' THEN 
                staff_id = (SELECT staff_id FROM profiles WHERE user_id = auth.uid())
            ELSE false
        END
    );

-- Owner, manager can manage all bookings
-- Stylist can only manage their own
CREATE POLICY "Users can manage bookings based on role" ON bookings
    FOR ALL USING (
        CASE 
            WHEN (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('owner', 'manager') THEN true
            WHEN (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'stylist' THEN 
                staff_id = (SELECT staff_id FROM profiles WHERE user_id = auth.uid())
            ELSE false
        END
    );

-- ==========================================
-- RLS POLICIES - PAYMENTS
-- ==========================================

-- Only owner and manager can view payments
CREATE POLICY "Owner and manager can view payments" ON payments
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('owner', 'manager')
    );

-- Only owner and manager can manage payments
CREATE POLICY "Owner and manager can manage payments" ON payments
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('owner', 'manager')
    );

-- ==========================================
-- RLS POLICIES - CALL LOGS
-- ==========================================

-- Owner and manager can view all call logs
CREATE POLICY "Owner and manager can view call logs" ON call_logs
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('owner', 'manager')
    );

-- Only system can insert call logs
CREATE POLICY "System can insert call logs" ON call_logs
    FOR INSERT WITH CHECK (true);

-- ==========================================
-- RLS POLICIES - BUSINESS SETTINGS
-- ==========================================

-- Everyone can view settings
CREATE POLICY "Authenticated users can view settings" ON business_settings
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- Only owner can update settings
CREATE POLICY "Only owner can update settings" ON business_settings
    FOR UPDATE USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'owner'
    );

-- ============================================
-- STEP 4: FUNCTIONS & TRIGGERS
-- ============================================

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 5: SEED DATA (Sample Staff & Services)
-- ============================================

-- Insert sample staff
INSERT INTO staff (full_name, email, role, color, is_active) VALUES
('Sarah Johnson', 'sarah@luxeaurea.com', 'manager', '#FF6B6B', true),
('Emily Davis', 'emily@luxeaurea.com', 'stylist', '#4ECDC4', true),
('Jessica Brown', 'jessica@luxeaurea.com', 'stylist', '#95E1D3', true);

-- Insert sample services
INSERT INTO services (name, description, duration, price, category, is_active) VALUES
('Haircut', 'Professional haircut and styling', 60, 50.00, 'Hair', true),
('Hair Color', 'Full hair coloring service', 120, 120.00, 'Hair', true),
('Highlights', 'Partial or full highlights', 90, 95.00, 'Hair', true),
('Blow Dry', 'Professional blow dry and styling', 30, 35.00, 'Hair', true),
('Deep Conditioning', 'Intensive hair treatment', 45, 45.00, 'Treatment', true),
('Manicure', 'Classic manicure', 30, 25.00, 'Nails', true),
('Pedicure', 'Spa pedicure', 45, 40.00, 'Nails', true);

-- ============================================
-- SUCCESS! DATABASE READY ✅
-- ============================================

-- Now you need to:
-- 1. Create owner login in Supabase Auth
-- 2. Owner profile will auto-create
-- 3. Create staff logins manually (optional)

SELECT 'Database setup complete!' as status;
