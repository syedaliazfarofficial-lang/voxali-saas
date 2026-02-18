-- =============================================
-- LUXE AUREA: Dashboard Backend Integration
-- Run this in Supabase SQL Editor
-- =============================================
-- =============================================
-- 1. NEW TABLES
-- =============================================
-- Marketing Campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    audience TEXT DEFAULT 'all_clients' CHECK (
        audience IN (
            'all_clients',
            'vip_only',
            'inactive',
            'new_this_month'
        )
    ),
    channel TEXT DEFAULT 'sms' CHECK (channel IN ('sms', 'email', 'both')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled')),
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_marketing_all" ON marketing_campaigns FOR ALL USING (true) WITH CHECK (true);
-- AI Agent Config table (stores Bella's system prompt)
CREATE TABLE IF NOT EXISTS ai_agent_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL UNIQUE,
    system_prompt TEXT NOT NULL DEFAULT '',
    announcements TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_ai_config_all" ON ai_agent_config FOR ALL USING (true) WITH CHECK (true);
-- =============================================
-- 2. INSERT DEFAULT BELLA SYSTEM PROMPT
-- =============================================
INSERT INTO ai_agent_config (
        tenant_id,
        system_prompt,
        announcements,
        is_active
    )
SELECT id,
    $PROMPT$You are Bella,
    the AI phone receptionist for Luxe Aurea Salon & Spa.PERSONALITY: - Warm,
    professional,
    and efficient - Speak like a real receptionist — friendly but concise - Use the client 's name naturally in conversation
- Never say "I' m an AI " — you ARE Bella

CAPABILITIES:
1. Book appointments (check_availability → create_booking)
2. Cancel appointments (cancel_booking)
3. Reschedule appointments (cancel old → create new)
4. Answer questions about services and pricing
5. Add clients to the waitlist if fully booked
6. Create payment links for deposits

BOOKING RULES:
- ALWAYS check availability first before booking
- Use the EXACT service IDs and staff IDs returned by tools
- NEVER make up or guess UUIDs
- Default to the earliest available slot unless the client specifies a preference
- If a service requires a deposit, tell the client and offer to send a payment link

HOURS: Monday–Saturday 9:00 AM – 9:00 PM CST, Closed Sundays

SERVICES:
- Haircut ($50, 60 min)
- Hair Color ($120, 180 min)
- Highlights ($95, 120 min)
- Blow Dry ($35, 30 min)
- Deep Conditioning ($45, 45 min)
- Manicure ($25, 30 min)
- Pedicure ($40, 45 min)

ESCALATION:
- If the caller is angry or the request is complex, say: " Let me connect you with our manager Sarah.One moment please."
- If you encounter a tool error, apologize and offer to take a message.$PROMPT$,
'',
true
FROM tenants WHERE slug = 'luxe-aurea'
ON CONFLICT (tenant_id) DO NOTHING;

-- =============================================
-- 3. RPC FUNCTIONS (SECURITY DEFINER — bypasses RLS safely)
-- =============================================

-- 3a. Dashboard Stats: today's bookings, revenue, new clients, calls
CREATE OR REPLACE FUNCTION rpc_dashboard_stats(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bookings_today BIGINT;
    v_revenue_today NUMERIC;
    v_new_clients BIGINT;
    v_calls_today BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_bookings_today
    FROM bookings
    WHERE tenant_id = p_tenant_id
      AND start_time::date = CURRENT_DATE;

    SELECT COALESCE(SUM(total_price), 0) INTO v_revenue_today
    FROM bookings
    WHERE tenant_id = p_tenant_id
      AND start_time::date = CURRENT_DATE
      AND status NOT IN ('cancelled', 'no_show');

    SELECT COUNT(*) INTO v_new_clients
    FROM clients
    WHERE tenant_id = p_tenant_id
      AND created_at::date = CURRENT_DATE;

    SELECT COUNT(*) INTO v_calls_today
    FROM call_logs
    WHERE tenant_id = p_tenant_id
      AND created_at::date = CURRENT_DATE;

    RETURN json_build_object(
        'bookings_today', v_bookings_today,
        'revenue_today', v_revenue_today,
        'new_clients', v_new_clients,
        'calls_today', v_calls_today
    );
END;
$$;

-- 3b. Weekly Revenue: last 7 days aggregated
CREATE OR REPLACE FUNCTION rpc_weekly_revenue(p_tenant_id UUID)
RETURNS TABLE(day TEXT, revenue NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(d.dt, 'Dy') AS day,
        COALESCE(SUM(b.total_price), 0) AS revenue
    FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        '1 day'
    ) AS d(dt)
    LEFT JOIN bookings b
        ON b.tenant_id = p_tenant_id
        AND b.start_time::date = d.dt
        AND b.status NOT IN ('cancelled', 'no_show')
    GROUP BY d.dt
    ORDER BY d.dt;
END;
$$;

-- 3c. Recent Activity: latest 10 bookings
CREATE OR REPLACE FUNCTION rpc_recent_activity(p_tenant_id UUID)
RETURNS TABLE(
    id UUID,
    client_name TEXT,
    service_name TEXT,
    stylist_name TEXT,
    status TEXT,
    start_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        COALESCE(c.name, 'Walk-in') AS client_name,
        COALESCE(s.name, 'Unknown') AS service_name,
        COALESCE(st.full_name, 'Any') AS stylist_name,
        b.status,
        b.start_time,
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

-- 3d. Analytics: daily revenue over N days
CREATE OR REPLACE FUNCTION rpc_analytics_revenue(p_tenant_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(day DATE, revenue NUMERIC, booking_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.dt::date AS day,
        COALESCE(SUM(b.total_price), 0) AS revenue,
        COUNT(b.id) AS booking_count
    FROM generate_series(
        CURRENT_DATE - (p_days - 1) * INTERVAL '1 day',
        CURRENT_DATE,
        '1 day'
    ) AS d(dt)
    LEFT JOIN bookings b
        ON b.tenant_id = p_tenant_id
        AND b.start_time::date = d.dt
        AND b.status NOT IN ('cancelled', 'no_show')
    GROUP BY d.dt
    ORDER BY d.dt;
END;
$$;

-- 3e. Analytics: top services
CREATE OR REPLACE FUNCTION rpc_analytics_services(p_tenant_id UUID)
RETURNS TABLE(service_name TEXT, booking_count BIGINT, total_revenue NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.name AS service_name,
        COUNT(b.id) AS booking_count,
        COALESCE(SUM(b.total_price), 0) AS total_revenue
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    WHERE b.tenant_id = p_tenant_id
      AND b.status NOT IN ('cancelled', 'no_show')
    GROUP BY s.name
    ORDER BY total_revenue DESC;
END;
$$;

-- 3f. Analytics: bookings by status
CREATE OR REPLACE FUNCTION rpc_analytics_statuses(p_tenant_id UUID)
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT b.status, COUNT(*) AS count
    FROM bookings b
    WHERE b.tenant_id = p_tenant_id
    GROUP BY b.status
    ORDER BY count DESC;
END;
$$;

-- 3g. Staff Board: staff + this month stats + blocked-today flag
CREATE OR REPLACE FUNCTION rpc_staff_board(p_tenant_id UUID)
RETURNS TABLE(
    id UUID,
    full_name TEXT,
    role TEXT,
    color TEXT,
    is_active BOOLEAN,
    bookings_count BIGINT,
    revenue NUMERIC,
    is_blocked_today BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.full_name,
        s.role,
        s.color,
        s.is_active,
        COUNT(b.id) AS bookings_count,
        COALESCE(SUM(b.total_price), 0) AS revenue,
        EXISTS(
            SELECT 1 FROM staff_timeoff t
            WHERE t.staff_id = s.id
              AND t.start_datetime::date <= CURRENT_DATE
              AND t.end_datetime::date >= CURRENT_DATE
        ) AS is_blocked_today
    FROM staff s
    LEFT JOIN bookings b
        ON b.stylist_id = s.id
        AND b.start_time >= date_trunc('month', CURRENT_DATE)
        AND b.status NOT IN ('cancelled', 'no_show')
    WHERE s.tenant_id = p_tenant_id
    GROUP BY s.id, s.full_name, s.role, s.color, s.is_active
    ORDER BY revenue DESC;
END;
$$;

-- 3h. Block Staff Today (Sick Day)
CREATE OR REPLACE FUNCTION rpc_block_staff_today(p_tenant_id UUID, p_staff_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing BIGINT;
BEGIN
    -- Check if already blocked today
    SELECT COUNT(*) INTO v_existing
    FROM staff_timeoff
    WHERE staff_id = p_staff_id
      AND start_datetime::date = CURRENT_DATE;

    IF v_existing > 0 THEN
        RETURN json_build_object('success', false, 'error', 'Already blocked today');
    END IF;

    INSERT INTO staff_timeoff (tenant_id, staff_id, start_datetime, end_datetime, reason)
    VALUES (
        p_tenant_id,
        p_staff_id,
        CURRENT_DATE::timestamptz,
        (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')::timestamptz,
        'Sick Day (blocked from dashboard)'
    );

    RETURN json_build_object('success', true);
END;
$$;

-- 3i. Unblock Staff Today
CREATE OR REPLACE FUNCTION rpc_unblock_staff_today(p_tenant_id UUID, p_staff_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM staff_timeoff
    WHERE staff_id = p_staff_id
      AND tenant_id = p_tenant_id
      AND start_datetime::date = CURRENT_DATE;

    RETURN json_build_object('success', true);
END;
$$;

-- 3j. Get Tenant ID by slug (for auto-detection)
CREATE OR REPLACE FUNCTION rpc_get_tenant_id(p_slug TEXT DEFAULT 'luxe-aurea')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
    SELECT id INTO v_id FROM tenants WHERE slug = p_slug LIMIT 1;
    RETURN v_id;
END;
$$;

-- =============================================
-- VERIFY
-- =============================================
SELECT '✅ Migration complete!' AS status;
SELECT COUNT(*) AS marketing_campaigns FROM marketing_campaigns;
SELECT COUNT(*) AS ai_agent_configs FROM ai_agent_config;