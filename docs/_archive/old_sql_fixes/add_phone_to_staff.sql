-- =====================================================
-- ADD PHONE COLUMN TO STAFF TABLE
-- Quick fix for missing phone column
-- =====================================================

ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN staff.phone IS 'Staff member phone number';

-- Done!
