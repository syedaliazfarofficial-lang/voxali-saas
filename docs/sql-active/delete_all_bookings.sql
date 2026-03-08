-- ==========================================
-- SCRIPT TO DELETE ALL OLD BOOKINGS
-- WARNING: This will permanently delete all bookings, 
-- booking items, and related payments.
-- ==========================================
-- 1. Delete all payments associated with bookings First (Foreign Key Dependency)
DELETE FROM payments;
-- 2. Delete all booking items (Foreign Key Dependency on bookings)
DELETE FROM booking_items;
-- 3. Delete all bookings
DELETE FROM bookings;
-- Optional: If you want to delete call logs that might be linked to bookings
-- DELETE FROM call_logs; 
-- Verify Deletion
SELECT '✅ All old bookings and related data have been successfully deleted!' as status;