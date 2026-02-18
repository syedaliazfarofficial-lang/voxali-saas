-- =============================================
-- PROPER USER MANAGEMENT APPROACH
-- Based on Gemini's SaaS Architecture Design
-- =============================================
-- PROBLEM: Directly inserting into auth.users via RPC doesn't work reliably
-- SOLUTION: Use profiles-first approach OR Supabase Edge Functions
-- =============================================
-- STEP 1: Create a proper users/staff table (NOT profiles)
-- This is the SOURCE OF TRUTH for your app
-- =============================================
-- Check if we need to create staff table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID REFERENCES salons(id),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'stylist' CHECK (role IN ('owner', 'manager', 'stylist')),
        is_active BOOLEAN DEFAULT true,
        can_login BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =============================================
-- STEP 2: Simpler approach - just use profiles
-- Let Supabase handle auth.users via normal signup
-- =============================================
-- Enable the "invite user" feature in Supabase Dashboard
-- Go to: Authentication > Providers > Email
-- Enable: "Enable email confirmations"
-- Your app flow becomes:
-- 1. Owner clicks "Create User"
-- 2. Frontend calls supabase.auth.admin.inviteUserByEmail()
-- 3. New user gets email with magic link
-- 4. They click link and set password
-- 5. On first login, create their profile
-- =============================================
-- STEP 3: ALTERNATIVE - Simple profiles-only approach
-- Just create profiles, users login via normal signup
-- =============================================
-- Clear any bad data first
DELETE FROM profiles
WHERE user_id NOT IN (
        SELECT id
        FROM auth.users
    );
-- Create a trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO public.profiles (user_id, email, full_name, role)
VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(NEW.raw_user_meta_data->>'role', 'stylist')
    ) ON CONFLICT (user_id) DO NOTHING;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- =============================================
-- STEP 4: Simple RLS for profiles
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON profiles;
CREATE POLICY "Allow all for authenticated" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
SELECT 'Setup complete! Use Supabase Dashboard to invite users.' as status;