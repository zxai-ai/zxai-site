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

## Blog Component Rules

### Callout / Highlight Blocks
All callout blocks (`.callout`) in blog posts use a white background for readability against the dark article body. Always add `callout-example` as a second class:
```html
<div class="callout callout-example">
  <span class="callout-label">Label Here</span>
  <p>Content here.</p>
</div>
```
The `.callout-example` class sets `background: #ffffff`, body text `color: #374151`, and strong text `color: #111827`. The cyan left border and label color are inherited from `.callout`.

### Author LinkedIn Links
Never use a plain text hyperlink for LinkedIn. Always use the `.linkedin-btn` component in the footer byline:
```html
<a href="https://www.linkedin.com/in/amesa123/" class="linkedin-btn" target="_blank" rel="author noopener">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  LinkedIn
</a>
```
The article-meta "By [Author]" at the top of each post should be plain text with no link.

### Stat Numbers
All `.stat-num` values must use plain text with no `<span>` wrappers. The cream serif italic style (`--c-cream`) is the consistent display across all stat boxes. Never use `<span>` inside `.stat-num` to apply accent color to individual digits.

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
