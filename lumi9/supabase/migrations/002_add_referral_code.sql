-- Add referral_code column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
