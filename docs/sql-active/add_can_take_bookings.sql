-- ============================================================
-- ADD can_take_bookings COLUMN & UPDATE RPC FUNCTIONS
-- Run this in Supabase SQL Editor
-- ============================================================
-- Step 1: Add column to staff table if not exists
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS can_take_bookings BOOLEAN NOT NULL DEFAULT TRUE;
-- Step 2: Update rpc_add_staff to accept can_take_bookings param
DROP FUNCTION IF EXISTS rpc_add_staff(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL);
CREATE OR REPLACE FUNCTION rpc_add_staff(
        p_tenant_id UUID,
        p_name TEXT,
        p_email TEXT DEFAULT NULL,
        p_phone TEXT DEFAULT NULL,
        p_role TEXT DEFAULT 'stylist',
        p_commission DECIMAL DEFAULT 15.00,
        p_can_take_bookings BOOLEAN DEFAULT TRUE
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
INSERT INTO staff (
        tenant_id,
        full_name,
        email,
        phone,
        role,
        commission_rate,
        is_active,
        can_take_bookings
    )
VALUES (
        p_tenant_id,
        p_name,
        p_email,
        p_phone,
        p_role,
        p_commission,
        true,
        p_can_take_bookings
    )
RETURNING id INTO v_id;
RETURN json_build_object('success', true, 'staff_id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_add_staff(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, BOOLEAN) TO anon,
    authenticated;
-- Step 3: Update rpc_staff_board to return can_take_bookings
DROP FUNCTION IF EXISTS rpc_staff_board(UUID);
CREATE OR REPLACE FUNCTION rpc_staff_board(p_tenant_id UUID) RETURNS TABLE (
        id UUID,
        full_name TEXT,
        role TEXT,
        color TEXT,
        is_active BOOLEAN,
        is_blocked_today BOOLEAN,
        bookings_count BIGINT,
        revenue NUMERIC,
        commission_rate NUMERIC,
        email TEXT,
        phone TEXT,
        can_take_bookings BOOLEAN
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT s.id,
    s.full_name,
    s.role,
    COALESCE(s.color, '#D4AF37') AS color,
    s.is_active,
    COALESCE(s.is_blocked_today, false) AS is_blocked_today,
    COUNT(b.id)::BIGINT AS bookings_count,
    COALESCE(SUM(b.total_price), 0)::NUMERIC AS revenue,
    COALESCE(s.commission_rate, 15)::NUMERIC AS commission_rate,
    s.email,
    s.phone,
    COALESCE(s.can_take_bookings, true) AS can_take_bookings
FROM staff s
    LEFT JOIN bookings b ON b.staff_id = s.id
    AND b.status NOT IN ('cancelled', 'no_show')
WHERE s.tenant_id = p_tenant_id
GROUP BY s.id,
    s.full_name,
    s.role,
    s.color,
    s.is_active,
    s.is_blocked_today,
    s.commission_rate,
    s.email,
    s.phone,
    s.can_take_bookings
ORDER BY s.is_active DESC,
    s.full_name;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_staff_board(UUID) TO anon,
    authenticated;
-- Step 4: Update get_available_slots to filter by can_take_bookings
-- (Add this WHERE condition to staff join in the existing function)
-- Run this ONLY if your get_available_slots function queries staff directly.
-- It may already work via staff_working_hours filter.
-- Step 5: Set Sophia Lee as non-bookable (update her record)
-- UPDATE staff SET can_take_bookings = FALSE 
-- WHERE full_name = 'Sophia Lee' AND tenant_id = '527f8f35-72f0-4818-b514-ad7695cd076a';
NOTIFY pgrst,
'reload schema';
SELECT '✅ can_take_bookings added to staff, rpc_add_staff, rpc_staff_board' AS status;