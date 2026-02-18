-- ============================================
-- STAFF LOGIN MANAGEMENT
-- Manual SQL Commands for Creating Staff Logins
-- ============================================

-- ============================================
-- STEP 1: CREATE MANAGER LOGIN
-- ============================================

-- When owner asks for manager login:

-- 1. Create auth user in Supabase Dashboard:
--    - Go to: Authentication → Users → Add User
--    - Email: manager@example.com
--    - Password: TempPass123!
--    - Auto Confirm: ✅ (check this!)
--    - Click "Create User"
--    - COPY the user_id that appears

-- 2. Link to existing staff record:
INSERT INTO profiles (
    user_id,
    tenant_id,
    email,
    full_name,
    role,
    staff_id  -- Link to staff table
) VALUES (
    'AUTH_USER_ID_HERE'::uuid,        -- From step 1
    'TENANT_ID_HERE'::uuid,           -- Owner's tenant_id
    'manager@example.com',
    'Manager Full Name',
    'manager',                        -- Manager role
    'STAFF_ID_FROM_STAFF_TABLE'::uuid -- Get from staff table
);

-- 3. Verify staff exists:
SELECT id, full_name, role, email 
FROM staff 
WHERE tenant_id = 'TENANT_ID_HERE'::uuid 
AND role = 'manager';

-- Manager can now login with:
-- Email: manager@example.com
-- Password: TempPass123!
-- They can change password after login

-- ============================================
-- STEP 2: CREATE STYLIST LOGIN
-- ============================================

-- When owner asks for stylist login:

-- 1. Create auth user in Supabase Dashboard (same as manager)

-- 2. Link to staff record:
INSERT INTO profiles (
    user_id,
    tenant_id,
    email,
    full_name,
    role,
    staff_id
) VALUES (
    'AUTH_USER_ID_HERE'::uuid,
    'TENANT_ID_HERE'::uuid,
    'stylist@example.com',
    'Stylist Full Name',
    'stylist',                        -- Stylist role (limited access)
    'STAFF_ID_FROM_STAFF_TABLE'::uuid
);

-- ============================================
-- WHAT EACH ROLE CAN SEE
-- ============================================

-- TENANT_ADMIN (Owner):
-- ✅ Everything in their salon
-- ✅ All bookings
-- ✅ All payments
-- ✅ All clients
-- ✅ Staff management
-- ✅ Settings
-- ✅ Reports

-- MANAGER:
-- ✅ All bookings (read + create)
-- ✅ All payments (view + confirm)
-- ✅ All clients (view)
-- ✅ Sales reports (view)
-- ❌ Staff management (no access)
-- ❌ Settings (no access)

-- STYLIST:
-- ✅ Own bookings only (view + create)
-- ✅ Assigned clients only
-- ❌ Other stylists' bookings (no access)
-- ❌ Payments (no access)
-- ❌ Reports (no access)
-- ❌ Settings (no access)

-- ============================================
-- STEP 3: RESET PASSWORD (When Forgotten)
-- ============================================

-- When staff forgets password:

-- Option 1: Reset via Supabase Dashboard (EASIEST)
-- 1. Go to: Authentication → Users
-- 2. Find user by email
-- 3. Click user → Click "Reset Password"
-- 4. Copy new password
-- 5. Send to staff via WhatsApp/Email

-- Option 2: Reset via SQL (if Supabase not available)
-- NOTE: This requires Supabase Admin API or Dashboard access

-- Get user details first:
SELECT 
    p.user_id,
    p.email,
    p.full_name,
    p.role,
    u.email as auth_email
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.email = 'staff@example.com';

-- Then reset in Supabase Dashboard using user_id

-- ============================================
-- STEP 4: DISABLE STAFF LOGIN
-- ============================================

-- If staff leaves or owner wants to disable access:

-- Option 1: Soft delete (recommended - keeps data)
UPDATE profiles 
SET is_active = false  -- Add this column if needed
WHERE user_id = 'USER_ID_HERE'::uuid;

-- Option 2: Delete completely
DELETE FROM profiles 
WHERE user_id = 'USER_ID_HERE'::uuid 
AND role IN ('manager', 'stylist');  -- Safety: Don't delete owners!

-- Staff record stays in staff table
-- Just can't login anymore

-- ============================================
-- STEP 5: LIST ALL LOGINS FOR A TENANT
-- ============================================

-- See all active logins for one salon:
SELECT 
    p.email,
    p.full_name,
    p.role,
    s.full_name as staff_name,
    s.role as staff_role,
    p.created_at as login_created
FROM profiles p
LEFT JOIN staff s ON p.staff_id = s.id
WHERE p.tenant_id = 'TENANT_ID_HERE'::uuid
ORDER BY p.role, p.created_at;

-- ============================================
-- QUICK REFERENCE
-- ============================================

-- CREATE OWNER LOGIN (when adding new customer):
-- 1. Supabase Auth → Add User
-- 2. INSERT INTO profiles with role='tenant_admin'

-- CREATE MANAGER LOGIN (when owner requests):
-- 1. Supabase Auth → Add User  
-- 2. INSERT INTO profiles with role='manager', staff_id=[id]

-- CREATE STYLIST LOGIN (when owner requests):
-- 1. Supabase Auth → Add User
-- 2. INSERT INTO profiles with role='stylist', staff_id=[id]

-- RESET PASSWORD:
-- Supabase Auth → Users → Find user → Reset Password

-- DISABLE LOGIN:
-- DELETE FROM profiles WHERE user_id='...'

-- ============================================
-- EXAMPLE WORKFLOW
-- ============================================

/*
Owner: "I want my manager Sarah to have login"
You: "Sure! What's her email?"
Owner: "sarah@salon.com"

Steps:
1. Check if Sarah exists in staff table:
   SELECT * FROM staff WHERE email='sarah@salon.com';
   
2. Create auth user:
   - Supabase → Auth → Add User
   - Email: sarah@salon.com
   - Password: Welcome123!
   - Get user_id: abc-123-def
   
3. Link profile:
   INSERT INTO profiles (user_id, tenant_id, email, full_name, role, staff_id)
   VALUES ('abc-123-def', 'tenant-id', 'sarah@salon.com', 'Sarah Johnson', 'manager', 'sarah-staff-id');
   
4. Tell owner:
   "Sarah can login at app.yourdomain.com with:
    Email: sarah@salon.com
    Password: Welcome123!"
*/

-- ============================================
-- TEMPLATE FOR EMAIL TO STAFF
-- ============================================

/*
Subject: Your Salon Dashboard Login

Hi [Staff Name],

Your login for the salon dashboard is ready!

Login URL: https://app.yourdomain.com/login
Email: [staff@email.com]
Password: [TempPassword123]

Please change your password after first login.

Access Level: [Manager/Stylist]
- Managers: Can view all bookings, sales, and confirm payments
- Stylists: Can view your own bookings and create manual bookings

Need help? Reply to this email.

Best regards,
[Your Name]
*/

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- Problem: Staff can't login
-- Solution 1: Check if profile exists
SELECT * FROM profiles WHERE email = 'staff@email.com';

-- Solution 2: Check if auth user exists
SELECT * FROM auth.users WHERE email = 'staff@email.com';

-- Solution 3: Check if tenant_id is correct
SELECT 
    p.*,
    t.business_name 
FROM profiles p 
LEFT JOIN tenants t ON p.tenant_id = t.id 
WHERE p.email = 'staff@email.com';

-- Problem: Staff sees wrong data
-- Solution: Verify RLS policies are working
-- Login as staff and check:
SELECT * FROM bookings LIMIT 10;
-- Should only see their tenant's data (or only their own for stylist)

-- Problem: Password reset not working
-- Solution: Use Supabase Dashboard method
-- Auth → Users → Find user → Reset Password → Copy new password

-- ============================================
-- SECURITY NOTES
-- ============================================

-- ✅ Always use strong temporary passwords
-- ✅ Tell staff to change password on first login
-- ✅ Never share passwords via insecure channels
-- ✅ Delete profiles when staff leaves
-- ✅ Verify tenant_id is correct (staff shouldn't see other salons!)
-- ✅ Test login before giving to staff

-- ============================================
-- SUCCESS!
-- ============================================

/*
Now you can:
✅ Create login for owner (tenant_admin)
✅ Create login for manager (manager role)
✅ Create login for stylist (stylist role)  
✅ Reset passwords when forgotten
✅ Disable logins when needed
✅ All via simple SQL + Supabase UI!

Perfect manual control! 💪
*/
