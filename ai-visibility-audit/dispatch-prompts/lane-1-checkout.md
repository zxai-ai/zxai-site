# Dispatch Prompt -- Lane 1: Landing Page + Checkout

## What You Are Building
A Cloudflare Pages site with a single-page landing page and Stripe Checkout integration. Practice owner lands on the page, clicks "Get Your Audit Report ($99)", enters their website URL and email, pays via Stripe, and gets redirected to a confirmation page.

## Read First
- `shared/types.ts` -- the `Order` and `Env` types
- `shared/d1-schema.sql` -- the orders table you will write to
- `wrangler.toml` at repo root (if it exists) for project config

## What to Build

### 1. Landing Page (`src/pages/index.html`)
Single HTML file. No framework. Keep it under 200 lines.

Content structure:
- Headline: "Find out if patients can actually find you online"
- Subhead: One sentence about what the audit covers (SEO, AI visibility, local presence, competitor comparison)
- What you get: 3-4 bullet points describing the report
- Price: $99 one-time
- Form: URL input + email input + "Get My Report" button
- Trust signals: 5-minute delivery, money-back guarantee
- Footer: ZxAI branding

Style: Clean, professional, medical-practice appropriate. Dark navy + white + accent green. No fancy CSS frameworks. Inline styles or a single `<style>` block.

Writing rules: No jargon. No "robust" or "comprehensive" or "seamless." Write like you are talking to a busy doctor. 9th grade reading level. No em dashes.

### 2. Checkout Worker (`src/workers/checkout.ts`)
Cloudflare Worker that handles the form submission.

Flow:
1. Receives POST with `{ url, email }`
2. Validates URL (must be a real domain) and email format
3. Creates a Stripe Checkout Session with:
   - `line_items`: one-time $99 charge, description "AI Visibility Audit Report"
   - `metadata`: `{ url, email }`
   - `success_url`: `/confirmation?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url`: `/`
4. Returns redirect to Stripe Checkout

### 3. Webhook Worker (`src/workers/stripe-webhook.ts`)
Handles `checkout.session.completed` webhook from Stripe.

Flow:
1. Verify Stripe webhook signature
2. Extract `url` and `email` from session metadata
3. Create order in D1 with status `pending`
4. Store order_id in KV with TTL 1 hour (for the pipeline Worker to pick up)
5. Return 200

### 4. Confirmation Page (`src/pages/confirmation.html`)
Simple page: "Your audit is being generated. You will receive it at [email] within 5 minutes."

## Validation
- [ ] `wrangler dev` starts without errors
- [ ] Landing page renders correctly at localhost
- [ ] Stripe test mode checkout completes (use test card 4242...)
- [ ] Webhook fires and creates a row in D1
- [ ] Confirmation page shows after successful payment

## Output Files
```
src/pages/index.html
src/pages/confirmation.html
src/workers/checkout.ts
src/workers/stripe-webhook.ts
wrangler.toml (update if needed)
```

## Completion Signal
When done, update ORCHESTRATION.md: set Lane 1 status to `complete`.
