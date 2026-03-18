CREATE OR REPLACE FUNCTION test_expire_query()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(row_to_json(req)) INTO result
    FROM (
        SELECT
            b.id as booking_id,
            b.created_at,
            t.payment_hold_minutes,
            NOW() as now_time,
            NOW() - make_interval(mins => COALESCE(t.payment_hold_minutes, 30)) as threshold_time,
            (b.created_at < NOW() - make_interval(mins => COALESCE(t.payment_hold_minutes, 30))) as should_expire
        FROM bookings b
        JOIN clients c ON b.client_id = c.id
        JOIN services s ON b.service_id = s.id
        LEFT JOIN staff st ON b.stylist_id = st.id    
        JOIN tenants t ON b.tenant_id = t.id
        WHERE b.status = 'pending_deposit'
    ) req;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
