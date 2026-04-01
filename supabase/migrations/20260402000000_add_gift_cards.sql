-- Migration: Day 2 - Add Gift Cards
CREATE TABLE gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    initial_value NUMERIC(10, 2) NOT NULL CHECK (initial_value > 0),
    current_balance NUMERIC(10, 2) NOT NULL CHECK (current_balance >= 0),
    purchaser_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'voided', 'expired')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code) -- Code must be unique per tenant
);

-- Enable RLS
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

-- Policies for gift_cards
CREATE POLICY "Tenants can manage their own gift cards" ON gift_cards
    FOR ALL USING (tenant_id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER set_gift_cards_updated_at
    BEFORE UPDATE ON gift_cards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();
