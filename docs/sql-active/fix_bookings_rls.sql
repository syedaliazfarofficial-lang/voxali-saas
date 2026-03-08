-- Fix RLS policy for bookings to allow service_role inserts
-- The current policy 'Tenant isolation' only checks get_my_tenant_id(), which fails for the n8n service key.
DROP POLICY IF EXISTS "Tenant isolation" ON public.bookings;
CREATE POLICY "Tenant isolation" ON public.bookings FOR ALL USING (
    tenant_id = get_my_tenant_id()
    OR (auth.jwt()->>'role') = 'service_role'
    OR auth.role() = 'service_role'
) WITH CHECK (
    tenant_id = get_my_tenant_id()
    OR (auth.jwt()->>'role') = 'service_role'
    OR auth.role() = 'service_role'
);
SELECT '✅ Bookings RLS policy updated to allow service_role' as result;