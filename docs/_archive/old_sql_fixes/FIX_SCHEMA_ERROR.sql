-- ============================================
-- FIX: Database Error Querying Schema
-- This error happens when login tries to query profile
-- ============================================
-- Step 1: Check if profile exists for new user
SELECT 'Checking profile...' as step,
    p.id,
    p.user_id,
    p.email,
    p.full_name,
    p.role,
    p.staff_id
FROM profiles p
WHERE p.email = 'owner@gmail.com';
-- ============================================
-- LIKELY ISSUE: Profile doesn't exist!
-- The trigger might have failed to create it
-- ============================================
-- Step 2: Manually create profile if missing
INSERT INTO profiles (user_id, email, full_name, role, staff_id)
SELECT u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', 'Jazil'),
    'owner',
    NULL
FROM auth.users u
WHERE u.email = 'owner@gmail.com' ON CONFLICT (user_id) DO
UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
-- Step 3: Verify profile now exists
SELECT 'Profile verification:' as step,
    p.*
FROM profiles p
WHERE p.email = 'owner@gmail.com';
-- Step 4: Check if user can access their own profile (RLS test)
-- This simulates what happens during login
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO json_build_object(
        'sub',
        (
            SELECT id
            FROM auth.users
            WHERE email = 'owner@gmail.com'
        )::text
    )::text;
SELECT 'RLS Test - Can user see their profile?' as test,
    *
FROM profiles
WHERE user_id = (
        SELECT id
        FROM auth.users
        WHERE email = 'owner@gmail.com'
    );
-- Reset
RESET role;
RESET "request.jwt.claims";
-- ============================================
-- Step 5: Verify all required tables exist
-- ============================================
SELECT 'Checking required tables...' as step,
    table_name,
    CASE
        WHEN table_name IN (
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
        VALUES ('profiles'),
            ('business_settings'),
            ('staff'),
            ('services'),
            ('clients'),
            ('bookings'),
            ('payments'),
            ('call_logs')
    ) AS required_tables(table_name);
-- ============================================
-- If all checks pass, try login again!
-- ============================================
-- URL: http://localhost:3000
-- Email: owner@gmail.com
-- Password: LuxeAurea2026!
-- ============================================