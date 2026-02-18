-- Emergency Fix: Check and Create Owner Profile
-- Run this in Supabase SQL Editor if pages are stuck loading
-- 1. Check if owner profile exists
SELECT u.id as user_id,
    u.email,
    p.full_name,
    p.role,
    p.staff_id
FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE u.email = 'owner@gmail.com';
-- If the above returns NULL for profile fields, run this:
-- 2. Create profile if missing
DO $$
DECLARE v_user_id UUID;
BEGIN -- Get owner user ID
SELECT id INTO v_user_id
FROM auth.users
WHERE email = 'owner@gmail.com';
-- Check if profile exists
IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE user_id = v_user_id
) THEN -- Create missing profile (without tenant_id since column doesn't exist)
INSERT INTO public.profiles (user_id, full_name, role, status)
VALUES (
        v_user_id,
        'Owner',
        'owner',
        'active'
    );
RAISE NOTICE 'Profile created for owner@gmail.com';
ELSE RAISE NOTICE 'Profile already exists';
END IF;
END $$;
-- 3. Verify the profile was created
SELECT u.id as user_id,
    u.email,
    p.full_name,
    p.role,
    p.status
FROM auth.users u
    INNER JOIN public.profiles p ON p.user_id = u.id
WHERE u.email = 'owner@gmail.com';