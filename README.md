# Lumi9.ai

> Multi-tenant AI workforce SaaS — Pay → Sign-in → Play

⚠️ **This project structure will evolve.** Nothing is set in stone. As we build and learn, files, schemas, and approaches will be adjusted. That's the plan.

## Current Status
🟢 **Building** — Phase 0-2 scaffolded, waiting on Supabase keys

## Completed
- [x] Next.js 14 project created with TypeScript + Tailwind
- [x] Supabase client setup (client/server/admin)
- [x] Database schema designed (tenants, users, credits, memory, MLM)
- [x] Tenant middleware (subdomain routing)
- [x] Credit system (ledger, balance check, deduction)
- [x] Chat API with credit enforcement
- [x] Basic chat UI
- [x] Landing page

## Next Up
- [ ] **YOU:** Create Supabase project → give me keys
- [ ] Run schema.sql in Supabase SQL Editor
- [ ] Test tenant routing locally
- [ ] Add auth (login/signup)

## Decisions Made
| Date | Decision | Reason |
|------|----------|--------|
| 2026-02-02 | Name: Lumi9.ai | Top Don G decision |
| 2026-02-02 | Domain registrar: Cloudflare | Need wildcard subdomains, WAF, at-cost pricing |
| 2026-02-02 | Database: Supabase (Postgres) | Managed, backups, easy auth integration |
| 2026-02-02 | Memory storage: Postgres JSONB | Simple, fast, <300ms target, evolve later |

## Architecture Notes

**Stack:**
- Frontend: Next.js 14+ (App Router)
- Database: Supabase (Postgres)
- Auth: Supabase Auth (or custom)
- Payments: Stripe
- DNS/CDN/WAF: Cloudflare
- AI Engine: OpenClaw (wrapped)

**Multi-tenant routing:**
```
{tenant}.lumi9.ai → middleware extracts slug → x-tenant-slug header → API resolves tenant
```

**Project Structure:**
```
gbot/lumi9/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── chat/page.tsx     # Chat UI
│   │   └── api/chat/route.ts # Chat endpoint with credit enforcement
│   ├── lib/
│   │   ├── supabase/         # Supabase clients (client/server/admin)
│   │   ├── tenant.ts         # Tenant resolution
│   │   └── credits.ts        # Credit ledger system
│   └── middleware.ts         # Subdomain → tenant routing
└── supabase/
    └── schema.sql            # Full database schema (run this first!)
```

**Credit Flow:**
```
Request → Check credits → If 0, return 402 → Process → Deduct → Respond
```

## Credentials
*(Add when available)*
- Supabase URL: 
- Supabase Anon Key: 
- Supabase Service Key: 
- Stripe Test Key: 
- Cloudflare API Token: 

## Blockers (Waiting on Top Don G)
- [x] Register lumi9.ai domain ✅ (2026-02-02)
- [ ] Create Supabase project → give me keys
- [ ] Create GitHub repo

---

## Meta: Memory Check
Last reviewed: 2026-02-02
- Is this structure working? *(just started)*
- Anything stale or redundant? *(no)*
- Lessons from building Lumi9's memory system to apply here? *(pending)*

*(Update this date when reviewed. If >1 week old, stop and evaluate.)*
