-- ========================================
-- COMPLETE DATABASE FIX - Run All At Once
-- ========================================
-- STEP 1: Disable RLS temporarily for this session
SET session_replication_role = 'replica';
-- STEP 2: Check current state
SELECT 'Current auth.users:' as info;
SELECT id,
    email
FROM auth.users;
SELECT 'Current profiles:' as info;
SELECT user_id,
    email,
    full_name,
    role
FROM profiles;
-- STEP 3: Delete orphaned profiles (profiles without matching auth.users)
DELETE FROM profiles
WHERE user_id NOT IN (
        SELECT id
        FROM auth.users
    );
-- STEP 4: Delete incomplete auth users (auth.users without profiles)
-- First check who has a profile already
SELECT 'Auth users without profiles:' as info;
SELECT u.id,
    u.email
FROM auth.users u
    LEFT JOIN profiles p ON p.user_id = u.id
WHERE p.id IS NULL;
-- STEP 5: Create missing profiles for existing auth users
INSERT INTO profiles (user_id, email, full_name, role, can_login)
SELECT u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        split_part(u.email, '@', 1)
    ),
    'owner',
    true
FROM auth.users u
    LEFT JOIN profiles p ON p.user_id = u.id
WHERE p.id IS NULL
    AND u.email = 'owner@gmail.com';
-- STEP 6: Delete duplicate users (keep only owner@gmail.com)
-- First delete any abbas@gmail.com if exists
DELETE FROM profiles
WHERE email = 'abbas@gmail.com';
DELETE FROM auth.users
WHERE email = 'abbas@gmail.com';
-- STEP 7: Re-enable RLS
SET session_replication_role = 'origin';
-- STEP 8: Verify final state
SELECT 'FINAL STATE - Auth Users:' as status;
SELECT id,
    email
FROM auth.users
ORDER BY created_at;
SELECT 'FINAL STATE - Profiles:' as status;
SELECT user_id,
    email,
    full_name,
    role,
    can_login
FROM profiles
ORDER BY created_at;
-- STEP 9: Create/Update user management functions
DROP FUNCTION IF EXISTS create_dashboard_user(text, text, text, text, uuid);
DROP FUNCTION IF EXISTS delete_dashboard_user(uuid);
CREATE OR REPLACE FUNCTION create_dashboard_user(
        p_email TEXT,
        p_password TEXT,
        p_full_name TEXT,
        p_role TEXT,
        p_staff_id UUID DEFAULT NULL
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
BEGIN -- Check duplicate
IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = p_email
) THEN RAISE EXCEPTION 'Email % already exists',
p_email;
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
RETURN json_build_object('success', true, 'user_id', v_user_id);
EXCEPTION
WHEN OTHERS THEN RAISE EXCEPTION '%',
SQLERRM;
END;
$$;
CREATE OR REPLACE FUNCTION delete_dashboard_user(p_user_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN IF (
        SELECT role
        FROM profiles
        WHERE user_id = p_user_id
    ) = 'owner' THEN RAISE EXCEPTION 'Cannot delete owner';
END IF;
DELETE FROM profiles
WHERE user_id = p_user_id;
DELETE FROM auth.users
WHERE id = p_user_id;
RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION create_dashboard_user(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_dashboard_user(UUID) TO authenticated;
-- STEP 10: Fix RLS policies for profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR
SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR
INSERT WITH CHECK (true);
CREATE POLICY "profiles_update" ON profiles FOR
UPDATE USING (true);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (true);
SELECT '✅ ALL DONE! Refresh browser now.' as final_status;