-- ============================================================
-- QUICK FIX: Run this ENTIRE script in Supabase SQL Editor
-- Fixes: role constraint + inserts missing Sarah Johnson profile
-- ============================================================
-- Step 1: Drop the old constraint that blocks 'staff' role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- Step 2: Recreate constraint with 'staff' included
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check CHECK (
        role IN (
            'owner',
            'admin',
            'staff',
            'stylist',
            'receptionist'
        )
    );
-- Step 3: Insert Sarah Johnson's profile (she's in auth.users but has no profile)
-- Find her user ID from auth.users and create the profile row
INSERT INTO profiles (id, tenant_id, full_name, email, role)
SELECT au.id,
    (
        SELECT id
        FROM tenants
        LIMIT 1
    ), COALESCE(
        au.raw_user_meta_data->>'full_name', 'Sarah Johnson'
    ), au.email, 'staff'
FROM auth.users au
WHERE au.email = 'sarah.johnson@salon.com' ON CONFLICT (id) DO
UPDATE
SET role = 'staff',
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
-- Step 4: Also re-run the updated rpc_create_staff_login function
-- so future staff logins will work
DROP FUNCTION IF EXISTS rpc_create_staff_login(UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION rpc_create_staff_login(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_email TEXT,
        p_password TEXT
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
v_staff RECORD;
BEGIN -- Verify staff exists and belongs to tenant
SELECT id,
    full_name INTO v_staff
FROM staff
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
IF v_staff.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Staff not found');
END IF;
-- Create the auth user
v_user_id := gen_random_uuid();
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
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY ['email']),
        jsonb_build_object('full_name', v_staff.full_name),
        'authenticated',
        'authenticated'
    );
-- Create identity record
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
        jsonb_build_object('sub', v_user_id::TEXT, 'email', p_email),
        'email',
        v_user_id::TEXT,
        NOW(),
        NOW(),
        NOW()
    );
-- Link in profiles table
INSERT INTO profiles (id, tenant_id, full_name, email, role)
VALUES (
        v_user_id,
        p_tenant_id,
        v_staff.full_name,
        p_email,
        'staff'
    ) ON CONFLICT (id) DO
UPDATE
SET tenant_id = p_tenant_id,
    full_name = v_staff.full_name,
    email = p_email,
    role = 'staff';
-- Update staff email if not set
UPDATE staff
SET email = p_email
WHERE id = p_staff_id
    AND (
        email IS NULL
        OR email = ''
    );
RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$;