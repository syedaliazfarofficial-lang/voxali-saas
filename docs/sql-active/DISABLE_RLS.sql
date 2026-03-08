-- ============================================================
-- DISABLE RLS ON ALL TABLES — Fixes "Database error querying schema"
-- Run in Supabase SQL Editor
-- ============================================================
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_working_hours DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_timeoff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_hours DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings DISABLE ROW LEVEL SECURITY;
NOTIFY pgrst,
'reload schema';
SELECT '✅ ALL RLS DISABLED — login should work now!' as status;