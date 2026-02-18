-- ============================================
-- TIMEZONE SUPPORT - SIMPLIFIED VERSION
-- ============================================
-- Copy this entire code and run in Supabase SQL Editor

-- Step 1: Add timezone column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Step 2: Update existing tenant with salon timezone
UPDATE public.tenants 
SET timezone = 'America/New_York'
WHERE timezone IS NULL OR timezone = '';

-- Step 3: Verify it worked
SELECT id, timezone FROM public.tenants;
