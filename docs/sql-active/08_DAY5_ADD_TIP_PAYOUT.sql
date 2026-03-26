-- ==============================================================================
-- Migration: Add 'tip_payout' to staff_payments payment_type check constraint
-- ==============================================================================

-- 1. Drop the existing check constraint
ALTER TABLE staff_payments DROP CONSTRAINT IF EXISTS staff_payments_payment_type_check;

-- 2. Add the updated check constraint including 'tip_payout'
ALTER TABLE staff_payments ADD CONSTRAINT staff_payments_payment_type_check 
CHECK (payment_type IN ('advance', 'salary_clearance', 'commission_payout', 'tip_payout'));
