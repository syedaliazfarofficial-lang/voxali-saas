-- ============================================
-- STEP 1: Delete old user
-- ============================================
DELETE FROM auth.users
WHERE email = 'owner@gmail.com';
-- ============================================
-- STEP 2: Disable the trigger temporarily
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- ============================================
-- STEP 3: Create user using Supabase function
-- ============================================
-- This uses Supabase's built-in admin function
SELECT extensions.create_user(
        email := 'owner@gmail.com',
        password := 'LuxeAurea2026!',
        email_confirm := true
    );
-- Get the user ID
DO $$
DECLARE v_user_id UUID;
BEGIN
SELECT id INTO v_user_id
FROM auth.users
WHERE email = 'owner@gmail.com';
-- Create profile manually
INSERT INTO profiles (user_id, email, full_name, role)
VALUES (v_user_id, 'owner@gmail.com', 'Jazil', 'owner') ON CONFLICT (user_id) DO
UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
RAISE NOTICE 'User created with ID: %',
v_user_id;
END $$;
-- ============================================
-- STEP 4: Re-enable the trigger
-- ============================================
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================
-- STEP 5: Verify
-- ============================================
SELECT 'Verification' as step,
    u.id,
    u.email,
    u.email_confirmed_at,
    p.full_name,
    p.role
FROM auth.users u
    LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'owner@gmail.com';