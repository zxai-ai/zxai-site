# Claude instructions for the ZxAI site repo

## Before every session

Read these files before starting work:
1. This file (`~/zxai-site/CLAUDE.md`)
2. `~/Documents/ZxAI-Brain/CLAUDE.md` (master memory, projects, tools, terms)
3. `~/.claude/projects/-Users-anthonymesa-Claude-ZxAI/memory/MEMORY.md` (auto-memory)

## Path rules

**This (`~/zxai-site`) is the live, deployed ZxAI site.** All site work happens here. Pushing to `main` triggers the Cloudflare Pages deploy. `publish.sh` is the standard commit + push + sitemap-ping flow.

**Never use `~/ZxAI`.** That directory is a scratch/local build with no git history and is NOT deployed. Do not edit it, do not reference it, do not copy from it.

**Be careful with worktrees under `~/Claude ZxAI/.claude/worktrees/*`.** They may be based on stale snapshots and drift from this repo. Before editing any shared file in a worktree, diff against `~/zxai-site` or confirm with Anthony.

## Style

- **No em dashes.** Hard ban in all ZxAI output.
- **"AI staff" not "AI agents."** Everywhere, always.
- Brand voice rules: `~/Documents/ZxAI-Brain/Spaces/Brand Voice Rules.md`
- Design system: `~/Documents/ZxAI-Brain/Spaces/Brand Style Guide.md`

## Deploy topology

Two separate deploy paths. Both trigger on push to main, but they are independent:

1. **Cloudflare Pages** serves static files from the repo root (`index.html`, `blog/`, `frontdesk/`, etc.) at `zxai.ai`.
2. **Cloudflare Worker** (`zxai-audit`) handles `/api/*` routes. Lives at `zxai-audit.vzxb9kqjkq.workers.dev`. Deployed separately via `npx wrangler deploy`. NOT routed to `zxai.ai` domain.

Because of this split:
- Frontend JS that calls the Worker must use the full `.workers.dev` URL in production (see `frontdesk/config.js` `apiBase`).
- `src/pages/` is the Worker's asset directory (served by wrangler dev locally, but NOT by Pages in prod).
- Files at repo root ARE served by Pages. Widget files live in BOTH `frontdesk/` (Pages-served) and `src/pages/frontdesk/` (Worker-served for `/demo/front-desk`). Keep them in sync.

## Front Desk Demo (Katie)

Live voice demo using Gemini Live API.

| Item | Value |
|------|-------|
| Agent name | Katie |
| Voice | Zephyr (Gemini) |
| Model | `gemini-3.1-flash-live-preview` |
| Persona spec | `~/Documents/ZxAI-Brain/Spaces/Front Desk Demo.md` |
| System prompt | `frontdesk/config.js` (client) + `src/lib/frontdesk-prompt.ts` (server) |
| Worker endpoints | `/api/front-desk/token`, `/api/front-desk/check_availability`, `/api/front-desk/book_consult` |
| Widget mounts | Homepage hero (`#fd-hero-mount`), agent #01 section (`#fd-staff-mount`), `/demo/front-desk` |
| Kill switch | `DEMO_ENABLED` in `wrangler.toml` `[vars]` |
| Rate limit | 50/IP/day (dev), daily global cap 400 |
| Setup docs | `docs/frontdesk-setup.md` |

**Secrets (via `wrangler secret put`):**
- `GEMINI_API_KEY` (set)
- `TURNSTILE_SECRET` (not set, skipped if empty)
- `GOOGLE_OAUTH_CLIENT_ID` (not set)
- `GOOGLE_OAUTH_CLIENT_SECRET` (not set)
- `GOOGLE_OAUTH_REFRESH_TOKEN` (not set)

**Status:** Voice + text working. Calendar booking NOT connected (OAuth pending). Turnstile NOT wired.

## D1 Database

Name: `audit-db`, ID: `f8c6624e-b638-490b-8e51-a89e1180084d`

Tables: `orders`, `raw_data`, `reports`, `demo_bookings`, `demo_token_mints`

Schema: `shared/d1-schema.sql`

Local migration: `npx wrangler d1 execute audit-db --local --file=./shared/d1-schema.sql`
Remote migration: `npx wrangler d1 execute audit-db --remote --file=./shared/d1-schema.sql`

Note: local D1 via `wrangler dev` uses Miniflare SQLite in `.wrangler/state/v3/d1/`. The `--local` migration may write to a different file than what wrangler dev reads. If tables are missing locally, apply schema directly to the sqlite files in that directory.

## After every task

1. Update this file if site infrastructure, secrets, or deploy process changed.
2. Update `~/Documents/ZxAI-Brain/CLAUDE.md` (projects, tools, vault navigation).
3. Update `~/Documents/ZxAI-Brain/Spaces/` relevant file if a feature shipped.
4. Update `~/.claude/projects/-Users-anthonymesa-Claude-ZxAI/memory/MEMORY.md` if a new persistent rule was learned.
