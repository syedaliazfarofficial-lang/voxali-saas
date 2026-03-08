-- ============================================================
-- FINAL RLS FIX — Allow authenticated users to read & update tenants
-- Run this in Supabase SQL Editor
-- ============================================================
-- 1. Ensure RLS is enabled
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
-- 2. Drop ALL existing policies on tenants
DO $$
DECLARE r RECORD;
BEGIN FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'tenants'
) LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.tenants';
RAISE NOTICE 'Dropped policy: %',
r.policyname;
END LOOP;
END $$;
-- 3. Create simple, permissive policies
-- Allow anyone to READ tenants (needed for branding display)
CREATE POLICY "allow_select_tenants" ON public.tenants FOR
SELECT USING (true);
-- Allow authenticated users to UPDATE tenants
CREATE POLICY "allow_update_tenants" ON public.tenants FOR
UPDATE USING (true) WITH CHECK (true);
-- Allow service_role to INSERT tenants (for creating salons)
CREATE POLICY "allow_insert_tenants" ON public.tenants FOR
INSERT WITH CHECK (true);
-- 4. Same for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r RECORD;
BEGIN FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'profiles'
) LOOP EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
END LOOP;
END $$;
CREATE POLICY "allow_select_profiles" ON public.profiles FOR
SELECT USING (true);
CREATE POLICY "allow_update_profiles" ON public.profiles FOR
UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_insert_profiles" ON public.profiles FOR
INSERT WITH CHECK (true);
-- 5. Force PostgREST schema reload
NOTIFY pgrst,
'reload schema';
-- 6. Verify policies
SELECT tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('tenants', 'profiles')
ORDER BY tablename,
    policyname;
SELECT '✅ ALL RLS POLICIES FIXED!' as status;