-- =============================================
-- DASHBOARD FULL FEATURES MIGRATION
-- Run in Supabase SQL Editor
-- =============================================
-- 1. Business Hours table
CREATE TABLE IF NOT EXISTS business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (
        day_of_week BETWEEN 0 AND 6
    ),
    open_time TIME NOT NULL DEFAULT '09:00',
    close_time TIME NOT NULL DEFAULT '21:00',
    is_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, day_of_week)
);
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_bh_all" ON business_hours FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON business_hours TO anon,
    authenticated;
-- 2. Add commission_rate to staff if missing
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) DEFAULT 15.00;
-- 3. Seed default business hours (Mon-Sat 9am-9pm, Sun closed)
INSERT INTO business_hours (
        tenant_id,
        day_of_week,
        open_time,
        close_time,
        is_open
    )
SELECT t.id,
    d.dow,
    CASE
        WHEN d.dow = 0 THEN '00:00'::TIME
        ELSE '09:00'::TIME
    END,
    CASE
        WHEN d.dow = 0 THEN '00:00'::TIME
        ELSE '21:00'::TIME
    END,
    d.dow != 0
FROM tenants t
    CROSS JOIN (
        SELECT generate_series(0, 6) AS dow
    ) d
WHERE t.slug = 'luxe-aurea' ON CONFLICT (tenant_id, day_of_week) DO NOTHING;
-- 4. RPC: Add walk-in booking
CREATE OR REPLACE FUNCTION rpc_add_walkin(
        p_tenant_id UUID,
        p_client_name TEXT,
        p_client_phone TEXT,
        p_service_id UUID,
        p_stylist_id UUID,
        p_start_time TIMESTAMPTZ DEFAULT NOW()
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_client_id UUID;
v_booking_id UUID;
v_svc RECORD;
BEGIN -- Get service details
SELECT id,
    name,
    duration,
    price INTO v_svc
FROM services
WHERE id = p_service_id
    AND tenant_id = p_tenant_id;
IF v_svc.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Service not found');
END IF;
-- Find or create client
SELECT id INTO v_client_id
FROM clients
WHERE tenant_id = p_tenant_id
    AND phone = p_client_phone
LIMIT 1;
IF v_client_id IS NULL THEN
INSERT INTO clients (tenant_id, name, phone)
VALUES (p_tenant_id, p_client_name, p_client_phone)
RETURNING id INTO v_client_id;
END IF;
-- Create booking
INSERT INTO bookings (
        tenant_id,
        client_id,
        stylist_id,
        service_id,
        start_at,
        end_at,
        status,
        total_price,
        source
    )
VALUES (
        p_tenant_id,
        v_client_id,
        p_stylist_id,
        p_service_id,
        p_start_time,
        p_start_time + (v_svc.duration || ' minutes')::INTERVAL,
        'confirmed',
        v_svc.price,
        'walk_in'
    )
RETURNING id INTO v_booking_id;
RETURN json_build_object(
    'success',
    true,
    'booking_id',
    v_booking_id,
    'client_id',
    v_client_id
);
END;
$$;
-- 5. RPC: Add staff
CREATE OR REPLACE FUNCTION rpc_add_staff(
        p_tenant_id UUID,
        p_name TEXT,
        p_email TEXT DEFAULT NULL,
        p_phone TEXT DEFAULT NULL,
        p_role TEXT DEFAULT 'stylist',
        p_commission DECIMAL DEFAULT 15.00
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
        is_active
    )
VALUES (
        p_tenant_id,
        p_name,
        p_email,
        p_phone,
        p_role,
        p_commission,
        true
    )
RETURNING id INTO v_id;
RETURN json_build_object('success', true, 'staff_id', v_id);
END;
$$;
-- 6. RPC: Deactivate staff
CREATE OR REPLACE FUNCTION rpc_deactivate_staff(p_tenant_id UUID, p_staff_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
UPDATE staff
SET is_active = false,
    updated_at = NOW()
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true);
END;
$$;
-- 7. RPC: Reactivate staff
CREATE OR REPLACE FUNCTION rpc_reactivate_staff(p_tenant_id UUID, p_staff_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
UPDATE staff
SET is_active = true,
    updated_at = NOW()
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true);
END;
$$;
-- 8. RPC: Update staff commission
CREATE OR REPLACE FUNCTION rpc_update_commission(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_rate DECIMAL
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
UPDATE staff
SET commission_rate = p_rate,
    updated_at = NOW()
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true);
END;
$$;
-- 9. RPC: Add/update service
CREATE OR REPLACE FUNCTION rpc_upsert_service(
        p_tenant_id UUID,
        p_name TEXT,
        p_duration INTEGER,
        p_price DECIMAL,
        p_category TEXT DEFAULT 'Hair',
        p_service_id UUID DEFAULT NULL
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN IF p_service_id IS NOT NULL THEN
UPDATE services
SET name = p_name,
    duration = p_duration,
    price = p_price,
    category = p_category,
    updated_at = NOW()
WHERE id = p_service_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true, 'service_id', p_service_id);
ELSE
INSERT INTO services (tenant_id, name, duration, price, category)
VALUES (
        p_tenant_id,
        p_name,
        p_duration,
        p_price,
        p_category
    )
RETURNING id INTO v_id;
RETURN json_build_object('success', true, 'service_id', v_id);
END IF;
END;
$$;
-- 10. RPC: Update business hours
CREATE OR REPLACE FUNCTION rpc_update_hours(
        p_tenant_id UUID,
        p_day INTEGER,
        p_open TIME,
        p_close TIME,
        p_is_open BOOLEAN
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO business_hours (
        tenant_id,
        day_of_week,
        open_time,
        close_time,
        is_open
    )
VALUES (p_tenant_id, p_day, p_open, p_close, p_is_open) ON CONFLICT (tenant_id, day_of_week) DO
UPDATE
SET open_time = p_open,
    close_time = p_close,
    is_open = p_is_open;
RETURN json_build_object('success', true);
END;
$$;
-- Grant everything
GRANT EXECUTE ON FUNCTION rpc_add_walkin(UUID, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_add_staff(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_deactivate_staff(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_reactivate_staff(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_update_commission(UUID, UUID, DECIMAL) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_upsert_service(UUID, TEXT, INTEGER, DECIMAL, TEXT, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_update_hours(UUID, INTEGER, TIME, TIME, BOOLEAN) TO anon,
    authenticated;
SELECT '✅ All features migration complete!' AS status;