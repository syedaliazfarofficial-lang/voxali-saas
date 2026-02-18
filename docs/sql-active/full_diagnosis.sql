-- ============================================================
-- FULL DIAGNOSIS: Find the REAL cause of "Database error querying schema"
-- Run each section one at a time and share the results
-- ============================================================
-- Step 1: Check ALL triggers on auth.users
SELECT trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
    AND event_object_schema = 'auth';
-- Step 2: Check profiles table columns
SELECT column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
    AND table_schema = 'public'
ORDER BY ordinal_position;
-- Step 3: Check ALL policies on profiles
SELECT policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';
-- Step 4: Check if profiles has RLS enabled
SELECT relname,
    relrowsecurity,
    relforcerowsecurity
FROM pg_class
WHERE relname = 'profiles';
-- Step 5: Check if there are any auth hooks configured
SELECT *
FROM auth.flow_state
LIMIT 5;
-- Step 6: Try to manually check if the profile exists for sarah.johnson@salon.com
SELECT id,
    user_id,
    email,
    role,
    tenant_id,
    staff_id
FROM profiles
WHERE email = 'sarah.johnson@salon.com';
-- Step 7: Check auth.users for this user
SELECT id,
    email,
    role,
    encrypted_password IS NOT NULL as has_password,
    email_confirmed_at IS NOT NULL as email_confirmed,
    last_sign_in_at,
    raw_app_meta_data
FROM auth.users
WHERE email = 'sarah.johnson@salon.com';
-- Step 8: Check for the on_auth_user_created trigger function definition
SELECT prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';