-- =============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- =============================================

-- 1. Add auth_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- 2. Create function to auto-create user on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get the demo tenant
  SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'demo' LIMIT 1;
  
  -- If no demo tenant exists, create one
  IF default_tenant_id IS NULL THEN
    INSERT INTO tenants (slug, name) VALUES ('demo', 'Demo Company')
    RETURNING id INTO default_tenant_id;
  END IF;
  
  -- Create user record linked to auth user
  INSERT INTO users (auth_id, tenant_id, email, name, role)
  VALUES (
    NEW.id,
    default_tenant_id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    'member'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Give demo tenant 100 credits to test with
INSERT INTO credit_transactions (tenant_id, amount, balance_after, type, description)
SELECT 
  id,
  100,
  100,
  'bonus',
  'Initial test credits'
FROM tenants 
WHERE slug = 'demo'
AND NOT EXISTS (
  SELECT 1 FROM credit_transactions WHERE tenant_id = tenants.id
);

-- 5. Verify it worked
SELECT 'Demo tenant credits:' as info, 
  (SELECT balance_after FROM credit_transactions 
   WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo')
   ORDER BY created_at DESC LIMIT 1) as balance;
