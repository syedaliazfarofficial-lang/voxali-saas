-- ============================================================
-- FINAL FIX: user_id column was never set in profiles
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================
-- =============================================
-- STEP 1: Fix the handle_new_user trigger to set user_id
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO public.profiles (id, user_id, email, full_name, role)
VALUES (
        NEW.id,
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'owner'
    ) ON CONFLICT (id) DO
UPDATE
SET user_id = NEW.id
WHERE profiles.user_id IS NULL;
RETURN NEW;
EXCEPTION
WHEN others THEN RETURN NEW;
END;
$$;
-- =============================================
-- STEP 2: Fix ALL existing profiles to have user_id = id
-- (This fixes everyone who can't log in)
-- =============================================
UPDATE profiles
SET user_id = id
WHERE user_id IS NULL;
-- =============================================
-- STEP 3: Fix the rpc_create_staff_login to include user_id
-- =============================================
DROP FUNCTION IF EXISTS rpc_create_staff_login(UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION rpc_create_staff_login(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_email TEXT,
        p_password TEXT
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
v_staff RECORD;
BEGIN
SELECT id,
    full_name INTO v_staff
FROM staff
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
IF v_staff.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Staff not found');
END IF;
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
        role,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change_token_current,
        reauthentication_token,
        phone_change_token,
        email_change,
        phone_change,
        phone
    )
VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object(
            'provider',
            'email',
            'providers',
            ARRAY ['email']
        ),
        jsonb_build_object('full_name', v_staff.full_name),
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
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
        jsonb_build_object('sub', v_user_id::TEXT, 'email', p_email),
        'email',
        v_user_id::TEXT,
        NOW(),
        NOW(),
        NOW()
    );
-- KEY FIX: Set BOTH id AND user_id
INSERT INTO profiles (
        id,
        user_id,
        tenant_id,
        full_name,
        email,
        role,
        staff_id
    )
VALUES (
        v_user_id,
        v_user_id,
        p_tenant_id,
        v_staff.full_name,
        p_email,
        'staff',
        p_staff_id
    ) ON CONFLICT (id) DO
UPDATE
SET tenant_id = p_tenant_id,
    user_id = v_user_id,
    full_name = v_staff.full_name,
    email = p_email,
    role = 'staff',
    staff_id = p_staff_id;
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
-- =============================================
-- STEP 4: Fix Sarah Johnson's profile (set user_id)
-- =============================================
UPDATE profiles
SET user_id = id,
    role = 'staff'
WHERE email = 'sarah.johnson@salon.com'
    AND user_id IS NULL;
-- =============================================
-- STEP 5: Reload schema cache
-- =============================================
NOTIFY pgrst,
'reload schema';
-- =============================================
-- STEP 6: Verify
-- =============================================
SELECT id,
    user_id,
    email,
    role,
    tenant_id
FROM profiles
WHERE email = 'sarah.johnson@salon.com';