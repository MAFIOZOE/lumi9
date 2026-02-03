# Lumi9 - Decision Log

> **Append-only.** When we make a choice, log it here with reasoning. Prevents re-asking the same questions.

---

## 2026-02-02

### Domain Registrar: Cloudflare
**Decision:** Register lumi9.ai on Cloudflare  
**Why:** Need wildcard subdomains for multi-tenant (`*.lumi9.ai`). Cloudflare gives us DNS + CDN + WAF + at-cost domain pricing in one place.  
**Alternatives considered:** Namecheap (would need to point to Cloudflare anyway)

### Database: Supabase (Postgres)
**Decision:** Use Supabase for database + auth  
**Why:** Managed Postgres, built-in auth, realtime subscriptions, good free tier, backups included.  
**Alternatives considered:** PlanetScale (MySQL, no foreign keys in free tier), raw AWS RDS (more ops work)

### Memory Storage: Postgres JSONB (not object storage)
**Decision:** Store user memory in Postgres JSONB columns, not S3/object storage  
**Why:** Simpler, faster queries, <300ms target achievable, transactions + backups free. Can add object storage later if needed.  
**Alternatives considered:** S3 + file-based like Jason's system (adds latency, complexity)

### Credit System: Ledger Style
**Decision:** Every credit change is a row with running balance  
**Why:** Full audit trail, can reconstruct balance at any point, accounting-grade.  
**Alternatives considered:** Single balance column (loses history, audit issues)

### Credit Rate: Flat per message (for now)
**Decision:** 1 credit = 1 chat exchange  
**Why:** Simple to understand, simple to implement. Can switch to token-based later with usage data.  
**Alternatives considered:** Per-token (complex, need to estimate before request)

### Project Name: Lumi9
**Decision:** Brand is Lumi9.ai  
**Why:** Top Don G decision. Clean, memorable, .ai available.

### Model Strategy: Haiku Default
**Decision:** Start with Claude Haiku for all user chats  
**Why:** Cheapest option, maximizes messages per dollar ($20 budget = 4000-10000 messages/month). Fast responses.  
**Future:** Add Opus 4.5 as "brain" layer for memory/planning, delegating to Haiku agents. Architecture supports this change.

### Initial Pricing
**Decision:** Starter $69.99 / Pro $99.99 / Distributor $499.99  
**Why:** Top Don G initial targets. Provides healthy margin above $50 cost floor.  
**Note:** May change. System designed for easy price adjustment.

### Project Folder: lumi9/
**Decision:** Renamed from `gbot/` to `lumi9/` to match brand  
**Why:** Consistency. The product is Lumi9, the folder should be too.

---

*Add new decisions above this line. Include date, decision, reasoning, and alternatives.*
