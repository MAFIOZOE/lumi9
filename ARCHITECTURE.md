# Lumi9 - Architecture

> **Will evolve.** This documents current technical decisions. Expect changes.

## Project Structure

```
lumi9/lumi9/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── chat/page.tsx         # Chat UI
│   │   ├── login/page.tsx        # (TODO) Auth page
│   │   └── api/
│   │       └── chat/route.ts     # Chat endpoint
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser client
│   │   │   ├── server.ts         # Server component client
│   │   │   └── admin.ts          # Service role client
│   │   ├── tenant.ts             # Tenant resolution helpers
│   │   └── credits.ts            # Credit ledger operations
│   └── middleware.ts             # Subdomain routing
├── supabase/
│   └── schema.sql                # Database schema
└── .env.local                    # Secrets (not committed)
```

## Database Schema

### Core Tables
- `tenants` — Organizations (id, slug, name, settings)
- `users` — Users within tenants (id, tenant_id, email, role)
- `plans` — Subscription tiers (starter/pro/distributor)
- `subscriptions` — Tenant → Plan mapping

### Credits (Ledger Style)
- `credit_transactions` — Every credit change logged
  - amount (positive = credit, negative = debit)
  - balance_after (running balance)
  - type (subscription/purchase/usage/refund/bonus)

### Chat
- `conversations` — Chat sessions
- `messages` — Individual messages with token/credit tracking

### Memory
- `user_memory` — Per-user personalization (JSONB)
  - memory_type: profile | preferences | long_term | daily_log

### MLM (Phase 7)
- `referral_tree` — 4-level ancestry
- `commissions` — Commission ledger

## API Contracts

### POST /api/chat
```typescript
// Request
{ message: string, conversationId?: string }

// Response (success)
{ message: string, credits: { used: number, remaining: number } }

// Response (no credits)
{ error: "Insufficient credits", balance: 0, required: 1 }
// Status: 402 Payment Required
```

## Multi-Tenant Flow

```
Request to alice.lumi9.ai
    ↓
middleware.ts extracts "alice" from subdomain
    ↓
Sets x-tenant-slug header
    ↓
API routes read header, lookup tenant in DB
    ↓
All queries scoped to tenant_id
```

## Credit Enforcement

```
1. Request arrives
2. enforceCredits(tenantId, amount) called
3. If balance < amount → return 402, stop
4. Process request
5. deductCredits() after success
6. Return response with new balance
```

---

*Architecture will adapt as we build and learn.*
