-- ============================================================
-- DIAGNOSTIC: Verify staff-profile linkages are correct
-- Run this in Supabase SQL Editor to check existing data
-- ============================================================
-- 1. Show all staff-linked profiles and verify tenant match
SELECT p.email,
    p.role,
    p.staff_id,
    p.tenant_id as profile_tenant,
    s.tenant_id as staff_tenant,
    s.full_name as staff_name,
    CASE
        WHEN p.staff_id IS NULL THEN '⚠️ NO STAFF LINK'
        WHEN s.id IS NULL THEN '❌ BROKEN LINK (staff missing)'
        WHEN p.tenant_id != s.tenant_id THEN '❌ TENANT MISMATCH!'
        ELSE '✅ OK'
    END as status
FROM profiles p
    LEFT JOIN staff s ON s.id = p.staff_id
WHERE p.role IN ('staff', 'stylist');
-- 2. Show staff members without profile/login
SELECT s.id as staff_id,
    s.full_name,
    s.email,
    s.tenant_id,
    p.id as profile_id,
    CASE
        WHEN p.id IS NULL THEN '⚠️ No login created'
        ELSE '✅ Has login'
    END as login_status
FROM staff s
    LEFT JOIN profiles p ON p.staff_id = s.id
WHERE s.is_active = true
ORDER BY s.tenant_id,
    s.full_name;