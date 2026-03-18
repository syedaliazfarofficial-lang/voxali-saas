-- Debug function to dump variables
CREATE OR REPLACE FUNCTION debug_slots(p_tenant_id UUID, p_date DATE)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
    v_tenant RECORD;
    v_day_of_week INTEGER;
    v_open_time TIME;
    v_close_time TIME;
    v_is_open BOOLEAN;
    v_staff_wh RECORD;
BEGIN
    SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;
    
    v_day_of_week := EXTRACT(DOW FROM p_date);

    SELECT open_time, close_time, is_open
    INTO v_open_time, v_close_time, v_is_open
    FROM tenant_hours
    WHERE tenant_id = p_tenant_id AND day_of_week = v_day_of_week;

    IF NOT FOUND THEN
        v_open_time := v_tenant.open_time;
        v_close_time := v_tenant.close_time;
        v_is_open := TRUE;
    END IF;

    SELECT start_time, end_time, is_working
    INTO v_staff_wh
    FROM staff_working_hours
    WHERE tenant_id = p_tenant_id AND staff_id = '8bac5491-43a0-4098-8268-bf14c2501fc3' AND day_of_week = v_day_of_week;

    RETURN json_build_object(
        'date', p_date,
        'dow', v_day_of_week,
        'tenant_open', v_open_time,
        'tenant_close', v_close_time,
        'tenant_is_open', v_is_open,
        'staff_wh_start', v_staff_wh.start_time,
        'staff_wh_end', v_staff_wh.end_time,
        'staff_is_working', v_staff_wh.is_working
    );
END;
$$;
