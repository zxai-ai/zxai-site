# Dispatch Prompt -- Lane 2: Scrape + Data Pipeline

## What You Are Building
A Cloudflare Worker that takes a practice URL, scrapes it via Firecrawl API, pulls Google Places data for the practice, and stores the raw results in D1. This is the data collection layer.

## Read First
- `shared/types.ts` -- `RawData`, `FirecrawlResult`, `PlacesResult`, `Env` types
- `shared/d1-schema.sql` -- the `raw_data` table schema
- `shared/report-schema.json` -- understand what the analysis engine will need downstream

## What to Build

### 1. Pipeline Worker (`src/workers/pipeline.ts`)
Triggered by a KV key appearing (set by the checkout webhook in Lane 1) or by direct invocation with an order_id.

Flow:
1. Read order from D1 by order_id
2. Update order status to `scraping`
3. Call Firecrawl API:
   - Endpoint: `POST https://api.firecrawl.dev/v1/scrape`
   - Body: `{ url: order.url, formats: ["markdown"] }`
   - Extract: markdown content, metadata (title, description), internal links
4. Call Google Places API:
   - Text Search for the practice name + location
   - Get: name, rating, review count, address, phone, hours, categories
5. Store both results in `raw_data` table
6. Update order status to `analyzing`
7. Trigger the analysis Worker (Lane 3) via KV signal or direct fetch

### 2. Firecrawl Client (`src/lib/firecrawl.ts`)
Thin wrapper around the Firecrawl API.
- `scrape(url: string, apiKey: string): Promise<FirecrawlResult>`
- Handle rate limits (429) with exponential backoff, max 3 retries
- Handle timeouts (30s max)
- Return structured `FirecrawlResult`

### 3. Places Client (`src/lib/places.ts`)
Thin wrapper around Google Places API.
- `lookup(query: string, apiKey: string): Promise<PlacesResult>`
- Use Text Search endpoint
- Return structured `PlacesResult`
- Handle: no results found (return empty PlacesResult with nulls)

### Error Handling
- If Firecrawl fails after 3 retries: set order status to `failed`, store error in KV
- If Places fails: continue without it (Places data is nice-to-have, not blocking)
- Log all errors with order_id for debugging

## Validation
- [ ] Given a test order_id in D1, Worker scrapes the URL successfully
- [ ] Firecrawl result stored in raw_data table
- [ ] Google Places result stored in raw_data table
- [ ] Order status updated to `analyzing` on success
- [ ] Order status updated to `failed` on Firecrawl failure
- [ ] Worker completes in under 60 seconds for a typical medical practice website

## Output Files
```
src/workers/pipeline.ts
src/lib/firecrawl.ts
src/lib/places.ts
```

## Completion Signal
When done, update ORCHESTRATION.md: set Lane 2 status to `complete`.
