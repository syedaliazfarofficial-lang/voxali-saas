-- ============================================
-- MORNING SETUP - QUICK START GUIDE
-- Everything You Need to Run Tomorrow!
-- ============================================

-- ============================================
-- STEP 1: RUN MULTI-TENANT MIGRATION (30 min)
-- ============================================

-- Open file: /docs/multi_tenant_migration.sql
-- Copy ENTIRE contents
-- Go to: Supabase → SQL Editor
-- Paste and click "Run"

-- This creates:
-- ✅ tenants table
-- ✅ tenant_id columns on all tables  
-- ✅ RLS policies for data isolation
-- ✅ Role system (super_admin, tenant_admin, manager, stylist)

-- ============================================
-- STEP 2: RUN VOICE AGENT SCHEMA (5 min)
-- ============================================

-- Open file: /docs/voice_agent_schema.sql
-- Copy ENTIRE contents
-- Paste in SQL Editor
-- Click "Run"

-- This creates:
-- ✅ tenant_agents table
-- ✅ call_logs table
-- ✅ Voice tracking system

-- ============================================
-- STEP 3: CREATE YOUR SUPER ADMIN (5 min)
-- ============================================

-- First, find your user_id:
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- Copy the 'id' value from result

-- Then create Super Admin profile:
INSERT INTO profiles (
    user_id,
    email,
    full_name,
    role,
    is_protected,
    tenant_id
) VALUES (
    'PASTE_YOUR_USER_ID_HERE'::uuid,  -- From query above
    'YOUR_EMAIL_HERE@example.com',    -- Your email
    'Your Full Name',                  -- Your name
    'super_admin',                     -- Role
    true,                              -- Protected
    NULL                               -- No tenant = see all
);

-- If already exists, update instead:
UPDATE profiles 
SET role = 'super_admin', is_protected = true, tenant_id = NULL
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;

-- ============================================
-- STEP 4: TEST LOGIN (2 min)
-- ============================================

-- 1. Logout from dashboard
-- 2. Login with your email + password
-- 3. Should see dashboard ✅
-- 4. You're now Super Admin!

-- Verify with:
SELECT 
    email,
    full_name,
    role,
    is_protected
FROM profiles 
WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- Should show:
-- role: super_admin
-- is_protected: true

-- ============================================
-- STEP 5: CREATE TEST CUSTOMER (Optional - 15 min)
-- ============================================

-- Test the system with dummy customer

-- 5a. Create tenant
INSERT INTO tenants (
    business_name,
    owner_email,
    owner_name,
    phone,
    address,
    subscription_status,
    subscription_plan,
    agent_enabled
) VALUES (
    'Test Beauty Salon',
    'test@testsalon.com',
    'Test Owner',
    '+1-555-9999',
    '123 Test Street, City, State',
    'active',
    'pro',
    true
) RETURNING id;

-- SAVE THIS ID: ________________________________

-- 5b. Create auth user
-- Go to: Supabase → Authentication → Users → Add User
-- Email: test@testsalon.com
-- Password: TestPass123!
-- Auto Confirm: ✅ (check this!)
-- Click "Create User"
-- COPY user_id: ________________________________

-- 5c. Link profile
INSERT INTO profiles (
    user_id,
    tenant_id,
    email,
    full_name,
    role
) VALUES (
    'AUTH_USER_ID_HERE'::uuid,   -- From step 5b
    'TENANT_ID_HERE'::uuid,      -- From step 5a
    'test@testsalon.com',
    'Test Owner',
    'tenant_admin'
);

-- 5d. Add sample staff
INSERT INTO staff (
    tenant_id,
    full_name,
    role,
    email,
    phone,
    color,
    is_active
) VALUES 
    ('TENANT_ID_HERE'::uuid, 'Sample Stylist 1', 'stylist', 'stylist1@test.com', '+1-555-0001', '#FF6B6B', true),
    ('TENANT_ID_HERE'::uuid, 'Sample Stylist 2', 'stylist', 'stylist2@test.com', '+1-555-0002', '#4ECDC4', true);

-- 5e. Add sample services
INSERT INTO services (
    tenant_id,
    name,
    duration,
    price,
    is_active
) VALUES
    ('TENANT_ID_HERE'::uuid, 'Haircut', 60, 50, true),
    ('TENANT_ID_HERE'::uuid, 'Color', 120, 120, true),
    ('TENANT_ID_HERE'::uuid, 'Blow Dry', 30, 35, true);

-- ============================================
-- STEP 6: TEST DATA ISOLATION (5 min)
-- ============================================

-- Login as test customer:
-- URL: http://localhost:5173/login
-- Email: test@testsalon.com
-- Password: TestPass123!

-- Should see:
-- ✅ Test salon data only
-- ✅ Sample stylists
-- ✅ Sample services
-- ❌ NO other salon data (isolated!)

-- Logout and login as YOU (Super Admin)
-- Should see:
-- ✅ ALL data
-- ✅ Test salon
-- ✅ Everything!

-- ============================================
-- ✅ SUCCESS! SYSTEM READY!
-- ============================================

/*
You now have:
✅ Multi-tenant database
✅ Super Admin account (YOU)
✅ Test customer (optional)
✅ Data isolation working
✅ Role system active
✅ Ready to add real customers!

Next: Start selling and adding customers manually via SQL!
*/

-- ============================================
-- QUICK COMMANDS FOR LATER
-- ============================================

-- View all tenants:
SELECT 
    id,
    business_name,
    owner_email,
    subscription_status,
    created_at
FROM tenants
ORDER BY created_at DESC;

-- View all profiles:
SELECT 
    email,
    full_name,
    role,
    tenant_id
FROM profiles
ORDER BY created_at DESC;

-- Check who's logged in recently:
SELECT 
    p.email,
    p.role,
    t.business_name,
    u.last_sign_in_at
FROM profiles p
LEFT JOIN tenants t ON p.tenant_id = t.id
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY u.last_sign_in_at DESC
LIMIT 10;

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- Can't login as Super Admin?
-- Check profile exists:
SELECT * FROM profiles WHERE role = 'super_admin';

-- If missing, create it (use Step 3 above)

-- Test customer can see your data?
-- Check RLS policies are enabled:
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Should see policies for: tenants, profiles, staff, bookings, etc.

-- ============================================
-- YOU'RE READY! 🚀
-- ============================================

/*
Morning checklist:
[ ] Run multi_tenant_migration.sql
[ ] Run voice_agent_schema.sql
[ ] Create Super Admin
[ ] Test login
[ ] (Optional) Create test customer
[ ] ✅ START SELLING!

Total time: ~1 hour
Then: Ready for customers!
*/
