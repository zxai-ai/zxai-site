# Dispatch Prompt -- Lane 6: Integration + E2E

## What You Are Building
Wire all 5 lanes together into a single working flow. This lane runs AFTER lanes 1-5 are merged to main.

## Read First
- `ORCHESTRATION.md` -- confirm all 5 lanes are marked complete
- `shared/types.ts` -- all shared types
- All Worker files in `src/workers/`
- All lib files in `src/lib/`

## What to Do

### 1. Wrangler Configuration (`wrangler.toml`)
Configure all Workers, D1 bindings, KV namespaces, R2 buckets, and routes.

```toml
# Example structure (adjust names):
name = "zxai-audit"

[[d1_databases]]
binding = "DB"
database_name = "audit-db"
database_id = "..."

[[kv_namespaces]]
binding = "AUDIT_KV"
id = "..."

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "audit-reports"

# Routes for each Worker
# /api/checkout -> checkout worker
# /api/webhook -> stripe webhook worker
# /api/pipeline -> pipeline worker (internal)
# /api/admin/* -> admin API worker
```

### 2. Flow Wiring
Make sure the chain works end-to-end:
1. Stripe webhook (Lane 1) -> writes order to D1, puts order_id in KV
2. Pipeline Worker (Lane 2) -> triggered by KV, scrapes, stores raw data
3. Analysis Worker (Lane 3) -> triggered by pipeline completion, analyzes, stores report JSON
4. Report Worker (Lane 4) -> triggered by analysis completion, generates PDF, sends email
5. Admin Dashboard (Lane 5) -> reads from D1, shows everything

The triggering mechanism between Workers: use Cloudflare Queues if available, otherwise use KV polling or direct Worker-to-Worker fetch calls.

### 3. Environment Variables
Create a `.dev.vars.example` file listing all required secrets:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FIRECRAWL_API_KEY=fc_...
GOOGLE_PLACES_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

### 4. E2E Test
Write a test script (`scripts/e2e-test.sh`) that:
1. Creates a test order directly in D1
2. Triggers the pipeline Worker
3. Waits for completion (polls order status)
4. Verifies: raw_data exists, report_json exists, PDF URL exists
5. Reports pass/fail

### 5. Deploy Script (`scripts/deploy.sh`)
```bash
wrangler d1 execute audit-db --file=shared/d1-schema.sql
wrangler deploy
```

## Validation
- [ ] Full E2E: test order -> scrape -> analysis -> PDF -> email delivery
- [ ] All Workers deploy without errors
- [ ] D1 tables have correct data at each stage
- [ ] Admin dashboard shows the test order with correct status progression
- [ ] PDF is accessible via R2 URL
- [ ] Email arrives with PDF link

## Output Files
```
wrangler.toml (final version)
.dev.vars.example
scripts/e2e-test.sh
scripts/deploy.sh
```

## Completion Signal
When done, update ORCHESTRATION.md: set Lane 6 status to `complete` and Current Phase to `shipping`.
