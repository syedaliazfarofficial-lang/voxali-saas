-- Migration: Enhanced SaaS Billing & Enforcement Schema
-- Built on top of 2026-04-02 base billing logic

-- 1. Extend tenants table for proper SaaS metrics
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_minutes_included INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sms_included INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_minutes_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sms_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_minutes_topup_balance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sms_topup_balance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_access_paused BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_sending_paused BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fallback_number VARCHAR(255);

-- 2. Create the granular usage tracking tables
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    call_id VARCHAR(255),
    minutes_used INTEGER NOT NULL,
    rounded_billable_minutes INTEGER,
    event_type VARCHAR(50) NOT NULL,
    provider_call_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    idempotency_key VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS sms_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    message_id VARCHAR(255),
    sms_count INTEGER NOT NULL DEFAULT 1,
    event_type VARCHAR(50),
    provider_message_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    idempotency_key VARCHAR(255) UNIQUE
);

CREATE TABLE IF NOT EXISTS topup_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
