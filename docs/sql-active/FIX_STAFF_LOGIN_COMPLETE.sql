-- ============================================================
-- VOXALI SAAS - COMPLETE SQL EXPORT (Feb 26, 2026)
-- All staff login, deactivation, unban & delete functions
-- ============================================================
-- ============================================================
-- SECTION 1: STAFF LOGIN CREATION (via Dashboard)
-- ============================================================
DROP FUNCTION IF EXISTS rpc_create_staff_login(UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION rpc_create_staff_login(
        p_tenant_id UUID,
        p_staff_id UUID,
        p_email TEXT,
        p_password TEXT
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_user_id UUID;
v_staff RECORD;
v_existing_user_id UUID;
BEGIN
SELECT id,
    full_name INTO v_staff
FROM staff
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
IF v_staff.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Staff not found');
END IF;
SELECT id INTO v_existing_user_id
FROM auth.users
WHERE email = p_email;
IF v_existing_user_id IS NOT NULL THEN
INSERT INTO profiles (
        id,
        user_id,
        tenant_id,
        email,
        full_name,
        role,
        staff_id,
        can_login
    )
VALUES (
        v_existing_user_id,
        v_existing_user_id,
        p_tenant_id,
        p_email,
        v_staff.full_name,
        'staff',
        p_staff_id,
        true
    ) ON CONFLICT (id) DO
UPDATE
SET user_id = v_existing_user_id,
    tenant_id = p_tenant_id,
    full_name = v_staff.full_name,
    email = p_email,
    role = 'staff',
    staff_id = p_staff_id,
    can_login = true;
UPDATE staff
SET email = p_email
WHERE id = p_staff_id
    AND (
        email IS NULL
        OR email = ''
    );
RETURN jsonb_build_object(
    'success',
    true,
    'user_id',
    v_existing_user_id,
    'note',
    'User already existed, profile updated'
);
END IF;
v_user_id := gen_random_uuid();
INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        phone
    )
VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY ['email']),
        jsonb_build_object('full_name', v_staff.full_name, 'role', 'staff'),
        'authenticated',
        'authenticated',
        NULL
    );
INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::TEXT, 'email', p_email),
        'email',
        v_user_id::TEXT,
        NOW(),
        NOW(),
        NOW()
    );
INSERT INTO profiles (
        id,
        user_id,
        tenant_id,
        email,
        full_name,
        role,
        staff_id,
        can_login
    )
VALUES (
        v_user_id,
        v_user_id,
        p_tenant_id,
        p_email,
        v_staff.full_name,
        'staff',
        p_staff_id,
        true
    ) ON CONFLICT (id) DO
UPDATE
SET user_id = v_user_id,
    tenant_id = p_tenant_id,
    full_name = v_staff.full_name,
    email = p_email,
    role = 'staff',
    staff_id = p_staff_id,
    can_login = true;
UPDATE staff
SET email = p_email
WHERE id = p_staff_id
    AND (
        email IS NULL
        OR email = ''
    );
RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_create_staff_login(UUID, UUID, TEXT, TEXT) TO anon,
    authenticated;
-- ============================================================
-- SECTION 2: UNBAN USER (for Reactivation)
-- ============================================================
CREATE OR REPLACE FUNCTION rpc_unban_user(p_user_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
UPDATE auth.users
SET banned_until = NULL
WHERE id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_unban_user(UUID) TO anon,
    authenticated;
-- ============================================================
-- SECTION 3: CHANGE STAFF PASSWORD
-- ============================================================
CREATE OR REPLACE FUNCTION rpc_change_staff_password(
        p_staff_email TEXT,
        p_new_password TEXT
    ) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
UPDATE auth.users
SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
WHERE email = p_staff_email;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_change_staff_password(TEXT, TEXT) TO anon,
    authenticated;
-- ============================================================
-- SECTION 4: DEACTIVATE / REACTIVATE STAFF
-- ============================================================
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
GRANT EXECUTE ON FUNCTION rpc_deactivate_staff(UUID, UUID) TO anon,
    authenticated;
GRANT EXECUTE ON FUNCTION rpc_reactivate_staff(UUID, UUID) TO anon,
    authenticated;
-- ============================================================
-- SECTION 5: PERMANENT DELETE STAFF
-- ============================================================
CREATE OR REPLACE FUNCTION rpc_delete_staff_permanent(p_tenant_id UUID, p_staff_id UUID) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN -- Delete staff leaves
DELETE FROM staff_leaves
WHERE staff_id = p_staff_id;
-- Unlink bookings
UPDATE bookings
SET staff_id = NULL
WHERE staff_id = p_staff_id
    AND tenant_id = p_tenant_id;
-- Delete staff record
DELETE FROM staff
WHERE id = p_staff_id
    AND tenant_id = p_tenant_id;
RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_delete_staff_permanent(UUID, UUID) TO anon,
    authenticated;
-- ============================================================
-- SECTION 6: ADD STAFF
-- ============================================================
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
GRANT EXECUTE ON FUNCTION rpc_add_staff(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL) TO anon,
    authenticated;
-- ============================================================
-- SECTION 7: STAFF BOARD VIEW (with email & phone)
-- ============================================================
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
GRANT EXECUTE ON FUNCTION rpc_staff_board(UUID) TO anon,
    authenticated;
-- ============================================================
-- SECTION 8: EDIT STAFF
-- ============================================================
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
GRANT EXECUTE ON FUNCTION rpc_edit_staff(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL) TO anon,
    authenticated;
-- ============================================================
-- SECTION 9: USEFUL QUERIES (save as favorites in SQL Editor)
-- ============================================================
-- Query: All Salons Staff Overview
-- SELECT t.name AS salon, s.full_name, s.email, s.phone, s.role, s.commission_rate
-- FROM staff s JOIN tenants t ON s.tenant_id = t.id
-- WHERE t.status != 'deleted' OR t.status IS NULL
-- ORDER BY t.name, s.full_name;
-- Query: Staff for specific tenant (replace UUID)
-- SELECT full_name, email, phone, role, commission_rate, is_active
-- FROM staff WHERE tenant_id = 'YOUR-TENANT-ID-HERE';
-- ============================================================
-- RELOAD SCHEMA
-- ============================================================
NOTIFY pgrst,
'reload schema';
SELECT '✅ COMPLETE SQL EXPORT - All functions up to date (Feb 26, 2026)' AS status;