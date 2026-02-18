-- Fixed User Management Functions (Without tenant_id)
-- This version works with the actual profiles table structure
-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_dashboard_user(text, text, text, text, uuid);
DROP FUNCTION IF EXISTS delete_dashboard_user(uuid);
-- ============================================
-- Function: create_dashboard_user
-- ============================================
CREATE OR REPLACE FUNCTION create_dashboard_user(
        p_email TEXT,
        p_password TEXT,
        p_full_name TEXT,
        p_role TEXT,
        p_staff_id UUID DEFAULT NULL
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
v_result JSON;
BEGIN -- Validate inputs
IF p_email IS NULL
OR p_email = '' THEN RAISE EXCEPTION 'Email is required';
END IF;
IF p_password IS NULL
OR LENGTH(p_password) < 8 THEN RAISE EXCEPTION 'Password must be at least 8 characters';
END IF;
IF p_full_name IS NULL
OR LENGTH(TRIM(p_full_name)) < 2 THEN RAISE EXCEPTION 'Full name is required (minimum 2 characters)';
END IF;
IF p_role NOT IN ('owner', 'manager', 'stylist') THEN RAISE EXCEPTION 'Invalid role. Must be owner, manager, or stylist';
END IF;
-- Stylist must have staff_id
IF p_role = 'stylist'
AND p_staff_id IS NULL THEN RAISE EXCEPTION 'Stylist must be linked to a staff member';
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
-- Create profile (without tenant_id since column doesn't exist)
INSERT INTO public.profiles (
        user_id,
        full_name,
        role,
        staff_id,
        status
    )
VALUES (
        v_user_id,
        p_full_name,
        p_role,
        p_staff_id,
        'active'
    );
-- Return success
v_result := json_build_object(
    'success',
    true,
    'user_id',
    v_user_id,
    'email',
    p_email,
    'message',
    'User created successfully'
);
RETURN v_result;
EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Error creating user: %',
SQLERRM;
END;
$$;
-- ============================================
-- Function: delete_dashboard_user
-- ============================================
CREATE OR REPLACE FUNCTION delete_dashboard_user(p_user_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_email TEXT;
v_role TEXT;
v_result JSON;
BEGIN -- Get user details
SELECT email INTO v_email
FROM auth.users
WHERE id = p_user_id;
IF v_email IS NULL THEN RAISE EXCEPTION 'User not found';
END IF;
-- Get user role
SELECT role INTO v_role
FROM profiles
WHERE user_id = p_user_id;
-- Prevent deleting owner
IF v_role = 'owner' THEN RAISE EXCEPTION 'Cannot delete owner account';
END IF;
-- Delete profile (auth.users will cascade delete)
DELETE FROM public.profiles
WHERE user_id = p_user_id;
-- Delete auth user
DELETE FROM auth.users
WHERE id = p_user_id;
-- Return success
v_result := json_build_object(
    'success',
    true,
    'message',
    'User deleted successfully'
);
RETURN v_result;
EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION 'Error deleting user: %',
SQLERRM;
END;
$$;
-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_dashboard_user(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_dashboard_user(UUID) TO authenticated;
-- Test the functions exist
SELECT routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('create_dashboard_user', 'delete_dashboard_user');