# Dispatch -- Lane 1: Checkout

## Build
Landing page + Stripe Checkout + webhook. 2 files of HTML, 1 Worker.

## Read First
- `shared/types.ts`
- `shared/d1-schema.sql`

## Files to Create

### `src/pages/index.html`
Single HTML file, inline styles. Under 150 lines.
- Headline: "Find out if patients can actually find you online"
- 3-4 bullets on what the audit covers
- URL input + email input + "Get My Report -- $99" button
- Trust: "Report in 5 minutes. Money back if it is not worth it."
- Style: Navy #1a1a2e, white, green #4ade80. Clean, medical-appropriate.
- Writing: No jargon, no em dashes, 9th grade level.

### `src/pages/confirmation.html`
Short page: "Your report is being built. Check [email] in about 5 minutes."

### `src/workers/checkout.ts`
- POST handler: validate URL + email, create Stripe Checkout Session ($99, one-time), redirect
- Webhook handler: verify Stripe signature, extract URL + email from metadata, create order in D1 (status: `pending`), call pipeline Worker via fetch

## Done When
- Landing page renders
- Test Stripe payment completes
- Order row appears in D1
- Pipeline Worker gets triggered
