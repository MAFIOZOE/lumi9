-- Add auth_id column to users table
-- Links Supabase Auth users to our users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);

-- Comment for clarity
COMMENT ON COLUMN users.auth_id IS 'References Supabase Auth user ID (auth.users.id)';
