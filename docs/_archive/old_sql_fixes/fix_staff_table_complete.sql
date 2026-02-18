-- =====================================================
-- COMPLETE STAFF TABLE FIX
-- Add ALL missing columns that Staff page needs
-- =====================================================

-- Add phone column (MISSING)
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add email column (might already be added)
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add role_title column (might already exist as just 'role')
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS role_title TEXT;

-- Add status column (might already exist)
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add name column (should already exist but just in case)
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Comments for documentation
COMMENT ON COLUMN staff.phone IS 'Staff member phone number';
COMMENT ON COLUMN staff.email IS 'Staff member email address';
COMMENT ON COLUMN staff.role_title IS 'Staff job title (e.g., Stylist, Barber, Manager)';
COMMENT ON COLUMN staff.status IS 'Staff status: active or inactive';
COMMENT ON COLUMN staff.name IS 'Staff member full name';

-- =====================================================
-- VERIFY STAFF TABLE STRUCTURE
-- =====================================================

-- Check all columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'staff'
ORDER BY ordinal_position;

-- =====================================================
-- DONE! Staff table should now have all required columns
-- =====================================================
