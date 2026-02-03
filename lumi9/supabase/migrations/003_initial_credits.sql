-- Migration: Add initial credits to demo tenant
-- Run this in Supabase SQL Editor

-- Give demo tenant 100 credits to test with
INSERT INTO credit_transactions (tenant_id, amount, balance_after, type, description)
SELECT 
  id,
  100,
  100,
  'bonus',
  'Initial test credits'
FROM tenants 
WHERE slug = 'demo'
ON CONFLICT DO NOTHING;
