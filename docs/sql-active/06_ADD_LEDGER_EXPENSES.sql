-- Migration 06: Add Ledger & Expenses Tables
-- Run this in Supabase SQL editor

-- 1. Create Staff Payments (Ledger) Table
CREATE TABLE IF NOT EXISTS staff_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    staff_id UUID REFERENCES staff(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('advance', 'salary_clearance', 'commission_payout')),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('supplies', 'machinery', 'rent', 'utilities', 'marketing', 'other')),
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Apply Row Level Security (RLS)
ALTER TABLE staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies using existing get_my_tenant_id() helper
CREATE POLICY "Tenant isolation staff_payments" ON staff_payments 
FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY "Tenant isolation expenses" ON expenses 
FOR ALL USING (tenant_id = get_my_tenant_id());

-- 5. Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_staff_payments_tenant ON staff_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_payments_staff ON staff_payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(tenant_id, expense_date);

-- Reload PostgREST schema cache so API sees the new tables
NOTIFY pgrst, 'reload schema';
