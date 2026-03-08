-- Add Provisioning Columns to tenants table
-- Date: March 9, 2026
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'pro', 'elite')),
    ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS twilio_number TEXT,
    ADD COLUMN IF NOT EXISTS twilio_sid TEXT,
    ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT;
-- Drop and recreate the rpc_create_tenant_and_owner function to include plan_tier if we want to default it
-- (Optional, for now it will use default 'basic' automatically)
-- Let's also verify that we have a subscription table or not
-- User suggested we could have a subscriptions table, but plan_tier in tenants is enough for now.