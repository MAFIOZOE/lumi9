-- Lumi9 Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TENANTS (Organizations/Companies)
-- ============================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(63) UNIQUE NOT NULL, -- subdomain: {slug}.lumi9.ai
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{
    "brandName": "Lumi9",
    "tagline": "Your AI Workforce",
    "logoUrl": null,
    "faviconUrl": null,
    "primaryColor": "#6366F1",
    "accentColor": "#22D3EE",
    "theme": "dark"
  }'::jsonb,
  
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$')
);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_id UUID UNIQUE, -- References Supabase Auth user ID
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, email)
);

-- ============================================
-- PLANS & SUBSCRIPTIONS
-- ============================================
CREATE TABLE plans (
  id VARCHAR(50) PRIMARY KEY, -- 'starter', 'pro', 'distributor'
  name VARCHAR(100) NOT NULL,
  credits_per_month INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  features JSONB DEFAULT '{}'::jsonb
);

-- Insert default plans
INSERT INTO plans (id, name, credits_per_month, price_cents, features) VALUES
  ('starter', 'Starter', 1000, 1900, '{"channels": ["web"]}'),
  ('pro', 'Pro', 5000, 4900, '{"channels": ["web", "telegram"]}'),
  ('distributor', 'Distributor', 20000, 9900, '{"channels": ["web", "telegram", "whatsapp"], "mlm": true}');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- active, past_due, canceled
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id)
);

-- ============================================
-- CREDITS (Ledger-style)
-- ============================================
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL, -- running balance
  type VARCHAR(50) NOT NULL, -- 'subscription', 'purchase', 'usage', 'refund', 'bonus'
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit balance view (current balance per tenant)
CREATE VIEW tenant_credit_balance AS
SELECT 
  tenant_id,
  COALESCE(
    (SELECT balance_after FROM credit_transactions 
     WHERE tenant_id = t.tenant_id 
     ORDER BY created_at DESC LIMIT 1),
    0
  ) as balance
FROM (SELECT DISTINCT tenant_id FROM credit_transactions) t;

-- ============================================
-- CONVERSATIONS & MESSAGES
-- ============================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  channel VARCHAR(50) DEFAULT 'web', -- web, telegram, whatsapp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER MEMORY (Per-user personalization)
-- ============================================
CREATE TABLE user_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_type VARCHAR(50) NOT NULL, -- 'profile', 'preferences', 'long_term', 'daily_log'
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, memory_type)
);

-- ============================================
-- MLM / REFERRALS (Phase 7)
-- ============================================
CREATE TABLE referral_tree (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  level_1 UUID REFERENCES users(id), -- direct referrer
  level_2 UUID REFERENCES users(id), -- referrer's referrer
  level_3 UUID REFERENCES users(id),
  level_4 UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beneficiary_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_payment_id VARCHAR(255), -- Stripe payment ID
  level INTEGER NOT NULL, -- 1-4
  amount_cents INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- ============================================
-- AGENTS & AGENT RUNS (OpenClaw Integration)
-- ============================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  system_prompt TEXT,
  model VARCHAR(100) DEFAULT 'claude-3-haiku-20240307',
  tools JSONB DEFAULT '["web_search"]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  result TEXT,
  error TEXT,
  credits_used INTEGER DEFAULT 0,
  tools_used JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_credit_transactions_tenant ON credit_transactions(tenant_id);
CREATE INDEX idx_user_memory_user ON user_memory(user_id);
CREATE INDEX idx_commissions_beneficiary ON commissions(beneficiary_id);
CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_user ON agent_runs(user_id);
CREATE INDEX idx_agent_runs_tenant ON agent_runs(tenant_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tenant's data
-- (Policies will be added based on auth implementation)

-- Agents/Runs policies
CREATE POLICY "Users can view their tenant's agents" ON agents
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Owners can manage agents" ON agents
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM users WHERE auth_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Users can view their runs" ON agent_runs
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create runs" ON agent_runs
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
