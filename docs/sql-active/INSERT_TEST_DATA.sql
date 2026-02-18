-- =============================================
-- COMBINED FIX + TEST DATA (Dynamic — auto-detects IDs)
-- Run in Supabase SQL Editor
-- =============================================
-- =============================================
-- PART A: FIX RPC FUNCTIONS (start_at instead of start_time)
-- =============================================
CREATE OR REPLACE FUNCTION rpc_dashboard_stats(p_tenant_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_b BIGINT;
v_r NUMERIC;
v_c BIGINT;
v_cl BIGINT;
BEGIN
SELECT COUNT(*) INTO v_b
FROM bookings
WHERE tenant_id = p_tenant_id
    AND start_at::date = CURRENT_DATE;
SELECT COALESCE(SUM(total_price), 0) INTO v_r
FROM bookings
WHERE tenant_id = p_tenant_id
    AND start_at::date = CURRENT_DATE
    AND status NOT IN ('cancelled', 'no_show');
SELECT COUNT(*) INTO v_c
FROM clients
WHERE tenant_id = p_tenant_id
    AND created_at::date = CURRENT_DATE;
SELECT COUNT(*) INTO v_cl
FROM call_logs
WHERE tenant_id = p_tenant_id
    AND created_at::date = CURRENT_DATE;
RETURN json_build_object(
    'bookings_today',
    v_b,
    'revenue_today',
    v_r,
    'new_clients',
    v_c,
    'calls_today',
    v_cl
);
END;
$$;
CREATE OR REPLACE FUNCTION rpc_weekly_revenue(p_tenant_id UUID) RETURNS TABLE(day TEXT, revenue NUMERIC) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT TO_CHAR(d.dt, 'Dy'),
    COALESCE(SUM(b.total_price), 0)
FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        '1 day'
    ) AS d(dt)
    LEFT JOIN bookings b ON b.tenant_id = p_tenant_id
    AND b.start_at::date = d.dt
    AND b.status NOT IN ('cancelled', 'no_show')
GROUP BY d.dt
ORDER BY d.dt;
END;
$$;
CREATE OR REPLACE FUNCTION rpc_recent_activity(p_tenant_id UUID) RETURNS TABLE(
        id UUID,
        client_name TEXT,
        service_name TEXT,
        stylist_name TEXT,
        status TEXT,
        start_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ
    ) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT b.id,
    COALESCE(c.name, 'Walk-in'),
    COALESCE(s.name, 'Unknown'),
    COALESCE(st.full_name, 'Any'),
    b.status,
    b.start_at,
    b.created_at
FROM bookings b
    LEFT JOIN clients c ON c.id = b.client_id
    LEFT JOIN services s ON s.id = b.service_id
    LEFT JOIN staff st ON st.id = b.stylist_id
WHERE b.tenant_id = p_tenant_id
ORDER BY b.created_at DESC
LIMIT 10;
END;
$$;
CREATE OR REPLACE FUNCTION rpc_analytics_revenue(p_tenant_id UUID, p_days INTEGER DEFAULT 30) RETURNS TABLE(day DATE, revenue NUMERIC, booking_count BIGINT) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN QUERY
SELECT d.dt::date,
    COALESCE(SUM(b.total_price), 0),
    COUNT(b.id)
FROM generate_series(
        CURRENT_DATE - (p_days - 1) * INTERVAL '1 day',
        CURRENT_DATE,
        '1 day'
    ) AS d(dt)
    LEFT JOIN bookings b ON b.tenant_id = p_tenant_id
    AND b.start_at::date = d.dt
    AND b.status NOT IN ('cancelled', 'no_show')
GROUP BY d.dt
ORDER BY d.dt;
END;
$$;
CREATE OR REPLACE FUNCTION rpc_staff_board(p_tenant_id UUID) RETURNS TABLE(
        id UUID,
        full_name TEXT,
        role TEXT,
        color TEXT,
        is_active BOOLEAN,
        bookings_count BIGINT,
        revenue NUMERIC,
        is_blocked_today BOOLEAN
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
    )
FROM staff s
    LEFT JOIN bookings b ON b.stylist_id = s.id
    AND b.start_at >= date_trunc('month', CURRENT_DATE)
    AND b.status NOT IN ('cancelled', 'no_show')
WHERE s.tenant_id = p_tenant_id
GROUP BY s.id,
    s.full_name,
    s.role,
    s.color,
    s.is_active
ORDER BY COALESCE(SUM(b.total_price), 0) DESC;
END;
$$;
-- Re-grant
GRANT EXECUTE ON FUNCTION rpc_dashboard_stats(UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_weekly_revenue(UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_recent_activity(UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_analytics_revenue(UUID, INTEGER) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_analytics_services(UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_analytics_statuses(UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_staff_board(UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_block_staff_today(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_unblock_staff_today(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_tenant_id(TEXT) TO anon,
    authenticated;
SELECT '✅ Part A done: RPCs fixed!' AS status;
-- =============================================
-- PART B: INSERT TEST DATA (Dynamic IDs!)
-- =============================================
DO $$
DECLARE t_id UUID := 'e3cd6ecc-2670-425b-9e80-6874896d32d0';
-- Dynamic staff IDs (looked up from DB)
staff1_id UUID;
staff2_id UUID;
staff3_id UUID;
-- Dynamic service IDs
svc1_id UUID;
svc2_id UUID;
svc3_id UUID;
svc4_id UUID;
-- Client IDs
c1 UUID;
c2 UUID;
c3 UUID;
c4 UUID;
c5 UUID;
c6 UUID;
c7 UUID;
c8 UUID;
-- Booking IDs
b1 UUID;
b2 UUID;
b3 UUID;
b4 UUID;
b5 UUID;
b6 UUID;
b7 UUID;
b8 UUID;
b9 UUID;
BEGIN -- Auto-detect staff (get first 3 active staff)
SELECT id INTO staff1_id
FROM staff
WHERE tenant_id = t_id
    AND is_active = true
ORDER BY created_at
LIMIT 1;
SELECT id INTO staff2_id
FROM staff
WHERE tenant_id = t_id
    AND is_active = true
ORDER BY created_at OFFSET 1
LIMIT 1;
SELECT id INTO staff3_id
FROM staff
WHERE tenant_id = t_id
    AND is_active = true
ORDER BY created_at OFFSET 2
LIMIT 1;
-- Fallback: if less than 3 staff, reuse first
IF staff2_id IS NULL THEN staff2_id := staff1_id;
END IF;
IF staff3_id IS NULL THEN staff3_id := staff1_id;
END IF;
-- Auto-detect services (by name)
SELECT id INTO svc1_id
FROM services
WHERE tenant_id = t_id
    AND is_active = true
    AND name ILIKE '%haircut%'
LIMIT 1;
SELECT id INTO svc2_id
FROM services
WHERE tenant_id = t_id
    AND is_active = true
    AND name ILIKE '%color%'
LIMIT 1;
SELECT id INTO svc3_id
FROM services
WHERE tenant_id = t_id
    AND is_active = true
    AND name ILIKE '%highlight%'
LIMIT 1;
SELECT id INTO svc4_id
FROM services
WHERE tenant_id = t_id
    AND is_active = true
    AND name ILIKE '%manicure%'
LIMIT 1;
-- Fallback: if any service not found, pick first available
IF svc1_id IS NULL THEN
SELECT id INTO svc1_id
FROM services
WHERE tenant_id = t_id
LIMIT 1;
END IF;
IF svc2_id IS NULL THEN svc2_id := svc1_id;
END IF;
IF svc3_id IS NULL THEN svc3_id := svc1_id;
END IF;
IF svc4_id IS NULL THEN svc4_id := svc1_id;
END IF;
-- Verify we have data
IF staff1_id IS NULL THEN RAISE EXCEPTION 'No staff found for tenant %',
t_id;
END IF;
IF svc1_id IS NULL THEN RAISE EXCEPTION 'No services found for tenant %',
t_id;
END IF;
RAISE NOTICE 'Staff: %, %, %',
staff1_id,
staff2_id,
staff3_id;
RAISE NOTICE 'Services: %, %, %, %',
svc1_id,
svc2_id,
svc3_id,
svc4_id;
-- 1. CREATE CLIENTS
INSERT INTO clients (tenant_id, name, phone, email)
VALUES (
        t_id,
        'Emily Johnson',
        '+12145551001',
        'emily.j@example.com'
    )
RETURNING id INTO c1;
INSERT INTO clients (tenant_id, name, phone, email)
VALUES (
        t_id,
        'Jessica Williams',
        '+12145551002',
        'jessica.w@example.com'
    )
RETURNING id INTO c2;
INSERT INTO clients (tenant_id, name, phone, email)
VALUES (
        t_id,
        'Maria Garcia',
        '+12145551003',
        'maria.g@example.com'
    )
RETURNING id INTO c3;
INSERT INTO clients (tenant_id, name, phone, email)
VALUES (
        t_id,
        'Ashley Davis',
        '+12145551004',
        'ashley.d@example.com'
    )
RETURNING id INTO c4;
INSERT INTO clients (tenant_id, name, phone, email)
VALUES (
        t_id,
        'Sophia Martinez',
        '+12145551005',
        'sophia.m@example.com'
    )
RETURNING id INTO c5;
INSERT INTO clients (tenant_id, name, phone, email)
VALUES (
        t_id,
        'Olivia Brown',
        '+12145551006',
        'olivia.b@example.com'
    )
RETURNING id INTO c6;
INSERT INTO clients (tenant_id, name, phone, email)
VALUES (
        t_id,
        'Isabella Wilson',
        '+12145551007',
        'isabella.w@example.com'
    )
RETURNING id INTO c7;
INSERT INTO clients (tenant_id, name, phone, email)
VALUES (
        t_id,
        'Mia Anderson',
        '+12145551008',
        'mia.a@example.com'
    )
RETURNING id INTO c8;
-- 2. TODAY'S BOOKINGS (all statuses)
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c1,
        staff1_id,
        svc1_id,
        (CURRENT_DATE + TIME '10:00')::timestamptz,
        (CURRENT_DATE + TIME '11:00')::timestamptz,
        'confirmed',
        50.00,
        20.00
    )
RETURNING id INTO b1;
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c2,
        staff2_id,
        svc2_id,
        (CURRENT_DATE + TIME '09:00')::timestamptz,
        (CURRENT_DATE + TIME '12:00')::timestamptz,
        'completed',
        120.00,
        40.00
    )
RETURNING id INTO b2;
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c3,
        staff3_id,
        svc4_id,
        (CURRENT_DATE + TIME '14:00')::timestamptz,
        (CURRENT_DATE + TIME '14:30')::timestamptz,
        'pending',
        25.00,
        10.00
    )
RETURNING id INTO b3;
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c4,
        staff1_id,
        svc3_id,
        (CURRENT_DATE + TIME '11:00')::timestamptz,
        (CURRENT_DATE + TIME '13:00')::timestamptz,
        'cancelled',
        95.00,
        30.00
    )
RETURNING id INTO b4;
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c5,
        staff2_id,
        svc3_id,
        (CURRENT_DATE + TIME '15:00')::timestamptz,
        (CURRENT_DATE + TIME '17:00')::timestamptz,
        'pending_deposit',
        95.00,
        30.00
    )
RETURNING id INTO b5;
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c6,
        staff3_id,
        svc1_id,
        (CURRENT_DATE + TIME '09:00')::timestamptz,
        (CURRENT_DATE + TIME '10:00')::timestamptz,
        'no_show',
        50.00,
        20.00
    )
RETURNING id INTO b6;
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c7,
        staff1_id,
        svc2_id,
        (CURRENT_DATE + TIME '13:00')::timestamptz,
        (CURRENT_DATE + TIME '16:00')::timestamptz,
        'checked_in',
        120.00,
        40.00
    )
RETURNING id INTO b7;
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c8,
        staff2_id,
        svc4_id,
        (CURRENT_DATE + TIME '11:00')::timestamptz,
        (CURRENT_DATE + TIME '11:30')::timestamptz,
        'in_progress',
        25.00,
        10.00
    )
RETURNING id INTO b8;
-- 3. PAST WEEK BOOKINGS (revenue chart data)
-- Yesterday: 3 completed
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c1,
        staff1_id,
        svc3_id,
        (CURRENT_DATE - 1 + TIME '10:00')::timestamptz,
        (CURRENT_DATE - 1 + TIME '12:00')::timestamptz,
        'completed',
        95.00,
        30.00
    )
RETURNING id INTO b9;
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c2,
        staff2_id,
        svc1_id,
        (CURRENT_DATE - 1 + TIME '14:00')::timestamptz,
        (CURRENT_DATE - 1 + TIME '15:00')::timestamptz,
        'completed',
        50.00,
        20.00
    );
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c3,
        staff3_id,
        svc2_id,
        (CURRENT_DATE - 1 + TIME '16:00')::timestamptz,
        (CURRENT_DATE - 1 + TIME '19:00')::timestamptz,
        'completed',
        120.00,
        40.00
    );
-- 2 days ago: 2
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c4,
        staff1_id,
        svc1_id,
        (CURRENT_DATE - 2 + TIME '11:00')::timestamptz,
        (CURRENT_DATE - 2 + TIME '12:00')::timestamptz,
        'completed',
        50.00,
        20.00
    );
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c5,
        staff2_id,
        svc3_id,
        (CURRENT_DATE - 2 + TIME '13:00')::timestamptz,
        (CURRENT_DATE - 2 + TIME '15:00')::timestamptz,
        'completed',
        95.00,
        30.00
    );
-- 3 days ago: 4 (busy)
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c6,
        staff3_id,
        svc4_id,
        (CURRENT_DATE - 3 + TIME '09:00')::timestamptz,
        (CURRENT_DATE - 3 + TIME '09:30')::timestamptz,
        'completed',
        25.00,
        10.00
    );
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c7,
        staff1_id,
        svc2_id,
        (CURRENT_DATE - 3 + TIME '10:00')::timestamptz,
        (CURRENT_DATE - 3 + TIME '13:00')::timestamptz,
        'completed',
        120.00,
        40.00
    );
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c8,
        staff2_id,
        svc3_id,
        (CURRENT_DATE - 3 + TIME '14:00')::timestamptz,
        (CURRENT_DATE - 3 + TIME '16:00')::timestamptz,
        'completed',
        95.00,
        30.00
    );
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c1,
        staff3_id,
        svc1_id,
        (CURRENT_DATE - 3 + TIME '15:00')::timestamptz,
        (CURRENT_DATE - 3 + TIME '16:00')::timestamptz,
        'completed',
        50.00,
        20.00
    );
-- 4 days ago: 2
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c2,
        staff1_id,
        svc4_id,
        (CURRENT_DATE - 4 + TIME '10:00')::timestamptz,
        (CURRENT_DATE - 4 + TIME '10:30')::timestamptz,
        'completed',
        25.00,
        10.00
    );
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c3,
        staff2_id,
        svc1_id,
        (CURRENT_DATE - 4 + TIME '14:00')::timestamptz,
        (CURRENT_DATE - 4 + TIME '15:00')::timestamptz,
        'completed',
        50.00,
        20.00
    );
-- 5 days ago: 3
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c4,
        staff3_id,
        svc2_id,
        (CURRENT_DATE - 5 + TIME '09:00')::timestamptz,
        (CURRENT_DATE - 5 + TIME '12:00')::timestamptz,
        'completed',
        120.00,
        40.00
    );
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c5,
        staff1_id,
        svc3_id,
        (CURRENT_DATE - 5 + TIME '11:00')::timestamptz,
        (CURRENT_DATE - 5 + TIME '13:00')::timestamptz,
        'completed',
        95.00,
        30.00
    );
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c6,
        staff2_id,
        svc4_id,
        (CURRENT_DATE - 5 + TIME '15:00')::timestamptz,
        (CURRENT_DATE - 5 + TIME '15:30')::timestamptz,
        'completed',
        25.00,
        10.00
    );
-- 6 days ago: 1 (slow)
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        deposit_amount
    )
VALUES (
        t_id,
        c7,
        staff3_id,
        svc1_id,
        (CURRENT_DATE - 6 + TIME '10:00')::timestamptz,
        (CURRENT_DATE - 6 + TIME '11:00')::timestamptz,
        'completed',
        50.00,
        20.00
    );
-- 4. PAYMENTS
INSERT INTO payments (
        tenant_id,
        booking_id,
        amount,
        status,
        payment_method
    )
VALUES (t_id, b1, 20.00, 'completed', 'stripe'),
    (t_id, b2, 120.00, 'completed', 'stripe'),
    (t_id, b3, 10.00, 'pending', 'stripe'),
    (t_id, b4, 30.00, 'refunded', 'stripe'),
    (t_id, b7, 40.00, 'completed', 'cash'),
    (t_id, b9, 95.00, 'completed', 'stripe');
-- 5. CALL LOGS
INSERT INTO call_logs (
        tenant_id,
        caller_phone,
        call_duration,
        transcript,
        action_taken,
        created_at
    )
VALUES (
        t_id,
        '+12145551001',
        145,
        'Caller: Hi I want a haircut. Bella: Sure! Checking availability...',
        'booking_created',
        NOW() - INTERVAL '3 hours'
    ),
    (
        t_id,
        '+12145551002',
        198,
        'Caller: Can I get hair color? Bella: We have a 9am slot with your stylist...',
        'booking_created',
        NOW() - INTERVAL '4 hours'
    ),
    (
        t_id,
        '+12145551003',
        67,
        'Caller: How much is a manicure? Bella: Our manicure is $25 for 30 minutes...',
        'inquiry_answered',
        NOW() - INTERVAL '2 hours'
    ),
    (
        t_id,
        '+12145551004',
        92,
        'Caller: I need to cancel. Bella: Of course, processing your cancellation...',
        'booking_cancelled',
        NOW() - INTERVAL '1 hour'
    ),
    (
        t_id,
        '+12145551009',
        34,
        'Caller: What are your hours? Bella: Mon-Sat 9am to 9pm...',
        'inquiry_answered',
        NOW() - INTERVAL '30 minutes'
    ),
    (
        t_id,
        '+12145551005',
        210,
        'Caller: I want highlights. Bella: Great! We have a 3pm slot available...',
        'booking_created',
        NOW() - INTERVAL '5 hours'
    );
END $$;
-- =============================================
-- VERIFY
-- =============================================
SELECT 'TODAY' AS period,
    COUNT(*) AS bookings,
    '$' || COALESCE(SUM(total_price), 0) AS revenue
FROM bookings
WHERE tenant_id = 'e3cd6ecc-2670-425b-9e80-6874896d32d0'
    AND start_at::date = CURRENT_DATE
UNION ALL
SELECT 'THIS WEEK',
    COUNT(*),
    '$' || COALESCE(SUM(total_price), 0)
FROM bookings
WHERE tenant_id = 'e3cd6ecc-2670-425b-9e80-6874896d32d0'
    AND start_at >= CURRENT_DATE - 7;
SELECT status,
    COUNT(*) AS cnt
FROM bookings
WHERE tenant_id = 'e3cd6ecc-2670-425b-9e80-6874896d32d0'
GROUP BY status
ORDER BY cnt DESC;
SELECT '✅ Everything done! Refresh your dashboard!' AS status;