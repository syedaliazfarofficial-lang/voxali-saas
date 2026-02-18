-- =============================================
-- 🔧 FIX REMAINING COLUMN MISMATCHES
-- Run in: Supabase → SQL Editor → Paste → Run
-- =============================================
-- FIX 1: Services table — workflow uses duration_min, DB has duration
-- Add alias column (or rename)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'services'
        AND column_name = 'duration_min'
) THEN -- Add duration_min as computed alias
ALTER TABLE services
ADD COLUMN duration_min INTEGER;
-- Copy existing data
UPDATE services
SET duration_min = duration;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'services'
        AND column_name = 'cleanup_buffer_min'
) THEN
ALTER TABLE services
ADD COLUMN cleanup_buffer_min INTEGER DEFAULT 0;
UPDATE services
SET cleanup_buffer_min = COALESCE(processing_duration, 0);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'services'
        AND column_name = 'deposit_required'
) THEN
ALTER TABLE services
ADD COLUMN deposit_required BOOLEAN DEFAULT FALSE;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'services'
        AND column_name = 'deposit_amount'
) THEN
ALTER TABLE services
ADD COLUMN deposit_amount DECIMAL(10, 2) DEFAULT 0;
END IF;
END $$;
-- FIX 2: Bookings table — workflow sends columns that don't exist
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS total_duration_min INTEGER;
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS buffer_min INTEGER DEFAULT 0;
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
-- FIX 3: Bookings status — workflow uses 'pending_payment' but DB has 'pending_deposit'
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
ADD CONSTRAINT bookings_status_check CHECK (
        status IN (
            'pending_deposit',
            'pending_payment',
            'pending',
            'pending_confirmation',
            'confirmed',
            'checked_in',
            'in_progress',
            'completed',
            'cancelled',
            'no_show'
        )
    );
-- FIX 4: Staff table — workflow uses 'status' field, DB uses 'is_active'
-- Add status column if missing
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'staff'
        AND column_name = 'status'
) THEN
ALTER TABLE staff
ADD COLUMN status TEXT DEFAULT 'active';
UPDATE staff
SET status = CASE
        WHEN is_active THEN 'active'
        ELSE 'inactive'
    END;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'staff'
        AND column_name = 'name'
) THEN
ALTER TABLE staff
ADD COLUMN name TEXT;
UPDATE staff
SET name = full_name;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'staff'
        AND column_name = 'can_take_bookings'
) THEN
ALTER TABLE staff
ADD COLUMN can_take_bookings BOOLEAN DEFAULT TRUE;
END IF;
END $$;
-- FIX 5: Staff working hours — workflow queries 'weekday', DB might use 'day_of_week'
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'staff_working_hours'
        AND column_name = 'weekday'
) THEN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'staff_working_hours'
        AND column_name = 'day_of_week'
) THEN
ALTER TABLE staff_working_hours
    RENAME COLUMN day_of_week TO weekday;
ELSE
ALTER TABLE staff_working_hours
ADD COLUMN weekday INTEGER;
END IF;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'staff_working_hours'
        AND column_name = 'is_working'
) THEN
ALTER TABLE staff_working_hours
ADD COLUMN is_working BOOLEAN DEFAULT TRUE;
END IF;
END $$;
-- FIX 6: Tenants table — speed function needs these
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS default_buffer_min INTEGER DEFAULT 15;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS open_time TIME DEFAULT '09:00';
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS close_time TIME DEFAULT '21:00';
-- =============================================
-- VERIFY
-- =============================================
SELECT '✅ Services: duration_min' as fix,
    EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'services'
            AND column_name = 'duration_min'
    ) as ok;
SELECT '✅ Bookings: total_duration_min' as fix,
    EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
            AND column_name = 'total_duration_min'
    ) as ok;
SELECT '✅ Staff: status + name' as fix,
    EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'staff'
            AND column_name = 'status'
    ) as ok;
SELECT '✅ Staff working_hours: weekday' as fix,
    EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'staff_working_hours'
            AND column_name = 'weekday'
    ) as ok;
SELECT '✅ Tenants: default_buffer_min' as fix,
    EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tenants'
            AND column_name = 'default_buffer_min'
    ) as ok;
SELECT '🎉 ALL COLUMN FIXES APPLIED!' as result;