# Dispatch Prompt -- Lane 3: Analysis Engine

## What You Are Building
A Cloudflare Worker that reads raw scrape data from D1, sends it to the Claude API with a scoring prompt, and produces structured report JSON. This is the intelligence layer.

## Read First
- `shared/types.ts` -- `RawData`, `ReportData`, `Env` types
- `shared/report-schema.json` -- the exact JSON structure your output must match
- `shared/d1-schema.sql` -- the `reports` table where results are stored

## What to Build

### 1. Analysis Worker (`src/workers/analysis.ts`)
Triggered when order status changes to `analyzing` (via KV signal or direct call).

Flow:
1. Read order + raw_data from D1
2. Build the analysis prompt (see below)
3. Call Claude API (`claude-sonnet-4-5-20250514` model)
4. Parse the response into `ReportData` structure
5. Validate against `report-schema.json`
6. Store in `reports` table
7. Update order status to `generating`
8. Signal Lane 4 (report generation)

### 2. Prompt Builder (`src/lib/prompt-builder.ts`)
Constructs the Claude API prompt. This is the core IP of the product.

The prompt should:
- Provide the scraped markdown content and Places data as context
- Score across 5 dimensions (0-100 each):
  1. **SEO Health** -- title tags, meta descriptions, heading structure, internal linking, mobile signals, page speed indicators
  2. **GEO/AI Visibility** -- structured data markup, FAQ content, conversational content patterns, entity clarity (does AI know what this practice does and where?)
  3. **Local Presence** -- Google Places rating, review count, NAP consistency, hours listed, categories correct
  4. **Content Quality** -- depth of service pages, blog/education content, E-E-A-T signals, freshness
  5. **Competitor Gap** -- based on what a typical top-performing practice in their specialty would have vs. what they have
- Produce 3-5 specific, actionable recommendations ranked by priority
- Write findings in plain language (9th grade level, no jargon, no em dashes)
- Include a CTA section suggesting a follow-up consultation

Output must be valid JSON matching `report-schema.json`.

### 3. Claude Client (`src/lib/claude.ts`)
Thin wrapper around Anthropic API.
- `analyze(prompt: string, apiKey: string): Promise<string>`
- Model: `claude-sonnet-4-5-20250514`
- Max tokens: 4096
- Temperature: 0.3 (we want consistent, factual scoring)
- System prompt: "You are a medical practice digital visibility analyst. Score honestly. Do not inflate scores. Be specific in findings and recommendations. Output valid JSON only."
- Handle rate limits with retry
- Timeout: 90 seconds

## Validation
- [ ] Given test raw_data in D1, Worker produces valid ReportData JSON
- [ ] All 5 score dimensions are present and between 0-100
- [ ] Recommendations are specific (mention actual page names, missing elements)
- [ ] JSON validates against report-schema.json
- [ ] Report stored in D1 reports table
- [ ] Order status updated to `generating`
- [ ] No em dashes in any output text
- [ ] Language is 9th grade readable

## Output Files
```
src/workers/analysis.ts
src/lib/prompt-builder.ts
src/lib/claude.ts
```

## Completion Signal
When done, update ORCHESTRATION.md: set Lane 3 status to `complete`.
