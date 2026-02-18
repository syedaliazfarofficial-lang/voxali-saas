-- ============================================
-- PASSWORD RESET & EMAIL VERIFICATION
-- Run these in Supabase SQL Editor
-- ============================================
-- STEP 1: Check current user status
SELECT id,
    email,
    email_confirmed_at,
    confirmed_at,
    last_sign_in_at,
    created_at
FROM auth.users
WHERE email = 'owner@gmail.com';
-- Expected: You should see the user with ID: 0be45f0d-11a0-44b4-9a7b-cf99a34b769d
-- Check if email_confirmed_at and confirmed_at have timestamps
-- ============================================
-- STEP 2: Confirm email (if not confirmed)
-- ============================================
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'owner@gmail.com';
-- Result: Should say "UPDATE 1"
-- ============================================
-- STEP 3: Verify the update worked
-- ============================================
SELECT id,
    email,
    email_confirmed_at,
    confirmed_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'owner@gmail.com';
-- Expected: Both email_confirmed_at and confirmed_at should now have timestamps!
-- ============================================
-- STEP 4: Check profile exists
-- ============================================
SELECT id,
    user_id,
    email,
    full_name,
    role,
    created_at
FROM profiles
WHERE email = 'owner@gmail.com';
-- Expected: Should show Jazil's profile with role = 'owner'
-- ============================================
-- AFTER RUNNING THESE:
-- ============================================
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click on owner@gmail.com
-- 3. Reset password to something like: LuxeAurea2026!
-- 4. Test login at http://localhost:3000
-- ============================================
-- ============================================
-- TROUBLESHOOTING: If user doesn't exist
-- ============================================
-- Check if user was deleted:
SELECT COUNT(*) as user_count
FROM auth.users
WHERE email = 'owner@gmail.com';
-- If count = 0, user needs to be recreated via:
-- Supabase Dashboard → Authentication → Add User
-- OR signup via the dashboard at http://localhost:3000/signup
-- ============================================
-- Reference Info
-- ============================================
-- Email: owner@gmail.com
-- User ID: 0be45f0d-11a0-44b4-9a7b-cf99a34b769d
-- Name: Jazil
-- Role: owner
-- Dashboard: http://localhost:3000
-- ============================================