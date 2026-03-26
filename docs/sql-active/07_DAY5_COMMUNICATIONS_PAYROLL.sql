-- =========================================================================
-- VOXALI SALON ERP - DAY 5 MIGRATION: COMMUNICATIONS & PAYROLL RUNS
-- =========================================================================

-- 1. COMMUNICATIONS TABLE (Unified Inbox for SMS, Email, WhatsApp)
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    client_id UUID REFERENCES clients(id),
    booking_id UUID REFERENCES bookings(id),
    type TEXT NOT NULL CHECK (type IN ('sms', 'email', 'whatsapp')),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'received')),
    content TEXT NOT NULL,
    metadata JSONB, -- For storing message IDs from Twilio/SendGrid
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for communications
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON communications FOR ALL USING (tenant_id = get_my_tenant_id());


-- 2. PAYROLL RUNS TABLE (For locking in Commission & Salary Periods)
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    staff_id UUID REFERENCES staff(id) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_salary_allocated DECIMAL(10, 2) DEFAULT 0,
    total_commission DECIMAL(10, 2) DEFAULT 0,
    total_tips DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0, -- e.g. Staff Advances subtracted here
    net_payout DECIMAL(10, 2) GENERATED ALWAYS AS (base_salary_allocated + total_commission + total_tips - deductions) STORED,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for payroll_runs
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON payroll_runs FOR ALL USING (tenant_id = get_my_tenant_id());

-- Optional: Create an index for faster queries on communications
CREATE INDEX IF NOT EXISTS idx_communications_client_id ON communications(client_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_staff_id ON payroll_runs(staff_id);
