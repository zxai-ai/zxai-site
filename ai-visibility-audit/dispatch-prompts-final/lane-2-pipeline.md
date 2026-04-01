# Dispatch -- Lane 2: Pipeline

## Build
Single Worker that does everything between payment and delivery: scrape, analyze, email. Sequential flow, no coordination layer.

## Read First
- `shared/types.ts`
- `shared/d1-schema.sql`
- `shared/report-schema.json`

## Files to Create

### `src/workers/pipeline.ts`
Receives order_id. Runs this chain:
1. Read order from D1
2. Set status to `scraping`
3. Call `firecrawl.scrape(order.url)` -- get markdown + metadata
4. Call `places.lookup(order.url)` -- get rating, reviews, address (non-blocking: if it fails, continue)
5. Store raw data in D1
6. Set status to `analyzing`
7. Build prompt from raw data, call `claude.analyze(prompt)`
8. Validate response against report-schema.json
9. Store report JSON in D1
10. Set status to `delivering`
11. Call `email.sendReportLink(order.email, order.id, report.scores.overall)`
12. Set status to `delivered`

If any step fails: set status to `failed`, log error. Do not retry automatically (manual recovery via re-triggering).

### `src/lib/firecrawl.ts`
- `scrape(url, apiKey): Promise<FirecrawlResult>`
- POST to `https://api.firecrawl.dev/v1/scrape`, body: `{ url, formats: ["markdown"] }`
- 3 retries with backoff on 429
- 30s timeout

### `src/lib/places.ts`
- `lookup(query, apiKey): Promise<PlacesResult | null>`
- Google Places Text Search
- Returns null on failure (non-blocking)

### `src/lib/claude.ts`
- `analyze(prompt, apiKey): Promise<string>`
- Model: `claude-sonnet-4-5-20250514`
- Max tokens: 4096, temperature: 0.3
- System: "You are a medical practice digital visibility analyst. Score honestly. Be specific. Output valid JSON only."
- 90s timeout

### `src/lib/prompt-builder.ts`
Builds the scoring prompt. Input: FirecrawlResult + PlacesResult. Output: prompt string.

Score 5 dimensions (0-100):
1. SEO Health -- titles, metas, headings, internal links, mobile
2. GEO/AI Visibility -- structured data, FAQ content, entity clarity
3. Local Presence -- rating, reviews, NAP, hours, categories
4. Content Quality -- service page depth, blog, E-E-A-T, freshness
5. Competitor Gap -- vs. typical top-performing practice in their specialty

3-5 recommendations, ranked by priority. Plain language. No em dashes.

### `src/lib/email.ts`
- `sendReportLink(email, orderId, score, apiKey): Promise<void>`
- From: `reports@zxai.ai`
- Subject: "Your AI Visibility Score: {score}/100"
- Body: 3 sentences max. Link to `/report/{orderId}`. No em dashes. Under 65 words.

## Done When
- Given a test order_id, pipeline runs end-to-end
- Raw data in D1
- Report JSON in D1, validates against schema
- Email sent with report link
- Status progression: pending -> scraping -> analyzing -> delivering -> delivered
