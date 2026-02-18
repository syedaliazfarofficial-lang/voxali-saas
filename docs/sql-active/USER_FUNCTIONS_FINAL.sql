-- FINAL User Management Functions with Duplicate Check
-- Includes email existence validation
DROP FUNCTION IF EXISTS create_dashboard_user(text, text, text, text, uuid);
DROP FUNCTION IF EXISTS delete_dashboard_user(uuid);
-- ============================================
-- CREATE USER (with duplicate check)
-- ============================================
CREATE OR REPLACE FUNCTION create_dashboard_user(
        p_email TEXT,
        p_password TEXT,
        p_full_name TEXT,
        p_role TEXT,
        p_staff_id UUID DEFAULT NULL
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
v_existing_email TEXT;
BEGIN -- Check if email already exists in auth.users
SELECT email INTO v_existing_email
FROM auth.users
WHERE email = p_email;
IF v_existing_email IS NOT NULL THEN RAISE EXCEPTION 'User with email % already exists',
p_email;
END IF;
-- Validate inputs
IF p_email IS NULL
OR p_email = '' THEN RAISE EXCEPTION 'Email is required';
END IF;
IF p_password IS NULL
OR LENGTH(p_password) < 8 THEN RAISE EXCEPTION 'Password must be at least 8 characters';
END IF;
IF p_full_name IS NULL THEN RAISE EXCEPTION 'Full name is required';
END IF;
IF p_role NOT IN ('owner', 'manager', 'stylist') THEN RAISE EXCEPTION 'Invalid role';
END IF;
IF p_role = 'stylist'
AND p_staff_id IS NULL THEN RAISE EXCEPTION 'Stylist must be linked to staff member';
END IF;
-- Create auth user
INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', p_full_name),
        FALSE,
        '',
        '',
        '',
        ''
    )
RETURNING id INTO v_user_id;
-- Create profile
INSERT INTO public.profiles (
        user_id,
        email,
        full_name,
        role,
        staff_id,
        can_login
    )
VALUES (
        v_user_id,
        p_email,
        p_full_name,
        p_role,
        p_staff_id,
        true
    );
RETURN json_build_object(
    'success',
    true,
    'user_id',
    v_user_id,
    'message',
    'User created successfully'
);
EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Error: %',
SQLERRM;
END;
$$;
-- ============================================
-- DELETE USER
-- ============================================
CREATE OR REPLACE FUNCTION delete_dashboard_user(p_user_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_role TEXT;
BEGIN
SELECT role INTO v_role
FROM profiles
WHERE user_id = p_user_id;
IF v_role IS NULL THEN RAISE EXCEPTION 'User not found';
END IF;
IF v_role = 'owner' THEN RAISE EXCEPTION 'Cannot delete owner';
END IF;
DELETE FROM public.profiles
WHERE user_id = p_user_id;
DELETE FROM auth.users
WHERE id = p_user_id;
RETURN json_build_object('success', true, 'message', 'User deleted');
EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Error: %',
SQLERRM;
END;
$$;
GRANT EXECUTE ON FUNCTION create_dashboard_user(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_dashboard_user(UUID) TO authenticated;
-- Fix owner profile
DO $$
DECLARE v_user_id UUID;
BEGIN
SELECT id INTO v_user_id
FROM auth.users
WHERE email = 'owner@gmail.com';
IF v_user_id IS NOT NULL THEN
INSERT INTO public.profiles (user_id, email, full_name, role, can_login)
VALUES (
        v_user_id,
        'owner@gmail.com',
        'Owner',
        'owner',
        true
    ) ON CONFLICT (user_id) DO
UPDATE
SET email = 'owner@gmail.com',
    full_name = 'Owner',
    role = 'owner',
    can_login = true;
END IF;
END $$;
SELECT 'Done!' as status;