# Lumi9 - Progress Tracker

> **Living document.** Updated every session. This is my GPS.

---

## Phase 0 - Foundation & Front Door

### ✅ Done
- [x] Domain registered: lumi9.ai (Cloudflare)
- [x] Next.js 14 project scaffolded
- [x] Supabase client structure (browser/server/admin)
- [x] Database schema written (schema.sql)
- [x] Tenant model (id, slug, name, settings)
- [x] User model (id, tenant_id, email, role)
- [x] Tenant resolution middleware (subdomain → x-tenant-slug)

### ✅ Done
- [x] Supabase keys retrieved and saved to .env.local
- [x] Schema executed in Supabase SQL Editor
- [x] All 10 tables created (tenants, users, plans, etc.)
- [x] Test tenant created: `demo` (Demo Company)

### ✅ Dev Server Running
- [x] Next.js dev server started
- [x] Landing page working (http://localhost:3000)
- [x] Chat page working (http://localhost:3000/chat)

### ✅ Known Issues (Resolved)
- [x] Middleware deprecated in Next.js 16 - migrated to "proxy" convention
- [x] `middleware.ts` → `proxy.ts` (function renamed too)

### 📋 Remaining
- [x] Auth session strategy (Supabase Auth) ✅
- [x] Proxy convention migration (Next.js 16 compliant)
- [x] Working Gate: alice.localhost vs bob.localhost isolation test ✅

---

## Phase 1 - Identity, Plans, and Credits

### ✅ Done
- [x] Plans schema (starter/pro/distributor)
- [x] Credit transactions table (ledger style)
- [x] Credit enforcement logic (check → hard stop)
- [x] getBalance(), hasCredits(), addCredits(), deductCredits()
- [x] **Supabase Auth configured**
- [x] Login page (/login)
- [x] Signup page (/signup)
- [x] Auth callback route (/auth/callback)
- [x] useAuth hook for client-side auth
- [x] Chat page protected (requires auth)
- [x] Email confirmation disabled (instant signup)

### ✅ Stripe Integration (Code Complete)
- [x] Stripe SDK configured (`lib/stripe.ts`)
- [x] Checkout API (`/api/stripe/checkout`) - subscriptions + credit packs
- [x] Webhook handler (`/api/stripe/webhook`) - all events handled
- [x] Dashboard page (`/dashboard`) - plan, credits, usage stats

### ✅ User Provisioning (Critical Fix)
- [x] Created `/api/auth/provision` endpoint
- [x] Updated signup to auto-create tenant + user records
- [x] Updated auth callback for email confirmation flow
- [x] New users get 50 free credits automatically
- [x] Users signing up on subdomain join that tenant
- [x] Users signing up on main domain get their own workspace

### ✅ Migration Complete
- auth_id column confirmed working

### ✅ Known Issue Fixed
- Root cause: Supabase DB trigger auto-assigns to demo tenant BEFORE provision endpoint runs
- Fix: Provision endpoint now detects "member" role users without tenantSlug and migrates them to own workspace

### ✅ Fixed
- [x] Fix new tenant creation for main domain signups (auth callback now handles member→owner migration)

### 📋 Remaining
- [ ] Stripe account setup (need API keys from Top Don G)
- [ ] Create products/prices in Stripe Dashboard
- [ ] Test webhook integration
- [ ] Working Gate: pay → credits appear → usage blocks at 0

---

## Phase 2 - Branded Web Chat

### ✅ Done
- [x] Chat page UI (dark mode)
- [x] Chat API with credit check
- [x] Credit display in header
- [x] Landing page
- [x] **Claude Haiku integration** (claude-3-haiku-20240307)
- [x] Real AI responses working!
- [x] **Conversation persistence** - messages saved to DB
- [x] Conversation sidebar with history
- [x] Conversation context in AI requests (remembers history)
- [x] URL-based conversation routing (`/chat?c=<id>`)

### ✅ Branding System (2026-02-03)
- [x] Branding JSONB column on tenants table
- [x] `lib/branding.ts` with getBranding(), defaults, CSS var generation
- [x] BrandProvider React context + useBranding() hook
- [x] Dynamic Logo component (tenant logo or default)
- [x] Settings page `/settings/branding` with live preview
- [x] All pages updated to use CSS variables
- [x] Design tokens: Primary #6366F1, Accent #22D3EE, dark theme

### 📋 Remaining
- [ ] Error sanitization (no OpenClaw leakage)
- [ ] Working Gate: two tenants chat simultaneously, isolated

---

## Phase 3 - Memory System

### ✅ Done
- [x] Created `lib/memory.ts` with full CRUD
- [x] Memory types: profile, preferences, facts, long_term
- [x] Integrated memory into chat API (system prompt includes user context)
- [x] AI can auto-learn facts using `[REMEMBER: ...]` pattern
- [x] Memory tags stripped from visible responses
- [x] `/api/memory` endpoint (GET/POST/DELETE)
- [x] `buildMemoryContext()` formats memory for AI

### 📋 Remaining
- [ ] Memory settings page in UI
- [ ] Memory usage in dashboard

## Phase 4 - OpenClaw Integration

### ✅ Done (2026-02-03)
- [x] Database: `agents` + `agent_runs` tables with RLS
- [x] `lib/openclaw.ts` - Mock OpenClaw client (ready for real gateway swap)
- [x] `lib/agent.ts` - Full agent execution layer
- [x] Tool permissions by plan (Starter/Pro/Distributor)
- [x] Credit costs per tool (web_search: 2, browse: 5, code: 3, etc.)
- [x] API routes: `/api/agents` CRUD + `/api/agents/[id]/run`
- [x] UI: Agent list, create/edit pages, inline task runner
- [x] Dashboard updated with agents count + recent runs
- [x] Navigation includes Agents link

### 📋 Remaining
- [ ] Connect to real OpenClaw gateway (swap mock client)
- [ ] Streaming responses in UI
- [ ] Agent templates (pre-built agents)

## Phase 5 - Scale-to-Zero
*Not started*

## Phase 6 - Telegram Channel
*Not started*

## Phase 7 - MLM Engine

### ✅ Done
- [x] Created `lib/mlm.ts` with full referral system
- [x] Referral code generation + lookup
- [x] Referral tree tracking (4 levels deep)
- [x] Commission calculation: 10% / 5% / 3% / 2%
- [x] Commission processing on Stripe payments
- [x] `/api/referrals` endpoint
- [x] `/join/[code]` redirect page
- [x] Referral tracking in signup flow
- [x] `/referrals` dashboard page

### ✅ Migration Complete
- [x] Run migration: `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE`

### 📋 Remaining
- [ ] Payout integration (Stripe Connect or manual)

## Phase 8 — Payouts

### ✅ Done
- [x] Created `lib/payouts.ts` with full payout system
- [x] Payout methods: PayPal, Bank Transfer
- [x] Minimum payout threshold: $10
- [x] `/api/payouts` endpoint (user requests)
- [x] `/api/admin/payouts` endpoint (admin approval)
- [x] `/payouts` page with settings + history
- [x] Payout request workflow (pending → processing → completed)
- [x] Commission marking as paid

### ✅ Migration Complete
- [x] Run migration: `003_payouts.sql` (payout_requests table + user columns)

### 📋 Remaining
- [ ] Email notifications for payout status
- [ ] Stripe Connect integration (optional)

## Phase 9 - Production Hardening
*Continuous - adding basics as we go*

## Phase 10 - Scale & Expansion
*Future*

---

## Velocity Log

| Date | What Got Done |
|------|---------------|
| 2026-02-02 | Project scaffolded, all Phase 0-2 code written (~20 min) |
| 2026-02-02 | Supabase live, auth working, credits deducting, Claude Haiku responding! |
| 2026-02-02 | Migrated middleware.ts → proxy.ts for Next.js 16 compliance |
| 2026-02-02 | Multi-tenant isolation verified (alice/bob/main domain all working) |
| 2026-02-02 | Conversation persistence + sidebar, Dashboard page, Stripe integration |
| 2026-02-02 | User provisioning (critical fix), Memory system (Phase 3 complete) |
| 2026-02-02 | E2E tests, fixed tenant migration for auto-assigned users |
| 2026-02-02 | Phase 7: MLM/Referral engine complete (4-level commissions) |
| 2026-02-02 | Phase 8: Payout system complete (PayPal + Bank) |
| 2026-02-03 | Ran DB migrations (referral_code + payouts), fixed tenant creation bug |
| 2026-02-03 | **Branding System**: CSS variables, BrandProvider, Logo component, settings page |
| 2026-02-03 | **OpenClaw Integration**: Agents + runs DB, mock client, execution layer, full UI |

---

*This structure may change as we learn what works.*
