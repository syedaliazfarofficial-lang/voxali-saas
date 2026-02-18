-- ============================================
-- COMPLETE RBAC SETUP - RUN IN ORDER
-- ============================================
-- ==========================================
-- STEP 1: UPDATE RLS POLICIES
-- ==========================================
\ i 'c:/Users/syeda/OneDrive/Desktop/Voxali New/docs/UPDATE_RLS_POLICIES.sql' -- ==========================================
-- STEP 2: CREATE USER MANAGEMENT FUNCTIONS
-- ==========================================
\ i 'c:/Users/syeda/OneDrive/Desktop/Voxali New/docs/USER_MANAGEMENT_FUNCTIONS.sql' -- ==========================================
-- STEP 3: VERIFY SETUP
-- ==========================================
-- Check all policies
SELECT tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename,
    policyname;
-- Check functions exist
SELECT routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('create_dashboard_user', 'delete_dashboard_user');
-- ==========================================
-- SUCCESS!
-- ==========================================
SELECT '✅ RBAC setup complete!' as status;