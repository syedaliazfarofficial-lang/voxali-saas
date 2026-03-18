-- 1. Create coin_transactions table
CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. Add Provisioning Columns to tenants table (In case they are missing)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'basic',
    ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS twilio_number TEXT,
    ADD COLUMN IF NOT EXISTS twilio_sid TEXT,
    ADD COLUMN IF NOT EXISTS vapi_assistant_id TEXT,
    ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT,
    ADD COLUMN IF NOT EXISTS coin_balance INTEGER DEFAULT 0;
-- 3. Enable RLS on coin_transactions
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
-- Drop policy if it exists to avoid errors on re-run
DROP POLICY IF EXISTS "Tenants can view their own coin transactions" ON coin_transactions;
CREATE POLICY "Tenants can view their own coin transactions" ON coin_transactions FOR
SELECT USING (tenant_id = auth.uid());
-- 4. Initial coin balances for existing tenants
UPDATE tenants
SET coin_balance = CASE
        WHEN plan_tier = 'starter' THEN 6000
        WHEN plan_tier = 'growth' THEN 16000
        WHEN plan_tier = 'enterprise' THEN 45000
        ELSE 0
    END
WHERE coin_balance = 0;