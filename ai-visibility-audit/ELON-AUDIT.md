# Elon Audit -- AI Visibility Audit Tool

Running the 5-step first-principles reduction on the entire worktree strategy, architecture, and dispatch plan.

---

## Step 1: Question Every Requirement

### ELEMENT: 6 parallel lanes
**ASSUMPTION:** More lanes = more parallelism = faster delivery
**CHALLENGE:** Do we actually have 6 independent humans/agents working simultaneously? If Anthony is building this solo with Claude Code, "parallel lanes" means "parallel context windows." With one person reviewing output, 6 lanes creates 6 review queues. The bottleneck is not code generation. It is review and integration.
**VERDICT:** KILL the 6-lane structure. Reduce to 3 lanes max. The physics: you need (a) something that collects money and data, (b) something that analyzes the data, and (c) something that delivers the output.

### ELEMENT: Admin Dashboard (Lane 5)
**ASSUMPTION:** Anthony needs a dashboard to monitor orders
**CHALLENGE:** At MVP volume (0-10 orders/week), D1 console + a SQL query gives you the same info. A dashboard is a nice-to-have that adds an entire lane of work for a feature that serves one person looking at it twice a day.
**VERDICT:** KILL for MVP. Replace with a single SQL query saved as a script. Build dashboard after you have 50+ orders.

### ELEMENT: Separate Workers for each stage (checkout, pipeline, analysis, report)
**ASSUMPTION:** Microservice architecture is the right pattern
**CHALLENGE:** Cloudflare Workers have a 30-second CPU time limit (paid plan). The entire flow -- scrape, analyze, generate PDF, send email -- could exceed this if done in one Worker. But 4 separate Workers means 4 deployment configs, 4 sets of bindings, and a coordination layer between them. That coordination layer (KV signaling) is fragile and adds complexity.
**VERDICT:** SIMPLIFY. Use 2 Workers: (1) Checkout Worker handles payment + order creation, (2) Pipeline Worker handles everything else in sequence using Cloudflare Queues for the handoff. One queue message, one consumer. If the pipeline Worker hits the CPU limit, split it then -- not before.

### ELEMENT: Google Places API
**ASSUMPTION:** Local presence scoring requires live Places data
**CHALLENGE:** What breaks if we skip this? We lose rating, review count, and NAP data. But Firecrawl already captures the site content, and the Claude analysis can infer a lot about local presence from the site itself. Places data adds $0.02/call and another API key dependency.
**VERDICT:** KEEP but make it optional. If the API call fails, the report still generates. Do not block delivery on Places data.

### ELEMENT: PDF generation inside Cloudflare Workers
**ASSUMPTION:** We need a PDF
**CHALLENGE:** PDF generation in Workers is painful. `pdf-lib` works but produces ugly output. `@react-pdf/renderer` may not run in Workers at all. The real question: does the customer care if it is a PDF or a beautifully formatted HTML page they can print to PDF themselves? HTML is trivial to generate in Workers. PDF adds significant complexity for minimal customer value.
**VERDICT:** KILL PDF generation for MVP. Deliver as a branded HTML report page with a "Save as PDF" button. The customer gets the same information. You save an entire library dependency and the hardest technical problem in the stack.

### ELEMENT: R2 bucket for PDF storage
**ASSUMPTION:** Need object storage for generated reports
**CHALLENGE:** If we switch to HTML reports, the report IS a Cloudflare Pages route. `/report/{order_id}` renders the report from D1 data. No R2 needed.
**VERDICT:** KILL. Reports are rendered on demand from D1 data. No storage needed.

### ELEMENT: Branded report with cover page, multiple sections, CTA page
**ASSUMPTION:** More pages = more perceived value
**CHALLENGE:** The customer bought a $99 report, not a 20-page document. What they want: their scores, what is wrong, what to fix first, and how to get help. That is one page. A long report signals "you generated this with AI" more than a sharp, focused one-pager signals "we know exactly what matters."
**VERDICT:** SIMPLIFY. One-page report: scores at top, 3-5 findings in the middle, top 3 recommendations at bottom, CTA to book a call. Dense, specific, high-signal.

### ELEMENT: Shared TypeScript types file
**ASSUMPTION:** Type safety across Workers prevents bugs
**CHALLENGE:** With 2 Workers instead of 4, shared types still matter but the surface area is smaller. Keep it.
**VERDICT:** KEEP. Types are load-bearing for a multi-Worker setup.

### ELEMENT: 7-phase orchestration (Intake through Improve)
**ASSUMPTION:** Full orchestrator protocol is needed for this build
**CHALLENGE:** This is a 2-week MVP with 2 Workers, a landing page, and an analysis prompt. The orchestrator is designed for multi-team, multi-cycle builds. Running 7 phases on a 3-lane build is overhead that does not produce proportional value.
**VERDICT:** SIMPLIFY. Use 3 phases: Plan (done), Build (dispatch 3 lanes), Ship (E2E test + deploy). Skip the formal Audit, Coordinate, and Improve phases. You can audit the next iteration after real customers use it.

### ELEMENT: Worktrees
**ASSUMPTION:** Worktrees enable parallel development
**CHALLENGE:** With 3 lanes instead of 6, and one person building, worktrees still help by keeping clean git history and avoiding branch conflicts. But the overhead of setup/teardown is only worth it if you are actually context-switching between lanes. If you build sequentially (checkout first, pipeline second, integration third), branches are fine. Worktrees help if you are running Claude Code agents in parallel across lanes.
**VERDICT:** KEEP but conditional. Use worktrees only if dispatching Claude Code agents in parallel. If building sequentially, just use branches.

---

## Step 2: Delete

**KILLED:**
1. Admin Dashboard (Lane 5) -- replace with a SQL script
2. PDF generation -- deliver HTML report instead
3. R2 bucket -- reports rendered from D1, no storage
4. 6-lane architecture -- reduced to 3 lanes
5. 4 separate Workers -- reduced to 2 (Checkout + Pipeline)
6. Full 7-phase orchestration -- reduced to 3 phases
7. Multi-page report -- reduced to focused one-pager

---

## Step 3: Simplify

**What remains after deletion:**

### The Irreducible Core (3 lanes, 2 Workers)

**Lane 1: Checkout (Worker 1)**
- Landing page (static HTML on Pages)
- Stripe Checkout integration
- Webhook creates order in D1
- Done. Nothing else.

**Lane 2: Pipeline + Analysis + Delivery (Worker 2)**
- Triggered by Stripe webhook (via Cloudflare Queue or direct call)
- Scrapes URL via Firecrawl
- Optionally pulls Google Places data
- Calls Claude API with scoring prompt
- Stores report JSON in D1
- Sends email via Resend with link to `/report/{order_id}`
- Updates order status at each step

**Lane 3: Report Page (Static)**
- `/report/{order_id}` route on Pages
- Reads report JSON from D1
- Renders branded HTML one-pager
- Print-to-PDF button for customers who want a file

**Admin:** One SQL script (`scripts/check-orders.sh`) that runs:
```sql
SELECT id, email, url, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;
```

### Simplified File Structure
```
src/
  pages/
    index.html          # Landing page
    confirmation.html   # Post-payment
    report.html         # Report template (client-side render from API)
  workers/
    checkout.ts         # Stripe checkout + webhook
    pipeline.ts         # Scrape + analyze + deliver (all in one)
  lib/
    firecrawl.ts        # Firecrawl client
    places.ts           # Google Places client (optional)
    claude.ts           # Claude API client
    email.ts            # Resend client
shared/
  types.ts              # Shared types
  d1-schema.sql         # Database schema
  report-schema.json    # Report JSON schema
scripts/
  check-orders.sh       # Admin query
  deploy.sh             # Deploy script
wrangler.toml
```

---

## Step 4: Accelerate

- **Firecrawl + Claude in one Worker:** Pipeline Worker runs sequentially (scrape then analyze). No queue coordination needed. One function call chain. Faster to build, faster to debug.
- **HTML report instead of PDF:** Eliminates the hardest technical problem. Report page renders in milliseconds from D1 data. No generation step, no storage, no retrieval.
- **Stripe webhook triggers pipeline directly:** No KV polling. Webhook handler calls pipeline Worker via `fetch()`. Synchronous chain. Simpler error handling.

---

## Step 5: Automate

Not yet. Build the thing first. Automation comes after you have 10+ orders and know what actually breaks in production.

The only automation worth setting up now: Cloudflare's built-in error alerting so you know if a Worker fails.

---

## The Irreducible Core

| What | How |
|------|-----|
| Collect money + URL | Stripe Checkout + 1 Worker |
| Scrape the site | Firecrawl API call |
| Score visibility | Claude API call with scoring prompt |
| Deliver the report | Resend email + HTML report page |
| Monitor | SQL script |

5 things. That is the physics. Everything else is decoration.

---

## What Died

| Element | Why It Died | Cost It Was Adding |
|---------|------------|-------------------|
| Admin Dashboard | Serves 1 person 2x/day at MVP volume | Entire lane of development |
| PDF generation | Hard technical problem, no customer value over HTML | Library dependencies, Workers runtime constraints, R2 storage |
| R2 bucket | Only existed to store PDFs | Infrastructure config, billing, another binding |
| 6 parallel lanes | One person building, review is the bottleneck not generation | Coordination overhead, 6 worktrees to manage |
| 4 separate Workers | Microservice pattern for a single-flow pipeline | 4 configs, KV coordination layer, 4 deployment targets |
| 7-phase orchestration | Designed for multi-team builds, overkill for 2-Worker MVP | Process overhead, ceremony with no proportional value |
| Multi-page PDF report | Long report signals "AI generated," not "we know what matters" | Design time, content bloat, customer attention |

---

## The Tax Report

The dead weight was going to cost approximately:
- **3-5 extra days** of development time (PDF generation alone could take 2 days)
- **4 additional API/service configurations** (R2, KV coordination, additional Workers, Cloudflare Access for admin)
- **Ongoing maintenance** of a dashboard nobody uses at MVP volume
- **Integration complexity** from 4 Workers needing to coordinate vs. 2 with a direct call

The reduced plan ships in **7-10 days** instead of 14. Same customer value. Half the moving parts.
