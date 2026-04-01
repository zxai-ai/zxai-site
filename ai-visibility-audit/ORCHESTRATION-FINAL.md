# Orchestration -- AI Visibility Audit Tool (Post-Elon)

## Project
- **Goal:** Build and deploy a $99 AI visibility audit report for independent medical practices. Cloudflare Workers + D1 + Pages. Firecrawl for scraping, Claude for analysis, Resend for delivery. HTML report (no PDF). Funnels into GEO/SEO retainer.
- **Cycle ID:** 20260331-1900
- **Current Phase:** coordinating
- **Started:** 2026-03-31T19:00:00-05:00
- **Last Updated:** 2026-03-31T19:00:00-05:00

## Spec Block
- **Acceptance Criteria:**
  1. Practice owner enters URL + email, pays $99 via Stripe
  2. System scrapes site (Firecrawl), optionally pulls Google Places data
  3. Claude API scores 5 dimensions, produces structured JSON
  4. Branded HTML report at `/report/{order_id}` with print-to-PDF button
  5. Email sent via Resend with report link within 5 minutes
  6. CTA in report links to booking page for retainer consultation
- **Non-Goals:** No PDF generation. No admin dashboard (use SQL script). No user accounts. No recurring billing. No R2 storage.
- **Constraints:** 2 Workers max. Cloudflare free/pro tier. Ship in 7-10 days. Budget: pay-per-use APIs only.

## Architecture Block

### Parallel Lanes (3 lanes, reduced from 6)

| Lane | Description | Branch | Inputs | Outputs | Validation | Status |
|------|-------------|--------|--------|---------|------------|--------|
| 1 | **Checkout** -- Landing page (Pages) + Stripe Checkout Worker + webhook | `lane/checkout` | Brand copy, Stripe keys | Static pages + checkout Worker | Test payment completes, order created in D1 | pending |
| 2 | **Pipeline** -- Single Worker: scrape (Firecrawl) + analyze (Claude) + deliver (Resend) | `lane/pipeline` | All API keys, scoring prompt | Pipeline Worker + lib modules | Test URL produces report JSON in D1 + email sent | pending |
| 3 | **Report Page** -- Static HTML page that renders report from D1 via API call | `lane/report` | Report JSON schema, brand styles | Report page + report API route | `/report/{test_id}` renders correctly with scores | pending |

### Dependencies
```
Lane 1 (Checkout) ---\
Lane 2 (Pipeline) ----→ Integration (wiring + E2E test)
Lane 3 (Report)  ---/
```
All 3 lanes are independent. Integration is a task, not a lane.

### Shared Artifacts
- `shared/types.ts` -- TypeScript types for Order, RawData, ReportData, Env
- `shared/d1-schema.sql` -- D1 schema (orders, raw_data, reports)
- `shared/report-schema.json` -- JSON schema for analysis output

### File Structure
```
src/
  pages/
    index.html          # Landing page
    confirmation.html   # Post-payment
    report.html         # Report renderer (reads from API)
  workers/
    checkout.ts         # Stripe checkout + webhook handler
    pipeline.ts         # Scrape + analyze + email (all in one)
  lib/
    firecrawl.ts        # Firecrawl API client
    places.ts           # Google Places client (optional, non-blocking)
    claude.ts           # Claude API client
    email.ts            # Resend client
shared/
  types.ts
  d1-schema.sql
  report-schema.json
scripts/
  check-orders.sh      # Admin: query recent orders
  deploy.sh            # wrangler deploy
wrangler.toml
```

## Worktree Strategy (Conditional)

**If running Claude Code agents in parallel:** Use worktrees.
```bash
git worktree add ../repo-lane-checkout lane/checkout
git worktree add ../repo-lane-pipeline lane/pipeline
git worktree add ../repo-lane-report lane/report
```

**If building sequentially:** Just use branches. Less overhead.

Merge order: shared artifacts first, then lanes in any order, then integration wiring on main.

## Active Workers
| Worker | Lane | Task | Status | Started | Notes |
|--------|------|------|--------|---------|-------|

## Blocked Items
- [ ] Stripe API keys (test mode)
- [ ] Resend API key + verified sender domain
- [ ] Firecrawl API key (confirm works outside MCP)
- [ ] Claude API key + model access
- [ ] Google Places API key (optional, non-blocking)

## Checkpoint Log
| Timestamp | Phase | Event | Artifact |
|-----------|-------|-------|----------|
| 2026-03-31T19:00 | plan | Full architecture designed (6 lanes) | ORCHESTRATION.md |
| 2026-03-31T19:00 | plan | Elon audit: reduced to 3 lanes, 2 Workers, HTML report | ELON-AUDIT.md |
| 2026-03-31T19:00 | plan | Final orchestration written | ORCHESTRATION-FINAL.md |
