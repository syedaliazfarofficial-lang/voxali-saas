-- =============================================
-- FIX: get_active_booking RPC function
-- Error: "column s.name does not exist"
-- Staff table uses full_name, not name
-- Run this in Supabase SQL Editor
-- =============================================
CREATE OR REPLACE FUNCTION get_active_booking(
        p_tenant_id UUID,
        p_client_name TEXT DEFAULT '',
        p_client_phone TEXT DEFAULT ''
    ) RETURNS TABLE (
        booking_id UUID,
        start_time TIMESTAMPTZ,
        end_time TIMESTAMPTZ,
        status TEXT,
        total_price NUMERIC,
        client_id UUID,
        client_name TEXT,
        client_phone TEXT,
        client_email TEXT,
        service_name TEXT,
        staff_name TEXT,
        stylist_id UUID,
        service_id UUID
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT b.id AS booking_id,
    b.start_time,
    b.end_time,
    b.status,
    b.total_price,
    b.client_id,
    c.name AS client_name,
    c.phone AS client_phone,
    c.email AS client_email,
    sv.name AS service_name,
    st.full_name AS staff_name,
    b.stylist_id,
    b.service_id
FROM bookings b
    JOIN clients c ON c.id = b.client_id
    LEFT JOIN services sv ON sv.id = b.service_id
    LEFT JOIN staff st ON st.id = b.stylist_id
WHERE b.tenant_id = p_tenant_id
    AND b.status NOT IN ('cancelled', 'completed', 'no_show')
    AND (
        (
            p_client_name != ''
            AND LOWER(c.name) LIKE '%' || LOWER(p_client_name) || '%'
        )
        OR (
            p_client_phone != ''
            AND c.phone = p_client_phone
        )
    )
ORDER BY b.start_time DESC
LIMIT 1;
END;
$$;