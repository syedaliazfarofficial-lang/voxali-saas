-- ============================================================
-- CREATE SUPER ADMIN USER
-- Run this script in Supabase SQL Editor
-- ============================================================
-- REGLACE THESE VALUES
DO $$
DECLARE -- !!! CHANGE THESE VALUES BEFORE RUNNING !!!
    v_email TEXT := 'super@voxali.com';
v_password TEXT := 'super123';
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
v_user_id UUID := gen_random_uuid();
v_check_exists INT;
BEGIN -- Check if email already exists
SELECT count(*) INTO v_check_exists
FROM auth.users
WHERE email = v_email;
IF v_check_exists > 0 THEN RAISE EXCEPTION 'User with email % already exists',
v_email;
END IF;
-- 1. Create Identity (Required for proper auth)
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
        jsonb_build_object('sub', v_user_id::TEXT, 'email', v_email),
        'email',
        v_user_id::TEXT,
        NOW(),
        NOW(),
        NOW()
    );
-- 2. Create User in auth.users
INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
    )
VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt(v_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY ['email']),
        jsonb_build_object('full_name', 'Super Admin'),
        'authenticated',
        'authenticated'
    );
-- 3. Create Profile in public.profiles
-- tenant_id is NULL for Super Admin (global scope)
INSERT INTO public.profiles (
        id,
        user_id,
        email,
        full_name,
        role,
        tenant_id
    )
VALUES (
        v_user_id,
        v_user_id,
        v_email,
        'Super Admin',
        'super_admin',
        NULL
    );
RAISE NOTICE 'Super Admin created successfully: %',
v_email;
END $$;