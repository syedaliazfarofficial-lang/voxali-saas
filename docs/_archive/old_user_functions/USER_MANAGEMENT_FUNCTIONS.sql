-- ============================================
-- USER MANAGEMENT FUNCTIONS
-- ============================================
-- Function to create a new dashboard user
CREATE OR REPLACE FUNCTION create_dashboard_user(
        p_email TEXT,
        p_password TEXT,
        p_full_name TEXT,
        p_role TEXT,
        p_staff_id UUID DEFAULT NULL
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
v_result JSON;
BEGIN -- Validate role
IF p_role NOT IN ('owner', 'manager', 'stylist') THEN RAISE EXCEPTION 'Invalid role. Must be owner, manager, or stylist';
END IF;
-- Validate stylist has staff_id
IF p_role = 'stylist'
AND p_staff_id IS NULL THEN RAISE EXCEPTION 'Stylist must be linked to a staff member';
END IF;
-- Create user in auth.users
INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        -- Auto-confirm
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', p_full_name, 'role', p_role),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    )
RETURNING id INTO v_user_id;
-- Create profile
INSERT INTO profiles (
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
-- Return success
v_result := json_build_object(
    'success',
    true,
    'user_id',
    v_user_id,
    'message',
    'User created successfully'
);
RETURN v_result;
EXCEPTION
WHEN unique_violation THEN RAISE EXCEPTION 'Email already exists';
WHEN OTHERS THEN RAISE EXCEPTION 'Error creating user: %',
SQLERRM;
END;
$$;
-- ============================================
-- Function to delete a dashboard user
-- ============================================
CREATE OR REPLACE FUNCTION delete_dashboard_user(p_user_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result JSON;
v_role TEXT;
BEGIN -- Get user role
SELECT role INTO v_role
FROM profiles
WHERE user_id = p_user_id;
-- Don't allow deleting owner
IF v_role = 'owner' THEN RAISE EXCEPTION 'Cannot delete owner account';
END IF;
-- Delete from auth.users (CASCADE will delete profile)
DELETE FROM auth.users
WHERE id = p_user_id;
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
-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Allow authenticated users to call these functions
GRANT EXECUTE ON FUNCTION create_dashboard_user TO authenticated;
GRANT EXECUTE ON FUNCTION delete_dashboard_user TO authenticated;
-- Note: Additional security will be enforced by frontend
-- (only owner role should have access to User Management page)