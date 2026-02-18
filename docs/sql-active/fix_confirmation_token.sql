-- ============================================================
-- THE REAL FIX: confirmation_token is NULL in auth.users
-- GoTrue expects a string, not NULL
-- Run this in Supabase SQL Editor
-- ============================================================
-- Fix ALL users: set empty string instead of NULL for token columns
UPDATE auth.users
SET confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    email_change = COALESCE(email_change, ''),
    phone_change = COALESCE(phone_change, ''),
    phone = COALESCE(phone, '')
WHERE confirmation_token IS NULL
    OR recovery_token IS NULL
    OR email_change_token_new IS NULL;
-- Verify the fix
SELECT id,
    email,
    confirmation_token IS NULL as token_null,
    recovery_token IS NULL as recovery_null
FROM auth.users;