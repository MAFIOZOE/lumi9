-- Payout requests table
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  commission_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  method VARCHAR(50) NOT NULL, -- stripe_connect, paypal, bank_transfer
  payout_details JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  transaction_id VARCHAR(255), -- External transaction reference
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add payout settings to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS payout_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payout_details JSONB DEFAULT '{}'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payout_requests_user ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
