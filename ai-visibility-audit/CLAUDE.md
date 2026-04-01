# AI Visibility Audit Tool

## What This Is
$99 one-time audit report for independent medical practices. Customer enters URL + email, pays via Stripe, gets a branded HTML report scoring their online visibility. Report funnels into GEO/SEO monthly retainer.

## Stack
- Cloudflare: Workers, D1, KV, Pages
- Firecrawl: site scraping
- Claude API (Sonnet): analysis and scoring
- Google Places: local presence data (optional, non-blocking)
- Stripe: checkout
- Resend: email delivery

## Architecture (2 Workers, 3 lanes)
1. **Checkout Worker** -- Stripe Checkout + webhook, creates order in D1, triggers pipeline
2. **Pipeline Worker** -- scrape (Firecrawl) + analyze (Claude) + deliver (Resend), all sequential in one Worker
3. **Report Page** -- static HTML on Pages, renders report from D1 via API

No PDF generation. No admin dashboard. No R2. HTML report with print-to-PDF button.

## Writing Rules (apply to ALL generated content)
- Never use em dashes
- No jargon: no "robust," "comprehensive," "seamless," "leverage"
- 9th grade reading level
- Emails under 65 words
- One CTA per touchpoint
- Lead with the problem, not the solution

## Key Files
- `ORCHESTRATION-FINAL.md` -- current orchestration state
- `ELON-AUDIT.md` -- first-principles audit and what was cut
- `dispatch-prompts-final/` -- dispatch prompts for each lane
- `shared/types.ts` -- shared TypeScript types
- `shared/d1-schema.sql` -- database schema
- `shared/report-schema.json` -- report JSON schema

## Development
Using git worktrees (or branches) with 3 parallel lanes:
- `lane/checkout` -- landing page + payment
- `lane/pipeline` -- scrape + analyze + deliver
- `lane/report` -- report HTML renderer

Run `setup-worktrees-final.sh` from repo root to create worktrees.
Each lane has a dispatch prompt in `dispatch-prompts-final/`.

## Testing
- E2E: create test order in D1, trigger pipeline, verify report renders
- Admin: `scripts/check-orders.sh` to query recent orders
