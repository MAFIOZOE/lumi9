-- Migration: Link users table to Supabase Auth
-- Run this in Supabase SQL Editor

-- 1. Add auth_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- 2. Create function to auto-create user on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get the demo tenant (fallback for users without specific tenant)
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
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
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

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
