-- Fix for Luxe Aurea Authentication Issues
-- Run this in Supabase SQL Editor

-- 1. Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'owner',
    full_name TEXT,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 4. Create RLS Policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 5. Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'owner'  -- Default role for new signups
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger to run function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 7. For EXISTING users without profiles, create them now
INSERT INTO profiles (user_id, email, full_name, role)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email),
    'owner'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles)
ON CONFLICT (user_id) DO NOTHING;

-- 8. Verify profiles created
SELECT 
    p.id,
    p.user_id,
    p.email,
    p.full_name,
    p.role,
    u.email as auth_email
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id;
