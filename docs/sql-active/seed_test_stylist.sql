-- ==========================================
-- SCRIPT TO SEED A DEFAULT TEST STYLIST
-- Run this if your staff table is empty! 
-- This ensures bookings have a stylist_id
-- ==========================================
-- Replace 'e3cd6ecc-2670-425b-9e80-6874896d32d0' with your actual tenant_id if different
INSERT INTO staff (tenant_id, full_name, email, phone, is_active)
VALUES (
        'e3cd6ecc-2670-425b-9e80-6874896d32d0',
        'Sarah TopStylist',
        'sarah@luxeaurea.com',
        '+15559998888',
        TRUE
    ) -- Only insert if not exists (using a DO NOTHING is harder here without a unique constraint on email+tenant, so we just run it.)
    ON CONFLICT DO NOTHING;
SELECT '✅ Default Test Stylist created successfully!' as status;