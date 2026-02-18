-- =============================================
-- FIX: Business Hours Editing
-- Run this in Supabase SQL Editor if
-- business hours editing doesn't work
-- =============================================
-- 1. Ensure the table exists
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
DROP POLICY IF EXISTS "anon_bh_all" ON business_hours;
CREATE POLICY "anon_bh_all" ON business_hours FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON business_hours TO anon,
    authenticated;
-- 2. Seed default hours if none exist
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
    ) d ON CONFLICT (tenant_id, day_of_week) DO NOTHING;
-- 3. Create/replace the RPC
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
GRANT EXECUTE ON FUNCTION rpc_update_hours(UUID, INTEGER, TIME, TIME, BOOLEAN) TO anon,
    authenticated;
SELECT '✅ Business hours fix complete!' AS status;