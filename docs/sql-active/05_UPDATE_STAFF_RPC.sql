-- Voxali DB Migration: Update Staff RPCs for Payroll

-- 1. Update Staff Board RPC to return commission and salary
DROP FUNCTION IF EXISTS rpc_staff_board(UUID);

CREATE OR REPLACE FUNCTION rpc_staff_board(p_tenant_id UUID) 
RETURNS TABLE(
        id UUID,
        full_name TEXT,
        role TEXT,
        color TEXT,
        is_active BOOLEAN,
        bookings_count BIGINT,
        revenue NUMERIC,
        is_blocked_today BOOLEAN,
        commission_percent NUMERIC,
        base_salary NUMERIC
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT s.id,
    s.full_name,
    s.role,
    s.color,
    s.is_active,
    COUNT(b.id),
    COALESCE(SUM(b.total_price), 0),
    EXISTS(
        SELECT 1
        FROM staff_timeoff t
        WHERE t.staff_id = s.id
            AND t.start_datetime::date <= CURRENT_DATE
            AND t.end_datetime::date >= CURRENT_DATE
    ),
    s.commission_percent,
    s.base_salary
FROM staff s
    LEFT JOIN bookings b ON b.stylist_id = s.id
    AND b.start_time >= date_trunc('month', CURRENT_DATE)
    AND b.status NOT IN ('cancelled', 'no_show')
WHERE s.tenant_id = p_tenant_id
GROUP BY s.id,
    s.full_name,
    s.role,
    s.color,
    s.is_active,
    s.commission_percent,
    s.base_salary
ORDER BY revenue DESC;
END;
$$;

-- 2. Create RPC to Update Staff Payroll
CREATE OR REPLACE FUNCTION rpc_update_payroll(
    p_tenant_id UUID, 
    p_staff_id UUID, 
    p_commission NUMERIC,
    p_salary NUMERIC
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE staff 
    SET commission_percent = p_commission,
        base_salary = p_salary
    WHERE id = p_staff_id AND tenant_id = p_tenant_id;
    
    RETURN json_build_object('success', true);
END;
$$;
