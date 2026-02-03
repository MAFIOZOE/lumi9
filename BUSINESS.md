# Lumi9 - Business Logic & Economics

> **Critical file.** This defines profitability. Update when numbers change.

## Cost Structure (per user/month)

| Item | Target Cost |
|------|-------------|
| Claude API | $20 max |
| MLM Commissions (4 levels) | ~$30 |
| **Total cost per user** | **~$50** |

## Pricing Strategy

*(May change — noted as initial targets)*

| Plan | Price | Credits | API Budget | Margin |
|------|-------|---------|------------|--------|
| Starter | $69.99 | TBD | ~$10-15 | ~$55+ |
| Pro | $99.99 | TBD | ~$20 | ~$50+ |
| Distributor | $499.99 | TBD | ~$30 | Covers MLM payouts |

**Note:** These prices may change. Architecture supports easy adjustment.

## Token Economics

### Claude API Pricing (approximate)
| Model | Input (per M) | Output (per M) | Use case |
|-------|---------------|----------------|----------|
| Haiku | $0.25 | $1.25 | Cheap, fast, simple tasks |
| Sonnet | $3.00 | $15.00 | Balanced, most chats |
| Opus | $15.00 | $75.00 | Complex reasoning |

### Cost per chat exchange (estimated)
- **Haiku:** ~$0.002-0.005
- **Sonnet:** ~$0.01-0.02
- **Opus:** ~$0.05-0.10
- **With memory injection:** Add ~20-50% more input tokens

### Credit allocation (working theory)
```
$20 budget with Haiku ≈ 4000-10000 messages/month
```

## Model Strategy (DECIDED)

**Phase 1: Haiku Only**
- All user chats use Claude Haiku
- Cheap, fast, good enough for most conversations
- Maximizes messages per dollar

**Future: Opus as Brain**
- Opus 4.5 handles memory management, planning, complex reasoning
- Opus delegates simple tasks to Haiku agents
- User-facing chat stays Haiku (cheap)
- This is fully editable later — architecture supports model routing

## API Provider Options

| Provider | Pros | Cons |
|----------|------|------|
| **Anthropic Direct** | Simple, reliable | Standard pricing |
| **Amazon Bedrock** | 20-30% cheaper with commitments, AWS integration | AWS complexity |
| **OpenRouter** | Easy, competitive, multi-model | Small markup |
| **Google Vertex AI** | GCP integration | Similar to Bedrock |

**Recommendation:** Start with **Anthropic Direct** for simplicity. Move to **Amazon Bedrock** when volume justifies it (they offer committed use discounts).

For serious volume (>$1k/month), contact Anthropic sales for enterprise pricing.

## MLM Commission Structure

*(To be defined by Top Don G in Phase 7)*

| Level | Relationship | Commission % |
|-------|--------------|--------------|
| L1 | Direct referral | ?% |
| L2 | Referral's referral | ?% |
| L3 | ... | ?% |
| L4 | ... | ?% |

**Constraints:**
- Total MLM payout ~$30/user
- Must be sustainable (not pyramid)
- Need fraud prevention

## Open Questions

- [x] Which Claude model(s)? **Haiku now, Opus brain later**
- [ ] Anthropic direct or Bedrock? (Start direct, optimize later)
- [x] Plan pricing? **$69.99 / $99.99 / $499.99** (may change)
- [ ] Exact credit allocations per plan?
- [ ] MLM commission percentages?
- [ ] Minimum payout threshold?

---

*Update this file when business decisions are made.*
