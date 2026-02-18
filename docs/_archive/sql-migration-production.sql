-- =====================================================
-- PRODUCTION ADDITIONS - Run this in Supabase SQL Editor
-- =====================================================

-- 1. Day-wise Tenant Hours (replaces simple open_time/close_time)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tenant_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  weekday int NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  is_open boolean NOT NULL DEFAULT true,
  open_time time,
  close_time time,
  UNIQUE(tenant_id, weekday),
  CHECK (is_open = false OR (open_time IS NOT NULL AND close_time IS NOT NULL AND close_time > open_time))
);

-- Seed Luxe Aurea hours: Tue–Fri 10–8, Sat 9–7, Sun 11–5, Mon closed
INSERT INTO public.tenant_hours (tenant_id, weekday, is_open, open_time, close_time)
VALUES
  ('27b20ae0-883b-4b63-a55b-141f16b93b99', 0, true, '11:00', '17:00'),  -- Sunday 11-5
  ('27b20ae0-883b-4b63-a55b-141f16b93b99', 1, false, NULL, NULL),       -- Monday CLOSED
  ('27b20ae0-883b-4b63-a55b-141f16b93b99', 2, true, '10:00', '20:00'),  -- Tuesday 10-8
  ('27b20ae0-883b-4b63-a55b-141f16b93b99', 3, true, '10:00', '20:00'),  -- Wednesday 10-8
  ('27b20ae0-883b-4b63-a55b-141f16b93b99', 4, true, '10:00', '20:00'),  -- Thursday 10-8
  ('27b20ae0-883b-4b63-a55b-141f16b93b99', 5, true, '10:00', '20:00'),  -- Friday 10-8
  ('27b20ae0-883b-4b63-a55b-141f16b93b99', 6, true, '09:00', '19:00')   -- Saturday 9-7
ON CONFLICT (tenant_id, weekday) DO UPDATE
SET is_open = EXCLUDED.is_open,
    open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time;

-- 2. Waitlist Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  client_email text,
  service_ids uuid[] NOT NULL,
  preferred_date date NOT NULL,
  preferred_time_start time,  -- e.g., "morning" = 09:00
  preferred_time_end time,    -- e.g., "morning" = 12:00
  preferred_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'booked', 'expired', 'cancelled')),
  notified_at timestamptz,
  expires_at timestamptz, -- Auto-expire after 7 days
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_tenant_date ON public.waitlist(tenant_id, preferred_date, status);

-- 3. Fix staff_timeoff to use TIMESTAMPTZ (if using DATE, change to TIMESTAMPTZ)
-- =====================================================
-- Check if columns exist as DATE and convert to TIMESTAMPTZ
DO $$
BEGIN
  -- If start_date exists but start_at doesn't, rename for timestamptz
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_timeoff' AND column_name = 'start_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_timeoff' AND column_name = 'start_at'
  ) THEN
    ALTER TABLE public.staff_timeoff RENAME COLUMN start_date TO start_at;
    ALTER TABLE public.staff_timeoff ALTER COLUMN start_at TYPE timestamptz USING start_at::timestamptz;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_timeoff' AND column_name = 'end_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_timeoff' AND column_name = 'end_at'
  ) THEN
    ALTER TABLE public.staff_timeoff RENAME COLUMN end_date TO end_at;
    ALTER TABLE public.staff_timeoff ALTER COLUMN end_at TYPE timestamptz USING end_at::timestamptz;
  END IF;
END $$;

-- 4. Fix cleanup_buffer_min default from 15 to 0 (explicit per-service is better)
-- =====================================================
ALTER TABLE public.services 
  ALTER COLUMN cleanup_buffer_min SET DEFAULT 0;

-- 5. Add RLS for waitlist
-- =====================================================
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_select_owner_or_staff" ON public.waitlist;
CREATE POLICY "waitlist_select_owner_or_staff"
ON public.waitlist
FOR SELECT
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner','manager')
    OR
    preferred_staff_id = (SELECT staff_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- 6. Add RLS for tenant_hours (read-only for authenticated)
-- =====================================================
ALTER TABLE public.tenant_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_hours_select" ON public.tenant_hours;
CREATE POLICY "tenant_hours_select"
ON public.tenant_hours
FOR SELECT
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- 7. Grant permissions
-- =====================================================
GRANT SELECT ON public.tenant_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.waitlist TO authenticated;
