# Orchestration -- AI Visibility Audit Tool

## Project
- **Goal:** Build and deploy a paid AI visibility audit tool for independent medical practices on Cloudflare (Workers + D1 + KV), using Firecrawl for site scraping, Claude API for analysis, and Google Places for local presence scoring. Output: $99 audit report that funnels into GEO/SEO retainer packages.
- **Cycle ID:** 20260331-1900
- **Current Phase:** coordinating
- **Started:** 2026-03-31T19:00:00-05:00
- **Last Updated:** 2026-03-31T19:00:00-05:00

## Spec Block
- **Acceptance Criteria:**
  1. Practice owner enters their website URL and pays $99 via Stripe
  2. System scrapes the site (Firecrawl), pulls Google Places data, runs Claude API analysis
  3. Generates a branded PDF report scoring: SEO health, GEO/AI visibility, local presence, content gaps, competitor comparison
  4. Report delivered via email (Resend) within 5 minutes of payment
  5. Upsell CTA in report links to booking page for GEO/SEO monthly retainer
  6. Entire stack runs on Cloudflare (Workers, D1, KV, Pages)
  7. Admin dashboard shows orders, report status, and revenue
- **Non-Goals:** No user accounts or login system. No recurring billing (that is the retainer, handled separately). No white-label or multi-tenant. No mobile app.
- **Constraints:** Cloudflare only (no Vercel). Must handle HIPAA-adjacent data carefully (practice info, not PHI). Budget: minimal -- Cloudflare free/pro tier, pay-per-use APIs only. Timeline: ship MVP in 14 days.

## Architecture Block
### Parallel Lanes

| Lane | Description | Branch | Inputs | Outputs | Validation | Status |
|------|-------------|--------|--------|---------|------------|--------|
| 1 | **Landing Page + Checkout** -- Cloudflare Pages site with Stripe checkout flow | `lane/checkout` | Brand assets, Stripe keys | Static site + checkout Worker | Stripe test payment completes, redirects to confirmation | pending |
| 2 | **Scrape + Data Pipeline** -- Worker that takes a URL, runs Firecrawl scrape, pulls Google Places data, stores raw results in D1 | `lane/pipeline` | Firecrawl API key, Google Places key | Worker + D1 schema | Given a test URL, raw data lands in D1 within 30s | pending |
| 3 | **Analysis Engine** -- Worker that reads raw data from D1, calls Claude API with scoring prompt, produces structured JSON report data | `lane/analysis` | Claude API key, scoring rubric | Worker + prompt template | Given test raw data, produces valid report JSON | pending |
| 4 | **Report Generator + Delivery** -- Worker that takes report JSON, generates branded PDF, sends via Resend | `lane/report` | Report JSON schema, brand template, Resend key | Worker + PDF template | Given test JSON, PDF generated and email sent | pending |
| 5 | **Admin Dashboard** -- Simple Cloudflare Pages dashboard reading from D1: orders, statuses, revenue | `lane/admin` | D1 schema from Lane 2 | Static dashboard | Shows test order data correctly | pending |
| 6 | **Integration + E2E** -- Wire all lanes together, end-to-end flow from payment to delivered report | `lane/integration` | All lane outputs | Working E2E flow | Full test: pay $0.50 test charge, get real PDF in email | blocked on 1-5 |

### Dependencies
```
Lane 1 (Checkout) ----\
Lane 2 (Pipeline) -----\
Lane 3 (Analysis) ------→ Lane 6 (Integration)
Lane 4 (Report) -------/
Lane 5 (Admin) -------/
```
Lanes 1-5 are independent. Lane 6 wires them together.

Lane 3 needs the D1 schema from Lane 2 (shared artifact).
Lane 4 needs the report JSON schema from Lane 3 (shared artifact).

### Shared Artifacts
- `shared/d1-schema.sql` -- D1 database schema (orders, raw_data, reports)
- `shared/report-schema.json` -- JSON schema for the analysis output that feeds into PDF generation
- `shared/types.ts` -- Shared TypeScript types used across Workers
- `shared/brand/` -- Logo, colors, fonts for PDF template

## Worktree Strategy

Each lane gets its own git worktree branching from `main`. This allows parallel development with zero context switching.

```
repo/                     # main branch -- shared artifacts only
repo-lane-checkout/       # worktree: lane/checkout
repo-lane-pipeline/       # worktree: lane/pipeline
repo-lane-analysis/       # worktree: lane/analysis
repo-lane-report/         # worktree: lane/report
repo-lane-admin/          # worktree: lane/admin
repo-lane-integration/    # worktree: lane/integration (created after 1-5 merge)
```

### Merge Order
1. Merge shared artifacts to `main` first
2. Lanes 1-5 merge to `main` in any order (they are independent)
3. Lane 6 branches from `main` after all merges, wires everything, then merges last

### Worktree Rules
- Never edit shared artifacts in a lane worktree. Edit in `main`, pull into lanes.
- Each lane commits only to its own branch.
- Squash-merge each lane to `main` for clean history.
- Delete worktree after merge.

## Active Workers
| Worker | Lane | Task | Status | Started | Notes |
|--------|------|------|--------|---------|-------|

## Blocked Items
- [ ] Stripe account setup -- need API keys for Lane 1
- [ ] Resend account setup -- need API key for Lane 4
- [ ] Google Places API -- need key for Lane 2
- [ ] Firecrawl API -- confirm MCP key works for Worker calls too
- [ ] Claude API -- confirm Anthropic key and model access

## Checkpoint Log
| Timestamp | Phase | Event | Artifact |
|-----------|-------|-------|----------|
| 2026-03-31T19:00 | intake | Spec drafted from conversation context | ORCHESTRATION.md |
| 2026-03-31T19:00 | design | Architecture with 6 parallel lanes + worktree strategy | ORCHESTRATION.md |
| 2026-03-31T19:00 | coordinating | Shared artifacts defined, dispatch prompts drafted | ORCHESTRATION.md |
