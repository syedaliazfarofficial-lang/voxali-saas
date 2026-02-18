-- ============================================
-- SIMPLE FIX - Just Create Profile
-- ============================================
-- Step 1: Check if profile exists
SELECT 'Step 1: Checking profile...' as step,
    COUNT(*) as profile_count
FROM profiles
WHERE email = 'owner@gmail.com';
-- Step 2: Create profile (will update if exists)
INSERT INTO profiles (user_id, email, full_name, role, staff_id)
SELECT u.id,
    u.email,
    'Jazil',
    'owner',
    NULL
FROM auth.users u
WHERE u.email = 'owner@gmail.com' ON CONFLICT (user_id) DO
UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
-- Step 3: Verify profile created
SELECT 'Step 2: Profile verification' as step,
    id,
    user_id,
    email,
    full_name,
    role
FROM profiles
WHERE email = 'owner@gmail.com';
-- Step 4: Check all required tables exist
SELECT 'Step 3: Table check' as step,
    COUNT(*) as tables_exist
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'profiles',
        'business_settings',
        'staff',
        'services',
        'clients',
        'bookings',
        'payments',
        'call_logs'
    );
-- Should return 8
-- ============================================
-- NOW TRY LOGIN:
-- http://localhost:3000
-- Email: owner@gmail.com
-- Password: LuxeAurea2026!
-- ============================================