-- =========================================================
-- QA Test Salon Setup: "Luxe Hair Lounge"
-- Run this in Supabase Dashboard → SQL Editor
-- =========================================================
-- STEP 1: Create the tenant
INSERT INTO tenants (
        id,
        salon_name,
        salon_tagline,
        timezone,
        owner_name
    )
VALUES (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Luxe Hair Lounge',
        'Where Style Meets Perfection',
        'America/New_York',
        'Luxe Admin'
    ) ON CONFLICT (id) DO NOTHING;
-- STEP 2: Create users in Supabase Auth + profiles
-- NOTE: You MUST create these users via Supabase Dashboard → Authentication → Users → Add User
-- Or run these via the Auth Admin API. SQL can only create profiles.
-- After creating auth users manually, run this to create profiles:
-- Replace the UUIDs below with the actual auth.users IDs after creating them.
-- =========================================================
-- MANUAL STEPS (Do in Supabase Dashboard → Authentication → Add User):
--
-- 1. luxe.owner@test.com / LuxeOwner@2026
-- 2. sophia@luxe.com / Sophia@2026
-- 3. daniel@luxe.com / Daniel@2026
-- 4. zara@luxe.com / Zara@2026
-- 5. liam@luxe.com / Liam@2026
--
-- After creating each user, copy their UUID and use below.
-- =========================================================
-- STEP 3: Create 4 staff records
INSERT INTO staff (
        id,
        tenant_id,
        full_name,
        email,
        phone,
        specialty,
        is_active
    )
VALUES (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Sophia Martinez',
        'sophia@luxe.com',
        '+1234567001',
        'Colorist',
        true
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Daniel Kim',
        'daniel@luxe.com',
        '+1234567002',
        'Barber',
        true
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Zara Ahmed',
        'zara@luxe.com',
        '+1234567003',
        'Hair Stylist',
        true
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Liam O''Brien',
        'liam@luxe.com',
        '+1234567004',
        'Nail Tech',
        true
    ) ON CONFLICT DO NOTHING;
-- STEP 4: Create sample services
INSERT INTO services (
        id,
        tenant_id,
        name,
        category,
        price,
        duration_minutes,
        is_active
    )
VALUES (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Haircut',
        'Hair',
        35,
        30,
        true
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Hair Color',
        'Hair',
        85,
        90,
        true
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Highlights',
        'Hair',
        120,
        120,
        true
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Beard Trim',
        'Barber',
        20,
        20,
        true
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Men''s Haircut',
        'Barber',
        30,
        25,
        true
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Manicure',
        'Nails',
        40,
        45,
        true
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Pedicure',
        'Nails',
        50,
        60,
        true
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Blowout',
        'Hair',
        45,
        40,
        true
    ) ON CONFLICT DO NOTHING;
-- STEP 5: Create sample clients
INSERT INTO clients (id, tenant_id, name, email, phone)
VALUES (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Emma Wilson',
        'emma.w@email.com',
        '+1555000101'
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'James Parker',
        'james.p@email.com',
        '+1555000102'
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Aisha Khan',
        'aisha.k@email.com',
        '+1555000103'
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Carlos Rivera',
        'carlos.r@email.com',
        '+1555000104'
    ),
    (
        gen_random_uuid(),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Mia Chen',
        'mia.c@email.com',
        '+1555000105'
    ) ON CONFLICT DO NOTHING;
-- DONE! Now create auth users manually and link profiles.
-- See qa-profiles-link.sql for profile linking after auth user creation.