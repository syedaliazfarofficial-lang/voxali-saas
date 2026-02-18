-- ============================================
-- TIMEZONE SUPPORT FOR USA-WIDE OPERATIONS
-- ============================================
-- Run this in Supabase SQL Editor

-- 1. Add timezone column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.timezone IS 'IANA timezone identifier (e.g., America/New_York, America/Los_Angeles)';

-- 2. Update existing tenant with salon timezone
-- Replace with actual tenant_id from your tenants table
UPDATE public.tenants 
SET timezone = 'America/New_York'  -- Change to actual salon timezone
WHERE id = (SELECT id FROM public.tenants LIMIT 1);

-- 3. Create helper function to convert times to salon timezone
CREATE OR REPLACE FUNCTION get_tenant_timezone(tenant_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT timezone FROM public.tenants WHERE id = tenant_uuid);
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Add timezone info to bookings view (optional but helpful)
CREATE OR REPLACE VIEW bookings_with_timezone AS
SELECT 
  b.*,
  t.timezone as salon_timezone,
  b.start_at AT TIME ZONE t.timezone as start_at_local,
  b.end_at AT TIME ZONE t.timezone as end_at_local
FROM public.bookings b
JOIN public.tenants t ON b.tenant_id = t.id;

-- Grant access to view
GRANT SELECT ON bookings_with_timezone TO authenticated;
GRANT SELECT ON bookings_with_timezone TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check timezone is set (only showing id and timezone)
SELECT id, timezone FROM public.tenants;

-- Test timezone conversion
SELECT NOW() as utc_time,
       NOW() AT TIME ZONE 'America/New_York' as ny_time,
       NOW() AT TIME ZONE 'America/Los_Angeles' as la_time,
       NOW() AT TIME ZONE 'America/Chicago' as chicago_time,
       NOW() AT TIME ZONE 'America/Denver' as denver_time;

-- ============================================
-- COMMON USA TIMEZONES
-- ============================================
-- Use these values when configuring:
-- 'America/New_York'       - Eastern Time (EST/EDT)
-- 'America/Chicago'        - Central Time (CST/CDT)
-- 'America/Denver'         - Mountain Time (MST/MDT)
-- 'America/Los_Angeles'    - Pacific Time (PST/PDT)
-- 'America/Phoenix'        - Arizona (no DST)
-- 'America/Anchorage'      - Alaska Time
-- 'Pacific/Honolulu'       - Hawaii Time
