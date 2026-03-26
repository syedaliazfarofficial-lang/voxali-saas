-- Voxali DB Migration: Add Staff Payroll & Tips Columns
-- Run this in your Supabase SQL Editor

-- 1. Add commission and base_salary to staff table
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10, 2) DEFAULT 0;

-- 2. Add tip_amount to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10, 2) DEFAULT 0;

-- Optional: If you want to populate existing staff with a default 40% commission
UPDATE staff SET commission_percent = 40 WHERE commission_percent = 0;
