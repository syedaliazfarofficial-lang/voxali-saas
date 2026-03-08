-- =============================================
-- VOXALI: Add Salon-Specific Columns to Tenants
-- Run in Supabase SQL Editor
-- =============================================
-- New columns for multi-salon support
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS salon_email TEXT;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS salon_website TEXT;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS salon_phone_owner TEXT;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS google_review_url TEXT;
-- Clear per-tenant Twilio SID/Token (now global via env vars)
-- Keep twilio_phone_number per salon
UPDATE tenants
SET twilio_account_sid = NULL,
    twilio_auth_token = NULL;
-- Verify
SELECT id,
    name,
    salon_name,
    twilio_phone_number,
    salon_email,
    salon_website,
    salon_phone_owner,
    google_review_url
FROM tenants;