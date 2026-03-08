-- ============================================================
-- FIX: Update rpc_create_staff_login to include staff_id in profiles
-- Run this in Supabase SQL Editor
-- ============================================================
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
        jsonb_build_object('full_name', v_staff.full_name, 'role', 'staff'),
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
-- Link in profiles table WITH staff_id (THIS WAS THE FIX)
INSERT INTO profiles (id, tenant_id, full_name, email, role, staff_id)
VALUES (
        v_user_id,
        p_tenant_id,
        v_staff.full_name,
        p_email,
        'staff',
        p_staff_id -- ← NOW PROPERLY LINKED
    ) ON CONFLICT (id) DO
UPDATE
SET tenant_id = p_tenant_id,
    full_name = v_staff.full_name,
    email = p_email,
    role = 'staff',
    staff_id = p_staff_id;
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
SELECT '✅ rpc_create_staff_login updated — now includes staff_id in profiles!' as status;