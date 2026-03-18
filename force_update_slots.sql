-- DROP all existing overloads of get_available_slots to fix the return type error
DROP FUNCTION IF EXISTS get_available_slots(UUID, DATE);
DROP FUNCTION IF EXISTS get_available_slots(UUID, DATE, UUID[], UUID, INTEGER);

-- Now create the new, fixed, JSON-returning version
-- Now create the new, fixed, JSON-returning version
CREATE OR REPLACE FUNCTION get_available_slots(
        p_tenant_id UUID,
        p_date DATE,
        p_service_ids UUID [] DEFAULT NULL,
        p_staff_id UUID DEFAULT NULL,
        p_slot_interval INTEGER DEFAULT 30
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_tenant RECORD;
v_day_of_week INTEGER;
v_total_duration INTEGER := 0;
v_service RECORD;
v_staff RECORD;
v_wh RECORD;
v_slot_start TIME;
v_slot_end TIME;
v_open_time TIME;
v_close_time TIME;
v_is_open BOOLEAN;
v_conflict_count INTEGER;
v_slots JSON [] := '{}';
v_all_services JSON [] := '{}';
v_salon_tz TEXT;
v_slot_utc TIMESTAMPTZ;
BEGIN
SELECT * INTO v_tenant
FROM tenants
WHERE id = p_tenant_id;
IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'Tenant not found');
END IF;
-- Read timezone from tenant table (NOT hardcoded!)
v_salon_tz := COALESCE(v_tenant.timezone, 'America/Chicago');
v_day_of_week := EXTRACT(
    DOW
    FROM p_date
);
SELECT open_time,
    close_time,
    is_open INTO v_open_time,
    v_close_time,
    v_is_open
FROM tenant_hours
WHERE tenant_id = p_tenant_id
    AND day_of_week = v_day_of_week;
IF NOT FOUND THEN v_open_time := v_tenant.open_time;
v_close_time := v_tenant.close_time;
v_is_open := TRUE;
END IF;
IF NOT v_is_open THEN RETURN json_build_object(
    'ok',
    true,
    'date',
    p_date,
    'salon_timezone',
    v_salon_tz,
    'is_closed',
    true,
    'message',
    'Salon is closed on this day',
    'slots',
    '[]'::json
);
END IF;
IF p_service_ids IS NOT NULL
AND array_length(p_service_ids, 1) > 0 THEN FOR v_service IN
SELECT id,
    name,
    duration,
    price
FROM services
WHERE id = ANY(p_service_ids)
    AND tenant_id = p_tenant_id
    AND is_active = TRUE LOOP v_total_duration := v_total_duration + v_service.duration;
v_all_services := v_all_services || json_build_object(
    'id',
    v_service.id,
    'name',
    v_service.name,
    'duration',
    v_service.duration,
    'price',
    v_service.price
);
END LOOP;
END IF;
IF v_total_duration = 0 THEN v_total_duration := 60;
END IF;
v_total_duration := v_total_duration + COALESCE(v_tenant.default_buffer_min, 15);
FOR v_staff IN
SELECT s.id,
    s.full_name
FROM staff s
WHERE s.tenant_id = p_tenant_id
    AND s.is_active = TRUE
    AND s.can_take_bookings = TRUE
    AND (
        p_staff_id IS NULL
        OR s.id = p_staff_id
    )
    AND NOT EXISTS (
        SELECT 1
        FROM staff_timeoff st
        WHERE st.staff_id = s.id
            AND p_date BETWEEN st.start_datetime::date AND st.end_datetime::date
    ) LOOP FOR v_wh IN
SELECT start_time,
    end_time
FROM staff_working_hours
WHERE staff_id = v_staff.id
    AND tenant_id = p_tenant_id
    AND day_of_week = v_day_of_week
    AND is_working = TRUE LOOP v_slot_start := GREATEST(v_wh.start_time, v_open_time);
v_slot_end := LEAST(v_wh.end_time, v_close_time);
WHILE v_slot_start + (v_total_duration || ' minutes')::interval <= v_slot_end LOOP v_slot_utc := (p_date + v_slot_start) AT TIME ZONE v_salon_tz;
SELECT COUNT(*) INTO v_conflict_count
FROM bookings b
WHERE b.stylist_id = v_staff.id
    AND b.status NOT IN ('cancelled', 'no_show')
    AND b.start_time < v_slot_utc + (v_total_duration || ' minutes')::interval
    AND b.end_time > v_slot_utc;
IF v_conflict_count = 0 THEN v_slots := v_slots || json_build_object(
    'staff_id',
    v_staff.id,
    'staff_name',
    v_staff.full_name,
    'time',
    to_char(v_slot_start, 'HH12:MI AM'),
    'time_end',
    to_char(
        (
            v_slot_start + (v_total_duration || ' minutes')::interval
        )::time,
        'HH12:MI AM'
    ),
    'start_at',
    to_char(v_slot_utc, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'end_at',
    to_char(
        v_slot_utc + (v_total_duration || ' minutes')::interval,
        'YYYY-MM-DD"T"HH24:MI:SS"Z"'
    ),
    'display_start',
    to_char(v_slot_start, 'HH12:MI AM'),
    'display_end',
    to_char(
        (
            v_slot_start + (v_total_duration || ' minutes')::interval
        )::time,
        'HH12:MI AM'
    ),
    'total_minutes',
    v_total_duration
);
END IF;
v_slot_start := v_slot_start + (p_slot_interval || ' minutes')::interval;
END LOOP;
END LOOP;
END LOOP;
RETURN json_build_object(
    'ok',
    true,
    'date',
    p_date,
    'salon_timezone',
    v_salon_tz,
    'is_closed',
    false,
    'total_duration_min',
    v_total_duration,
    'slots_count',
    array_length(v_slots, 1),
    'slots',
    to_json(v_slots)
);
END;
$$;
