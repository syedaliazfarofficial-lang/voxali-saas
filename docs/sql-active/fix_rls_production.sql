-- ============================================================
-- PRODUCTION RLS FIX — profiles table
-- Fixes the 10+ second page load caused by recursive policies
-- Run this in Supabase SQL Editor
-- ============================================================
-- Step 1: Drop ALL existing policies on profiles (clear any recursion)
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
-- Step 2: Create a SECURITY DEFINER helper function
-- This bypasses RLS to get the user's tenant_id without recursion
CREATE OR REPLACE FUNCTION public.get_my_tenant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT tenant_id
FROM public.profiles
WHERE user_id = auth.uid()
LIMIT 1;
$$;
-- Step 3: Create non-recursive, fast policies
-- 3a. Users can read their OWN profile (no recursion — just auth.uid())
CREATE POLICY "profiles_select_own" ON public.profiles FOR
SELECT TO authenticated USING (user_id = auth.uid());
-- 3b. Users can read SAME-TENANT profiles (owner/manager needs to see staff list)
-- Uses the SECURITY DEFINER function to get tenant_id without self-referencing
CREATE POLICY "profiles_select_same_tenant" ON public.profiles FOR
SELECT TO authenticated USING (tenant_id = public.get_my_tenant_id());
-- 3c. Super Admin can read ALL profiles (uses JWT, not profiles table — no recursion)
CREATE POLICY "profiles_select_super_admin" ON public.profiles FOR
SELECT TO authenticated USING ((auth.jwt()->>'email') = 'super@voxali.com');
-- 3d. Users can update their OWN profile
CREATE POLICY "profiles_update_own" ON public.profiles FOR
UPDATE TO authenticated USING (user_id = auth.uid());
-- 3e. Allow profile creation (for new user registration)
CREATE POLICY "profiles_insert_own" ON public.profiles FOR
INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- 3f. Service role can do everything (for n8n workflows)
CREATE POLICY "profiles_service_role_all" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Step 4: Verify — list all policies
SELECT policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles'
    AND schemaname = 'public'
ORDER BY policyname;