-- ============================================================
-- FIX SUPER ADMIN LOGIN ERROR
-- Run this script in Supabase SQL Editor
-- ============================================================
-- Fix NULL token values which cause "Database error querying schema"
UPDATE auth.users
SET confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = ''
WHERE email = 'super@voxali.com';
-- Ensure email is confirmed
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'super@voxali.com'
    AND email_confirmed_at IS NULL;
-- Verify the fix
SELECT email,
    confirmation_token,
    recovery_token,
    email_confirmed_at
FROM auth.users
WHERE email = 'super@voxali.com';