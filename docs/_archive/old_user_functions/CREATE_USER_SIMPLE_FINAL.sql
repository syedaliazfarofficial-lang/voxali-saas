-- ============================================
-- FINAL FIX - Create User Properly
-- ============================================
-- STEP 1: Delete old user
DELETE FROM auth.users
WHERE email = 'owner@gmail.com';
-- STEP 2: Disable trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- STEP 3: Insert user with proper password hash
INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    )
VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'owner@gmail.com',
        crypt('LuxeAurea2026!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Jazil"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );
-- STEP 4: Create profile manually
INSERT INTO profiles (user_id, email, full_name, role)
SELECT id,
    'owner@gmail.com',
    'Jazil',
    'owner'
FROM auth.users
WHERE email = 'owner@gmail.com' ON CONFLICT (user_id) DO
UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
-- STEP 5: Re-enable trigger
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- STEP 6: Verify
SELECT 'SUCCESS!' as status,
    u.id as user_id,
    u.email,
    u.email_confirmed_at as confirmed,
    p.full_name,
    p.role
FROM auth.users u
    LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'owner@gmail.com';