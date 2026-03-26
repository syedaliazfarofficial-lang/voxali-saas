-- ==========================================================
-- VOXALI POS SYSTEM MIGRATION SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX CHECKOUT ERRORS
-- ==========================================================

-- 1. Add missing columns to bookings (required for POS tracking)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10, 2) DEFAULT 0;

-- 2. Ensure Payments table exists
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create dummy service for Retail / Custom Product checkouts
-- (This satisfies the service_id foreign key constraint when checking out without services)
INSERT INTO services (id, tenant_id, name, description, duration, price, is_active)
SELECT '00000000-0000-0000-0000-000000000000', id, 'Custom Charge / Retail', 'Used for POS checkouts to satisfy database constraints', 0, 0, false
FROM tenants
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 4. Enable RLS on Payments and allow access
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Allow all access to authenticated users on payments'
    ) THEN
        CREATE POLICY "Allow all access to authenticated users on payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';

SELECT '✅ POS DATABASE FIX APPLIED SUCCESSFULLY!' as status;
