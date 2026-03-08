-- =============================================
-- STAFF LEAVE MANAGEMENT & PERMANENT DELETE
-- Run in Supabase SQL Editor
-- =============================================
-- 1. Permanently delete an inactive staff member
CREATE OR REPLACE FUNCTION rpc_delete_staff_permanent(p_tenant_id UUID, p_staff_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_active BOOLEAN;
BEGIN -- Safety check: Only delete inactive staff
SELECT is_active INTO v_active
FROM staff
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
IF v_active IS NULL THEN RETURN json_build_object('success', false, 'error', 'Staff not found');
END IF;
IF v_active = true THEN RETURN json_build_object(
    'success',
    false,
    'error',
    'Cannot delete active staff. Deactivate first.'
);
END IF;
-- Clean up related records
DELETE FROM staff_timeoff
WHERE staff_id = p_staff_id
    AND tenant_id = p_tenant_id;
DELETE FROM staff_services
WHERE staff_id = p_staff_id;
-- Nullify bookings references (preserve booking history)
UPDATE bookings
SET stylist_id = NULL
WHERE stylist_id = p_staff_id
    AND tenant_id = p_tenant_id;
-- Delete the staff record
DELETE FROM staff
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true);
END;
$$;
-- 2. Check booking conflicts for a leave date range
CREATE OR REPLACE FUNCTION rpc_check_leave_conflicts(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_start_date DATE,
        p_end_date DATE
    ) RETURNS TABLE(
        booking_id UUID,
        client_name TEXT,
        service_name TEXT,
        start_time TIMESTAMPTZ,
        status TEXT
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT b.id,
    COALESCE(c.name, 'Walk-in'),
    COALESCE(s.name, 'Unknown'),
    b.start_time,
    b.status
FROM bookings b
    LEFT JOIN clients c ON c.id = b.client_id
    LEFT JOIN services s ON s.id = b.service_id
WHERE b.tenant_id = p_tenant_id
    AND b.stylist_id = p_staff_id
    AND b.start_time::date >= p_start_date
    AND b.start_time::date <= p_end_date
    AND b.status NOT IN ('cancelled', 'no_show')
ORDER BY b.start_time;
END;
$$;
-- 3. Set staff leave (insert into staff_timeoff)
CREATE OR REPLACE FUNCTION rpc_set_staff_leave(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_start_date DATE,
        p_end_date DATE,
        p_reason TEXT DEFAULT 'Leave'
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
INSERT INTO staff_timeoff (
        tenant_id,
        staff_id,
        start_datetime,
        end_datetime,
        reason
    )
VALUES (
        p_tenant_id,
        p_staff_id,
        p_start_date::timestamptz,
        (
            p_end_date + INTERVAL '1 day' - INTERVAL '1 second'
        )::timestamptz,
        p_reason
    )
RETURNING id INTO v_id;
RETURN json_build_object('success', true, 'leave_id', v_id);
END;
$$;
-- 4. Get all upcoming leaves for a staff member
CREATE OR REPLACE FUNCTION rpc_get_staff_leaves(p_tenant_id UUID, p_staff_id UUID) RETURNS TABLE(
        id UUID,
        start_datetime TIMESTAMPTZ,
        end_datetime TIMESTAMPTZ,
        reason TEXT
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT t.id,
    t.start_datetime,
    t.end_datetime,
    t.reason
FROM staff_timeoff t
WHERE t.tenant_id = p_tenant_id
    AND t.staff_id = p_staff_id
    AND t.end_datetime >= NOW()
ORDER BY t.start_datetime;
END;
$$;
-- 5. Cancel a specific leave
CREATE OR REPLACE FUNCTION rpc_cancel_staff_leave(p_tenant_id UUID, p_leave_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
DELETE FROM staff_timeoff
WHERE id = p_leave_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true);
END;
$$;
-- Grant permissions
GRANT EXECUTE ON FUNCTION rpc_delete_staff_permanent(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_check_leave_conflicts(UUID, UUID, DATE, DATE) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_set_staff_leave(UUID, UUID, DATE, DATE, TEXT) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_staff_leaves(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_cancel_staff_leave(UUID, UUID) TO anon,
    authenticated;
SELECT '✅ Leave Management & Delete RPCs created!' AS status;