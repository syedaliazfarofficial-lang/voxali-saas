-- ============================================
-- QUICK LOGIN FIX - Run This First!
-- ============================================
-- Step 1: Confirm email (if not confirmed)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'owner@gmail.com';
-- Step 2: Check user status
SELECT id,
    email,
    email_confirmed_at,
    confirmed_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'owner@gmail.com';
-- Step 3: Check profile exists
SELECT *
FROM profiles
WHERE email = 'owner@gmail.com';
-- ============================================
-- If Still Can't Login:
-- ============================================
-- Option 1: Reset password in Supabase Dashboard
-- Go to: Authentication → Users → owner@gmail.com
-- Click: Send password recovery email
-- OR: Manually set new password
-- Option 2: Create new user + profile
-- (Only if above doesn't work)
-- ============================================
-- REFERENCE INFO
-- ============================================
-- User ID: 0be45f0d-11a0-44b4-9a7b-cf99a34b769d
-- Email: owner@gmail.com
-- Name: Jazil
-- Role: owner
-- ============================================
-- After Login Works:
-- ============================================
-- 1. Test dashboard: http://localhost:3000
-- 2. Check all pages load
-- 3. See sample staff & services
-- 4. Ready to customize!