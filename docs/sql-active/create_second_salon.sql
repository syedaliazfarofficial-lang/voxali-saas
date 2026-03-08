-- ============================================================
-- ADD SECOND SALON: Velvet Rose Beauty Studio
-- Run in Supabase SQL Editor AFTER SUPER_ADMIN_COMPLETE_FIX.sql
-- ============================================================
-- Create the second salon tenant
DO $$
DECLARE v_tenant_id UUID := gen_random_uuid();
v_user_id UUID := gen_random_uuid();
v_owner_email TEXT := 'velvetrose@voxali.com';
v_owner_password TEXT := 'Rose@545537';
BEGIN -- 1. Create Tenant
INSERT INTO public.tenants (id, name, slug, timezone, open_time, close_time)
VALUES (
        v_tenant_id,
        'Velvet Rose Beauty Studio',
        'velvet-rose',
        'America/New_York',
        '09:00',
        '20:00'
    );
-- 2. Create Auth User
IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = v_owner_email
) THEN
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
        v_owner_email,
        crypt(v_owner_password, gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Rose Owner"}',
        NOW(),
        NOW()
    );
-- Identity
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
        jsonb_build_object('sub', v_user_id::TEXT, 'email', v_owner_email),
        'email',
        v_user_id::TEXT,
        NOW(),
        NOW(),
        NOW()
    );
ELSE
SELECT id INTO v_user_id
FROM auth.users
WHERE email = v_owner_email;
END IF;
-- 3. Create Owner Profile
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
        v_tenant_id,
        'Rose Owner',
        v_owner_email,
        'owner',
        true
    ) ON CONFLICT (user_id) DO
UPDATE
SET tenant_id = v_tenant_id,
    role = 'owner',
    can_login = true;
RAISE NOTICE 'Velvet Rose Beauty Studio created!';
RAISE NOTICE 'Tenant ID: %',
v_tenant_id;
RAISE NOTICE 'Owner email: %',
v_owner_email;
END $$;
-- Verify
SELECT name,
    slug
FROM tenants
ORDER BY created_at;
SELECT '✅ Second salon created!' as status;