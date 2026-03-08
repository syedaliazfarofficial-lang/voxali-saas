-- ==========================================
-- VOXALI SAAS - SUBSCRIPTION & USAGE DB UPDATE
-- Run this in your Supabase SQL Editor
-- ==========================================
-- 1. Add subscription details to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter',
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT,
    ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
-- 2. Add Usage Tracking Columns
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS ai_minutes_used INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sms_used INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS emails_used INTEGER DEFAULT 0;
-- 3. Add Plan Limit Columns
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS plan_ai_minutes_limit INTEGER DEFAULT 150,
    ADD COLUMN IF NOT EXISTS plan_sms_limit INTEGER DEFAULT 200,
    ADD COLUMN IF NOT EXISTS plan_email_limit INTEGER DEFAULT 500;
-- 4. Secure the new columns via RLS (Tenants can view their own, only service_role can update)
-- Existing RLS on tenants should cover select, but you may want to ensure updates to subscription details are restricted:
-- GRANT UPDATE (name, timezone, etc) TO authenticated; 
-- (Leave subscription columns out of authenticated update grants)