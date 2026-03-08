-- ============================================================
-- UPDATE PASSWORDS FOR BOTH ACCOUNTS
-- Run this in Supabase SQL Editor
-- ============================================================
-- 1. Update Luxe Aurea Owner Password
UPDATE auth.users
SET encrypted_password = crypt('Luze@545537', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'owner@gmail.com';
-- 2. Update Super Admin Password  
UPDATE auth.users
SET encrypted_password = crypt('Pak@545537', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'super@voxali.com';
-- Verify both updated
SELECT email,
    updated_at::date as last_updated
FROM auth.users
WHERE email IN ('owner@gmail.com', 'super@voxali.com');
SELECT '✅ Passwords updated successfully!' as status;