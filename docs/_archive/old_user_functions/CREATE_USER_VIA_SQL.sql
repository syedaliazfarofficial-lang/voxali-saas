-- ============================================
-- COMPLETE USER CREATION VIA SQL
-- Use this if UI "Add User" keeps failing
-- ============================================
-- Step 1: Verify user is truly deleted
SELECT 'Checking if user exists...' as step,
    COUNT(*) as count
FROM auth.users
WHERE email = 'owner@gmail.com';
-- Result should be: count = 0
-- Step 2: Verify profile is deleted
SELECT 'Checking if profile exists...' as step,
    COUNT(*) as count
FROM profiles
WHERE email = 'owner@gmail.com';
-- Result should be: count = 0
-- ============================================
-- If both are 0, create user via SQL:
-- ============================================
-- Step 3: Insert into auth.users directly
-- This bypasses the UI and creates the user manually
INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        confirmed_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'owner@gmail.com',
        crypt('LuxeAurea2026!', gen_salt('bf')),
        -- Password: LuxeAurea2026!
        NOW(),
        -- Email confirmed
        NULL,
        '',
        NULL,
        '',
        NULL,
        '',
        '',
        NULL,
        NULL,
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Jazil"}',
        FALSE,
        NOW(),
        NOW(),
        NULL,
        NULL,
        '',
        '',
        NULL,
        NOW(),
        -- Confirmed
        '',
        0,
        NULL,
        '',
        NULL
    )
RETURNING id,
    email;
-- Step 4: Verify user created
SELECT id,
    email,
    email_confirmed_at,
    confirmed_at,
    created_at
FROM auth.users
WHERE email = 'owner@gmail.com';
-- Step 5: Check if profile auto-created by trigger
SELECT id,
    user_id,
    email,
    full_name,
    role
FROM profiles
WHERE email = 'owner@gmail.com';
-- ============================================
-- If profile NOT auto-created, create manually:
-- ============================================
INSERT INTO profiles (user_id, email, full_name, role)
SELECT id,
    email,
    'Jazil',
    'owner'
FROM auth.users
WHERE email = 'owner@gmail.com' ON CONFLICT (user_id) DO NOTHING;
-- Step 6: Final verification
SELECT 'User created successfully!' as status,
    u.id as user_id,
    u.email as user_email,
    p.full_name as profile_name,
    p.role as profile_role
FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'owner@gmail.com';
-- ============================================
-- NOW TEST LOGIN:
-- ============================================
-- Go to: http://localhost:3000
-- Email: owner@gmail.com
-- Password: LuxeAurea2026!
-- ============================================