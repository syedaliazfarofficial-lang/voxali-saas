-- =============================================
-- DASHBOARD FULL FEATURES MIGRATION (Updated Feb 26, 2026)
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
-- 2. Add columns to staff if missing
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) DEFAULT 15.00;
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#D4AF37';
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS is_blocked_today BOOLEAN DEFAULT false;
-- 3. Add can_login to profiles if missing
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS can_login BOOLEAN DEFAULT false;
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS staff_id UUID;
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_id UUID;
-- 4. Walk-in booking RPC
CREATE OR REPLACE FUNCTION rpc_add_walkin(
        p_tenant_id UUID,
        p_client_name TEXT,
        p_client_phone TEXT,
        p_service_id UUID,
        p_staff_id UUID,
        p_start TIMESTAMPTZ
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_booking_id UUID;
v_duration INTEGER;
v_price DECIMAL;
BEGIN
SELECT duration,
    price INTO v_duration,
    v_price
FROM services
WHERE id = p_service_id
    AND tenant_id = p_tenant_id;
INSERT INTO bookings (
        tenant_id,
        client_name,
        client_phone,
        service_id,
        staff_id,
        start_time,
        end_time,
        total_price,
        status,
        booking_type
    )
VALUES (
        p_tenant_id,
        p_client_name,
        p_client_phone,
        p_service_id,
        p_staff_id,
        p_start,
        p_start + (v_duration || ' minutes')::INTERVAL,
        v_price,
        'confirmed',
        'walkin'
    )
RETURNING id INTO v_booking_id;
RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;
-- 5. Staff Board View (with email, phone)
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
        phone TEXT
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
    s.phone
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
    s.phone
ORDER BY s.is_active DESC,
    s.full_name;
END;
$$;
-- 6. Add Staff
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
-- 7. Edit Staff
CREATE OR REPLACE FUNCTION rpc_edit_staff(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_name TEXT,
        p_email TEXT DEFAULT NULL,
        p_phone TEXT DEFAULT NULL,
        p_role TEXT DEFAULT NULL,
        p_commission DECIMAL DEFAULT NULL
    ) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
UPDATE staff
SET full_name = COALESCE(p_name, full_name),
    email = COALESCE(p_email, email),
    phone = COALESCE(p_phone, phone),
    role = COALESCE(p_role, role),
    commission_rate = COALESCE(p_commission, commission_rate),
    updated_at = NOW()
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true);
END;
$$;
-- 8. Deactivate Staff
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
-- 9. Reactivate Staff
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
-- 10. Permanent Delete Staff
CREATE OR REPLACE FUNCTION rpc_delete_staff_permanent(p_tenant_id UUID, p_staff_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
DELETE FROM staff_leaves
WHERE staff_id = p_staff_id;
UPDATE bookings
SET staff_id = NULL
WHERE staff_id = p_staff_id
    AND tenant_id = p_tenant_id;
DELETE FROM staff
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true);
END;
$$;
-- 11. Update Commission
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
-- 12. Upsert Service
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
-- 13. Update Business Hours
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
-- 14. Unban User (for reactivation)
CREATE OR REPLACE FUNCTION rpc_unban_user(p_user_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
UPDATE auth.users
SET banned_until = NULL
WHERE id = p_user_id;
END;
$$;
-- 15. Change Staff Password
CREATE OR REPLACE FUNCTION rpc_change_staff_password(p_staff_email TEXT, p_new_password TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
UPDATE auth.users
SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
WHERE email = p_staff_email;
END;
$$;
-- =============================================
-- GRANT ALL PERMISSIONS
-- =============================================
GRANT EXECUTE ON FUNCTION rpc_add_walkin(UUID, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_add_staff(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_edit_staff(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_staff_board(UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_deactivate_staff(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_reactivate_staff(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_delete_staff_permanent(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_update_commission(UUID, UUID, DECIMAL) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_upsert_service(UUID, TEXT, INTEGER, DECIMAL, TEXT, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_update_hours(UUID, INTEGER, TIME, TIME, BOOLEAN) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_unban_user(UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_change_staff_password(TEXT, TEXT) TO anon,
    authenticated;
NOTIFY pgrst,
'reload schema';
SELECT '✅ All features migration complete! (Updated Feb 26, 2026)' AS status;