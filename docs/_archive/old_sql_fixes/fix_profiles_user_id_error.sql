-- FIX FOR SQL ERROR: Column "user_id" does not exist
-- Run this FIRST before creating profiles table

-- Step 1: Check if profiles table already exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 2: If profiles exists but user_id is missing, drop and recreate
-- Otherwise, create fresh table

DROP TABLE IF EXISTS profiles CASCADE;

-- Step 3: Create profiles table WITH user_id column
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    tenant_id UUID, -- Will add foreign key after creating tenants table
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'tenant_admin', -- super_admin, tenant_admin, manager, stylist
    staff_id UUID, -- Will link to staff table later
    is_protected BOOLEAN DEFAULT false, -- True for super admin (cannot be deleted)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (
        auth.uid() = user_id OR
        role = 'super_admin'
    );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- Step 6: Create trigger for auto-profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'tenant_admin')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Create profiles for EXISTING users
INSERT INTO profiles (user_id, email, full_name, role)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email),
    'tenant_admin'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Step 8: Verify profiles created
SELECT 
    p.id,
    p.user_id,
    p.email,
    p.full_name,
    p.role,
    p.is_protected,
    u.email as auth_email
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id;

-- SUCCESS! Profiles table should now exist with user_id column
