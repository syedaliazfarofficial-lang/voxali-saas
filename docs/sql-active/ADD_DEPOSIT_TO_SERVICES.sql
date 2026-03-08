-- =============================================
-- VOXALI: Add Advance Payment / Deposit Fields to Services
-- Run in Supabase SQL Editor
-- =============================================
-- Per-service deposit settings
ALTER TABLE services
ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE;
ALTER TABLE services
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10, 2) DEFAULT 0;
-- Verify
SELECT name,
    price,
    deposit_required,
    deposit_amount,
    category
FROM services
WHERE tenant_id = '527f8f35-72f0-4818-b514-ad7695cd076a'
LIMIT 10;