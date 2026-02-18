-- ============================================
-- FIX 500 ERROR - Delete Old User & Recreate Properly
-- ============================================
-- STEP 1: Delete the old user (with bad password hash)
-- Run this in Supabase SQL Editor
DELETE FROM auth.users
WHERE email = 'owner@gmail.com';
-- This will also delete the profile (CASCADE)
-- ============================================
-- STEP 2: Create user via Supabase Dashboard
-- ============================================
-- DON'T use SQL! Use the Supabase Dashboard UI:
-- 
-- 1. Go to: https://supabase.com/dashboard
-- 2. Click your project
-- 3. Go to: Authentication → Users
-- 4. Click "Add User" button
-- 5. Fill in:
--    - Email: owner@gmail.com
--    - Password: LuxeAurea2026!
--    - ✅ Check "Auto Confirm User"
-- 6. Click "Create User"
--
-- This will:
--  ✅ Create auth.users with CORRECT password hash
--  ✅ Trigger the handle_new_user() function
--  ✅ Auto-create profile in profiles table
--  ✅ User can login immediately
-- ============================================
-- STEP 3: Verify profile was created
SELECT 'Profile Check' as step,
    p.id,
    p.user_id,
    p.email,
    p.full_name,
    p.role
FROM profiles p
WHERE p.email = 'owner@gmail.com';
-- Should show the profile with role = 'owner'