-- ============================================================
-- FIX RLS RECURSION ON PROFILES TABLE
-- Run this script in Supabase SQL Editor
-- ============================================================
-- Step 1: Drop ALL existing policies on profiles to clear recursion
DO $$
DECLARE pol record;
BEGIN FOR pol IN
SELECT policyname
FROM pg_policies
WHERE tablename = 'profiles'
    AND schemaname = 'public' LOOP EXECUTE format(
        'DROP POLICY %I ON public.profiles',
        pol.policyname
    );
RAISE NOTICE 'Dropped policy: %',
pol.policyname;
END LOOP;
END $$;
-- Step 2: Create safe, non-recursive policies
-- Users can read their own profile (no self-reference)
CREATE POLICY "Users can read own profile" ON public.profiles FOR
SELECT TO authenticated USING (user_id = auth.uid());
-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles FOR
UPDATE TO authenticated USING (user_id = auth.uid());
-- Super admins can read ALL profiles (uses auth.jwt() to avoid recursion)
CREATE POLICY "Super admin reads all profiles" ON public.profiles FOR
SELECT TO authenticated USING (
        (auth.jwt()->>'email') = 'super@voxali.com'
    );
-- Allow profile insertion (for new users)
CREATE POLICY "Allow insert own profile" ON public.profiles FOR
INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- Verify: List all policies
SELECT policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles'
    AND schemaname = 'public';