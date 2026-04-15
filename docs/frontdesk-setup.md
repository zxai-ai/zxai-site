# Front Desk Demo (Katie): setup

One-time setup to take the live voice demo from code to live on zxai.ai.

## 1. Google Cloud project (for Calendar API)

1. Go to https://console.cloud.google.com, create a project named `zxai-frontdesk`.
2. Enable the **Google Calendar API** (APIs & Services -> Library -> search -> Enable).
3. Configure the **OAuth consent screen** (APIs & Services -> OAuth consent screen):
   - User type: **External**, publishing status: **Testing** is fine (add `am@zxai.ai` as a test user)
   - Scopes: add `https://www.googleapis.com/auth/calendar`
4. Create an **OAuth 2.0 Client ID** (APIs & Services -> Credentials):
   - Application type: **Web application**
   - Authorized redirect URIs: `https://zxai.ai/api/front-desk/oauth/callback`
     (and `http://localhost:8787/api/front-desk/oauth/callback` for local dev)
   - Copy the **Client ID** and **Client secret** , you'll need them in step 3.

## 2. Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Create a key under a Google account with Live API access enabled.
3. Keep it handy for step 3.

## 3. Cloudflare secrets

From `~/zxai-site`:

```bash
wrangler secret put GEMINI_API_KEY
wrangler secret put TURNSTILE_SECRET               # from Cloudflare dashboard -> Turnstile
wrangler secret put GOOGLE_OAUTH_CLIENT_ID
wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
# GOOGLE_OAUTH_REFRESH_TOKEN is captured in step 5 below.
```

## 4. D1 schema migration

```bash
wrangler d1 execute audit-db --file=./shared/d1-schema.sql
# (Idempotent , safe to re-run. Adds demo_bookings and demo_token_mints.)
```

## 5. Capture the Google OAuth refresh token (one-time)

Deploy the Worker first so the OAuth callback route is live:

```bash
wrangler deploy
```

Then, in a browser, sign out of all Google accounts except `am@zxai.ai` and visit:

```
https://zxai.ai/api/front-desk/oauth/start
```

Google will redirect back to `/api/front-desk/oauth/callback` and the page will
show the refresh token. Copy it immediately and store it:

```bash
wrangler secret put GOOGLE_OAUTH_REFRESH_TOKEN
# paste the value
```

If the page says "no refresh_token returned," revoke ZxAI Front Desk at
https://myaccount.google.com/permissions and retry , Google only issues a refresh
token on first consent.

## 6. Turnstile widget

1. In the Cloudflare dashboard -> Turnstile, add a site for `zxai.ai`.
2. Copy the site key into the widget's front-end (see TODO below) and the secret
   via `wrangler secret put TURNSTILE_SECRET`.
3. **TODO:** the current widget posts `/api/front-desk/token` without a Turnstile
   challenge , we need to drop the Turnstile JS in `index.html` and `/demo/front-desk`,
   then pass the token in the request body as `{ turnstile: "..." }`. Until then,
   the Worker enforces Turnstile only if `TURNSTILE_SECRET` is set , leaving the
   secret unset during v1 soft-launch is an explicit choice.

## 7. Flip the kill switch

Non-secret vars live in `wrangler.toml` under `[vars]`. Default is disabled:

```toml
[vars]
DEMO_ENABLED = "false"
```

When you're ready, change to `"true"` and redeploy, OR override without touching
git:

```bash
wrangler deploy --var DEMO_ENABLED:true
```

## 8. Smoke test

```bash
# token mint
curl -X POST https://zxai.ai/api/front-desk/token -H "Content-Type: application/json" -d '{}'
# availability
curl -X POST https://zxai.ai/api/front-desk/check_availability \
  -H "Content-Type: application/json" \
  -d '{"day_window":"tomorrow afternoon"}'
```

Then visit `https://zxai.ai/demo/front-desk` and click Talk to Katie.

## Rollback

Flip `DEMO_ENABLED` to `"false"` and redeploy. The Worker returns 503 for every
front-desk route; the homepage widget will show a friendly error and stop.

## Daily review

Check bookings:

```bash
wrangler d1 execute audit-db --command "SELECT created_at, first_name, last_name, company, email, slot_label, calendar_event_id FROM demo_bookings ORDER BY created_at DESC LIMIT 20;"
```

## File map

- `src/workers/frontdesk.ts`: token mint, tool endpoints, OAuth helper
- `src/lib/gemini-token.ts`: REST call to Google for the ephemeral token
- `src/lib/google-auth.ts`: refresh-token -> access-token
- `src/lib/google-calendar.ts`: freebusy + events.insert
- `src/lib/availability.ts`: natural-language day window -> real slots
- `src/lib/turnstile.ts`: Turnstile verification
- `src/lib/frontdesk-prompt.ts`: Katie's system prompt (server-side copy)
- `src/pages/frontdesk/widget.js`: UI orchestration (mount function)
- `src/pages/frontdesk/gemini-live.js`: Gemini Live client (ported from Google sample)
- `src/pages/frontdesk/audio-io.js`: mic streamer + speaker player
- `src/pages/frontdesk/tools.js`: Katie's two tool handlers
- `src/pages/frontdesk/config.js`: model, voice, system prompt (client-side copy)
- `src/pages/frontdesk/widget.css`: scoped styles
- `src/pages/frontdesk/audio-processors/*.worklet.js`: 16kHz capture + 24kHz playback
- `src/pages/demo/front-desk.html`: standalone dedicated page
- `index.html`: homepage, hero companion widget replaces the 9-staff dock
