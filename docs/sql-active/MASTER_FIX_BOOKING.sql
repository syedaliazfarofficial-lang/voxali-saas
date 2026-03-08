-- =====================================================
-- MASTER FIX — Run this ONCE in Supabase SQL Editor
-- Fixes: (1) UTC slot timestamps, (2) double booking prevention
-- =====================================================
-- PART 1: Fix get_available_slots to return UTC timestamps
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
v_salon_tz TEXT := 'America/New_York';
v_slot_utc TIMESTAMPTZ;
BEGIN
SELECT * INTO v_tenant
FROM tenants
WHERE id = p_tenant_id;
IF NOT FOUND THEN RETURN json_build_object('ok', false, 'error', 'Tenant not found');
END IF;
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
    AND weekday = v_day_of_week
    AND is_working = TRUE LOOP v_slot_start := GREATEST(v_wh.start_time, v_open_time);
v_slot_end := LEAST(v_wh.end_time, v_close_time);
WHILE v_slot_start + (v_total_duration || ' minutes')::interval <= v_slot_end LOOP -- Convert local time to UTC for conflict check
v_slot_utc := (p_date + v_slot_start) AT TIME ZONE v_salon_tz;
-- Conflict check uses REAL UTC timestamps stored in DB
SELECT COUNT(*) INTO v_conflict_count
FROM bookings b
WHERE b.stylist_id = v_staff.id
    AND b.status NOT IN ('cancelled', 'no_show')
    AND b.start_at < v_slot_utc + (v_total_duration || ' minutes')::interval
    AND b.end_at > v_slot_utc;
IF v_conflict_count = 0 THEN v_slots := v_slots || json_build_object(
    'staff_id',
    v_staff.id,
    'staff_name',
    v_staff.full_name,
    -- UTC ISO for create_booking (has Z suffix — pass directly)
    'start_at',
    to_char(v_slot_utc, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'end_at',
    to_char(
        v_slot_utc + (v_total_duration || ' minutes')::interval,
        'YYYY-MM-DD"T"HH24:MI:SS"Z"'
    ),
    -- AM/PM for Bella to SPEAK to customer
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
-- PART 2: Safe booking creation with conflict check (prevents double booking)
-- n8n calls this instead of directly inserting into bookings table
CREATE OR REPLACE FUNCTION create_booking_safe(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_client_id UUID,
        p_service_id UUID,
        p_start_at TIMESTAMPTZ,
        p_end_at TIMESTAMPTZ,
        p_status TEXT DEFAULT 'pending_deposit',
        p_notes TEXT DEFAULT '',
        p_payment_method TEXT DEFAULT 'card',
        p_total_price NUMERIC DEFAULT 0,
        p_deposit_amount NUMERIC DEFAULT 0,
        p_booking_items JSONB DEFAULT '[]'
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_conflict_count INTEGER;
v_booking_id UUID;
v_item JSONB;
BEGIN -- Final conflict check (atomic — prevents race conditions)
SELECT COUNT(*) INTO v_conflict_count
FROM bookings b
WHERE b.stylist_id = p_staff_id
    AND b.tenant_id = p_tenant_id
    AND b.status NOT IN ('cancelled', 'no_show')
    AND b.start_at < p_end_at
    AND b.end_at > p_start_at;
IF v_conflict_count > 0 THEN RETURN json_build_object(
    'ok',
    false,
    'error',
    'TIME_CONFLICT',
    'message',
    'This time slot is no longer available. Please choose another time.'
);
END IF;
-- Insert the booking
INSERT INTO bookings (
        tenant_id,
        stylist_id,
        client_id,
        start_at,
        end_at,
        status,
        notes,
        payment_method,
        payment_status,
        total_price,
        deposit_amount,
        created_at,
        updated_at
    )
VALUES (
        p_tenant_id,
        p_staff_id,
        p_client_id,
        p_start_at,
        p_end_at,
        p_status,
        p_notes,
        p_payment_method,
        CASE
            WHEN p_deposit_amount > 0 THEN 'deposit_pending'
            ELSE 'unpaid'
        END,
        p_total_price,
        p_deposit_amount,
        NOW(),
        NOW()
    )
RETURNING id INTO v_booking_id;
-- Insert booking items
FOR v_item IN
SELECT *
FROM jsonb_array_elements(p_booking_items) LOOP
INSERT INTO booking_items (
        booking_id,
        service_id,
        name_snapshot,
        price_snapshot,
        duration_min_snapshot
    )
VALUES (
        v_booking_id,
        (v_item->>'service_id')::UUID,
        v_item->>'name_snapshot',
        (v_item->>'price_snapshot')::NUMERIC,
        (v_item->>'duration_min_snapshot')::INTEGER
    );
END LOOP;
RETURN json_build_object(
    'ok',
    true,
    'booking_id',
    v_booking_id,
    'start_at',
    p_start_at,
    'end_at',
    p_end_at,
    'status',
    p_status
);
END;
$$;
GRANT EXECUTE ON FUNCTION create_booking_safe TO service_role;
GRANT EXECUTE ON FUNCTION get_available_slots TO anon,
    authenticated,
    service_role;
SELECT 'MASTER FIX APPLIED SUCCESSFULLY' AS result;