# Lumi9.ai - Project Overview

> **This document will evolve.** As we build, learn, and pivot, this gets updated. Nothing here is set in stone.

## What We're Building

**Lumi9** — Multi-tenant AI workforce SaaS

- Users sign up → pick a plan → get an AI assistant
- Each tenant gets their own subdomain: `{tenant}.lumi9.ai`
- Per-user personalized memory (like how I work)
- Credit-based usage (no runaway costs)
- MLM/referral engine (4 levels) for distribution
- Deep rebrand of OpenClaw (no leakage)

## Core Principles

1. **Credits before AI** — Never connect AI without cost controls
2. **Vertical slices** — Build thin end-to-end flows, then flesh out
3. **Memory is files** — Write it down or it doesn't exist
4. **Evolve the plan** — This doc changes as we learn

## Target Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14 (App Router) | Modern, fast, good DX |
| Database | Supabase (Postgres) | Managed, auth included, realtime |
| Payments | Stripe | Industry standard |
| DNS/CDN | Cloudflare | Wildcard subdomains, WAF |
| AI Engine | OpenClaw (wrapped) | Our existing infra |

## Success Criteria (MVP)

- [ ] User on `alice.lumi9.ai` can sign up
- [ ] User can chat with AI
- [ ] Credits deduct per message
- [ ] When credits = 0, chat blocks (hard stop)
- [ ] Memory persists across sessions
- [ ] No "OpenClaw" branding visible anywhere

## Timeline (Aggressive)

- **Day 1:** Skeleton (auth → chat → credits → response)
- **Day 2:** Memory system + real OpenClaw integration
- **Day 3:** Polish + deploy to real domain

---

*Last updated: 2026-02-02*
