-- ============================================
-- SIMPLE USER CREATION (FIXED VERSION)
-- This avoids the generated column error
-- ============================================
-- Step 1: Create user with minimal required fields
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
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'owner@gmail.com',
        crypt('LuxeAurea2026!', gen_salt('bf')),
        -- Password: LuxeAurea2026!
        NOW(),
        -- Email confirmed immediately
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Jazil"}',
        NOW(),
        NOW()
    )
RETURNING id,
    email;
-- Step 2: Verify user created
SELECT id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'owner@gmail.com';
-- Step 3: Wait for profile to auto-create (trigger should do this)
-- Check if profile exists:
SELECT id,
    user_id,
    email,
    full_name,
    role
FROM profiles
WHERE email = 'owner@gmail.com';
-- Step 4: If profile doesn't exist, create it manually:
INSERT INTO profiles (user_id, email, full_name, role)
SELECT id,
    'owner@gmail.com',
    'Jazil',
    'owner'
FROM auth.users
WHERE email = 'owner@gmail.com' ON CONFLICT (user_id) DO NOTHING;
-- Step 5: Final check - both user and profile should exist
SELECT 'SUCCESS! User and profile created' as status,
    u.id as user_id,
    u.email,
    p.full_name,
    p.role
FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'owner@gmail.com';
-- ============================================
-- NOW TRY TO LOGIN:
-- ============================================
-- URL: http://localhost:3000
-- Email: owner@gmail.com
-- Password: LuxeAurea2026!
-- ============================================