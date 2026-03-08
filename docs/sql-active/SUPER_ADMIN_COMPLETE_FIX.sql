-- ============================================================
-- SUPER ADMIN COMPLETE FIX
-- Run this ENTIRE script in Supabase SQL Editor
-- It fixes:
-- 1. profiles role constraint (add super_admin)
-- 2. Creates/fixes super admin profile
-- 3. Creates proper RLS policies for Super Admin
-- ============================================================
-- STEP 1: Fix profiles role constraint to allow super_admin
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (
        role IN ('owner', 'manager', 'stylist', 'super_admin')
    );
-- STEP 2: Fix staff role constraint (just for safety)
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE public.staff
ADD CONSTRAINT staff_role_check CHECK (role IN ('owner', 'manager', 'stylist'));
-- STEP 3: Ensure super@voxali.com auth user exists with correct identity
DO $$
DECLARE v_user_id UUID;
BEGIN -- Check if user exists
SELECT id INTO v_user_id
FROM auth.users
WHERE email = 'super@voxali.com';
IF v_user_id IS NULL THEN -- Create new user
v_user_id := gen_random_uuid();
INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    )
VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'super@voxali.com',
        crypt('voxaliadmin', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Super Admin"}',
        NOW(),
        NOW()
    );
INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object(
            'sub',
            v_user_id::TEXT,
            'email',
            'super@voxali.com'
        ),
        'email',
        v_user_id::TEXT,
        NOW(),
        NOW(),
        NOW()
    );
RAISE NOTICE 'Created new auth user for super@voxali.com with id: %',
v_user_id;
ELSE -- Update password in case it changed
UPDATE auth.users
SET encrypted_password = crypt('voxaliadmin', gen_salt('bf')),
    updated_at = NOW()
WHERE id = v_user_id;
RAISE NOTICE 'Updated password for existing super@voxali.com with id: %',
v_user_id;
END IF;
-- STEP 4: Ensure super admin profile exists
INSERT INTO public.profiles (
        id,
        user_id,
        tenant_id,
        full_name,
        email,
        role,
        can_login
    )
VALUES (
        v_user_id,
        v_user_id,
        (
            SELECT id
            FROM tenants
            ORDER BY created_at
            LIMIT 1
        ), 'Super Admin', 'super@voxali.com', 'super_admin', true
    ) ON CONFLICT (user_id) DO
UPDATE
SET role = 'super_admin',
    full_name = 'Super Admin',
    can_login = true,
    updated_at = NOW();
RAISE NOTICE 'Super admin profile upserted successfully';
END $$;
-- STEP 5: Drop any conflicting tenant policies & recreate
DROP POLICY IF EXISTS "Super Admin full tenants access" ON public.tenants;
DROP POLICY IF EXISTS "Super Admin can do everything on tenants" ON public.tenants;
DROP POLICY IF EXISTS "Super Admin can view all tenants" ON public.tenants;
CREATE POLICY "Super Admin full tenants access" ON public.tenants FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'super_admin'
    )
);
-- STEP 6: Drop conflicting profile policies & recreate
DROP POLICY IF EXISTS "Super Admin view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON public.profiles;
CREATE POLICY "Super Admin view all profiles" ON public.profiles FOR
SELECT TO authenticated USING (
        -- Own profile OR super admin
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles sa
            WHERE sa.user_id = auth.uid()
                AND sa.role = 'super_admin'
        )
    );
-- STEP 7: Verify everything is set correctly
SELECT '✅ Fix complete!' as status;
SELECT email,
    role,
    can_login
FROM public.profiles
WHERE email = 'super@voxali.com';
SELECT COUNT(*) as total_tenants
FROM public.tenants;
SELECT policyname,
    tablename
FROM pg_policies
WHERE policyname LIKE '%Super Admin%';