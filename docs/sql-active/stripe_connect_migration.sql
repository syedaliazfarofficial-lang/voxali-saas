-- Stripe Connect + Refund Policy columns for tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC DEFAULT 3;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS cancellation_window_hours INTEGER DEFAULT 24;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS late_cancel_refund_percent INTEGER DEFAULT 50;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS no_show_refund_percent INTEGER DEFAULT 0;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS auto_refund_enabled BOOLEAN DEFAULT true;
-- Platform config table for SuperAdmin
CREATE TABLE IF NOT EXISTS platform_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS for platform_config (service_role only)
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
-- Insert default keys
INSERT INTO platform_config (key, value)
VALUES (
        'stripe_secret_key',
        'sk_test_REPLACE_WITH_YOUR_KEY'
    ),
    (
        'stripe_publishable_key',
        'pk_test_REPLACE_WITH_YOUR_KEY'
    ),
    ('platform_fee_percent', '3') ON CONFLICT (key) DO
UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();