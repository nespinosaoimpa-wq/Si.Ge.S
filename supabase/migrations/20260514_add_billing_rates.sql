-- Migration to add dynamic billing and pay rates

-- Add hourly_billing_rate to objectives (default 3500)
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS hourly_billing_rate numeric DEFAULT 3500;

-- Add hourly_pay_rate to resources (default 3500)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS hourly_pay_rate numeric DEFAULT 3500;
