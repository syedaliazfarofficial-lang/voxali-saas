-- ============================================================
-- FIX LOGIN ERROR: RLS RECURSION BREAKER
-- Run this script in Supabase SQL Editor to fix "Database error querying schema"
-- ============================================================
-- 1. Create a Helper Function to get role WITHOUT triggering RLS
-- This function is SECURITY DEFINER, meaning it runs with admin privileges
-- and bypasses RLS policies on the 'profiles' table.
CREATE OR REPLACE FUNCTION public.get_cloud_role() RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
SELECT role INTO v_role
FROM public.profiles
WHERE id = auth.uid();
RETURN COALESCE(v_role, 'public');
END;
$$;
-- 2. Drop Existing Policies (to clear the bad ones)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
DROP POLICY IF EXISTS "Allow individual read access" ON profiles;
DROP POLICY IF EXISTS "Allow individual update access" ON profiles;
DROP POLICY IF EXISTS "Owners can view all profiles" ON profiles;
-- 3. Create NEW, SAFE Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Policy A: VIEW
-- Users can see their own profile, OR if they are an owner/admin/manager/receptionist
CREATE POLICY "profiles_view_policy" ON profiles FOR
SELECT USING (
        auth.uid() = id
        OR get_cloud_role() IN ('owner', 'admin', 'manager', 'receptionist')
    );
-- Policy B: UPDATE
-- Users can update their own profile, OR if they are an owner/admin
CREATE POLICY "profiles_update_policy" ON profiles FOR
UPDATE USING (
        auth.uid() = id
        OR get_cloud_role() IN ('owner', 'admin')
    );
-- Policy C: INSERT
-- Allow new users (via triggers) to insert profiles
CREATE POLICY "profiles_insert_policy" ON profiles FOR
INSERT WITH CHECK (auth.uid() = id);
-- 4. Reload Schema Cache
NOTIFY pgrst,
'reload schema';