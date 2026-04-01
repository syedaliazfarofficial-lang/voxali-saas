-- Migration: Day 2 - Add Gift Cards
CREATE TABLE IF NOT EXISTS gift_cards (
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
DROP POLICY IF EXISTS "Tenants can manage their own gift cards" ON gift_cards;
CREATE POLICY "Tenants can manage their own gift cards" ON gift_cards
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Add trigger function if missing
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS set_gift_cards_updated_at ON gift_cards;
CREATE TRIGGER set_gift_cards_updated_at
    BEFORE UPDATE ON gift_cards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();
