// Front Desk demo Worker module (Katie).
// Mounted by pipeline.ts on /api/front-desk/* routes.

import type { Env } from "../../shared/types";
import { mintEphemeralToken } from "../lib/gemini-token";
import { verifyTurnstile } from "../lib/turnstile";
import { getGoogleAccessToken } from "../lib/google-auth";
import { resolveAvailability, type Slot } from "../lib/availability";
import { insertEvent } from "../lib/google-calendar";

const CORS_ORIGIN_ALLOWLIST = new Set([
  "https://zxai.ai",
  "https://www.zxai.ai",
  "http://localhost:8787",
  "http://localhost:8788",
]);

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && CORS_ORIGIN_ALLOWLIST.has(origin) ? origin : "https://zxai.ai";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, CF-Turnstile-Response",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function hashIp(ip: string, day: string): Promise<string> {
  // Non-reversible hash for rate-limiting/logging. Salted with the day so the
  // stored hash rotates daily.
  const data = new TextEncoder().encode(`${ip}|${day}|zxai-frontdesk`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function handleFrontDesk(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Kill switch
  if (env.DEMO_ENABLED !== "true") {
    return json({ error: "demo_disabled" }, 503, origin);
  }

  if (request.method === "POST" && url.pathname === "/api/front-desk/token") {
    return handleToken(request, env, origin);
  }
  if (
    request.method === "POST" &&
    url.pathname === "/api/front-desk/check_availability"
  ) {
    return handleCheckAvailability(request, env, origin);
  }
  if (
    request.method === "POST" &&
    url.pathname === "/api/front-desk/book_consult"
  ) {
    return handleBookConsult(request, env, origin);
  }

  // One-time OAuth helper: visit /api/front-desk/oauth/start in a browser to
  // capture a refresh token. Use Anthony's Google account. Use ONCE.
  if (request.method === "GET" && url.pathname === "/api/front-desk/oauth/start") {
    return handleOauthStart(url, env);
  }
  if (request.method === "GET" && url.pathname === "/api/front-desk/oauth/callback") {
    return handleOauthCallback(url, env);
  }

  return json({ error: "not_found" }, 404, origin);
}

async function handleToken(
  request: Request,
  env: Env,
  origin: string | null
): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
  const day = todayUtc();
  const ipHash = await hashIp(ip, day);

  // Turnstile check. Token in JSON body OR header.
  let turnstileToken = request.headers.get("CF-Turnstile-Response") ?? "";
  try {
    const body = (await request.clone().json()) as { turnstile?: string };
    if (body.turnstile) turnstileToken = body.turnstile;
  } catch {
    /* no body is fine */
  }

  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, ip);
    if (!ok) return json({ error: "turnstile_failed" }, 403, origin);
  }

  // Daily global cap
  const cap = Number(env.DEMO_DAILY_MINT_CAP || "400");
  const globalCount = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM demo_token_mints WHERE day = ?"
  )
    .bind(day)
    .first<{ n: number }>();
  if (globalCount && globalCount.n >= cap) {
    return json({ error: "daily_cap_reached" }, 429, origin);
  }

  // Per-IP cap (50/day in dev, lower in prod via env override if needed)
  const ipCount = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM demo_token_mints WHERE day = ? AND ip_hash = ?"
  )
    .bind(day, ipHash)
    .first<{ n: number }>();
  const perIpCap = Number(env.DEMO_DAILY_MINT_CAP || "400") < 50 ? 5 : 50;
  if (ipCount && ipCount.n >= perIpCap) {
    return json({ error: "rate_limited" }, 429, origin);
  }

  // Mint the token
  const minted = await mintEphemeralToken(env.GEMINI_API_KEY, {
    ttlMinutes: 10,
    newSessionExpireMinutes: 1,
  });

  await env.DB.prepare(
    "INSERT INTO demo_token_mints (ip_hash, day) VALUES (?, ?)"
  )
    .bind(ipHash, day)
    .run();

  return json(minted, 200, origin);
}

async function handleCheckAvailability(
  request: Request,
  env: Env,
  origin: string | null
): Promise<Response> {
  try {
    const body = (await request.json()) as { day_window?: string };
    const dayWindow = (body.day_window || "").slice(0, 200);
    if (!dayWindow) return json({ error: "day_window required" }, 400, origin);

    const accessToken = await getGoogleAccessToken(env);
    const calendarId = env.DEMO_CALENDAR_ID || "primary";
    const { slots, resolvedWindow } = await resolveAvailability(
      accessToken,
      calendarId,
      dayWindow
    );

    if (slots.length === 0) {
      return json(
        { slots: [], resolved_window: resolvedWindow, message: "no open slots in that window" },
        200,
        origin
      );
    }
    return json({ slots, resolved_window: resolvedWindow }, 200, origin);
  } catch (e: unknown) {
    console.error("check_availability error", e);
    return json({ error: "availability_failed" }, 500, origin);
  }
}

interface BookConsultBody {
  first_name?: string;
  last_name?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  slot_id?: string;
  slot_iso?: string; // the resolver returns it; we persist this
  slot_end_iso?: string;
  slot_label?: string;
}

function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function confirmationId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "ZX-";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

async function handleBookConsult(
  request: Request,
  env: Env,
  origin: string | null
): Promise<Response> {
  try {
    const body = (await request.json()) as BookConsultBody;

    const firstName = (body.first_name || "").trim().slice(0, 80);
    const lastName = (body.last_name || "").trim().slice(0, 80);
    const company = (body.company || "").trim().slice(0, 120);
    const role = (body.role || "").trim().slice(0, 120);
    const email = (body.email || "").trim().slice(0, 200);
    const phone = (body.phone || "").trim().slice(0, 40);
    const slotIso = (body.slot_iso || "").trim();
    const slotEndIso = (body.slot_end_iso || "").trim();
    const slotLabel = (body.slot_label || "").trim().slice(0, 80);

    if (!firstName || !lastName || !company || !email || !slotIso) {
      return json({ error: "missing_required_fields" }, 400, origin);
    }
    if (!validEmail(email)) {
      return json({ error: "invalid_email" }, 400, origin);
    }
    const slotMs = Date.parse(slotIso);
    if (!Number.isFinite(slotMs) || slotMs < Date.now() - 60_000) {
      return json({ error: "invalid_slot" }, 400, origin);
    }

    const endIso = slotEndIso || new Date(slotMs + 15 * 60_000).toISOString();

    // Create the calendar event.
    const accessToken = await getGoogleAccessToken(env);
    const calendarId = env.DEMO_CALENDAR_ID || "primary";
    const owner = env.DEMO_OWNER_NAME || "Anthony";

    const event = await insertEvent(accessToken, calendarId, {
      summary: `ZxAI consult: ${firstName} ${lastName} (${company})`,
      description:
        `Booked via the ZxAI front desk demo on zxai.ai.\n\n` +
        `Caller: ${firstName} ${lastName}\n` +
        `Company: ${company}\n` +
        `Role: ${role || "n/a"}\n` +
        `Email: ${email}\n` +
        `Phone: ${phone || "n/a"}\n\n` +
        `This is a 15-minute consult with ${owner}.`,
      startIso: new Date(slotMs).toISOString(),
      endIso,
      attendeeEmails: [email],
    });

    const id = confirmationId();
    const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
    const ua = request.headers.get("User-Agent") ?? "";
    const ipHash = await hashIp(ip, todayUtc());

    await env.DB.prepare(
      `INSERT INTO demo_bookings
        (id, first_name, last_name, company, role, email, phone,
         slot_iso, slot_label, calendar_event_id, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        firstName,
        lastName,
        company,
        role,
        email,
        phone,
        slotIso,
        slotLabel || slotIso,
        event.id,
        ipHash,
        ua.slice(0, 300)
      )
      .run();

    return json(
      {
        confirmation_id: id,
        slot_label: slotLabel || slotIso,
        calendar_event_id: event.id,
        meet_link: event.hangoutLink,
      },
      200,
      origin
    );
  } catch (e: unknown) {
    console.error("book_consult error", e);
    return json({ error: "booking_failed" }, 500, origin);
  }
}

// --- One-time OAuth helper (for capturing the refresh token) ---

const OAUTH_SCOPE = "https://www.googleapis.com/auth/calendar";

function handleOauthStart(url: URL, env: Env): Response {
  if (!env.GOOGLE_OAUTH_CLIENT_ID) {
    return new Response(
      "GOOGLE_OAUTH_CLIENT_ID not set. Set it via `wrangler secret put` first.",
      { status: 503 }
    );
  }
  const redirectUri = `${url.origin}/api/front-desk/oauth/callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", OAUTH_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  return Response.redirect(authUrl.toString(), 302);
}

async function handleOauthCallback(url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get("code");
  if (!code) return new Response("missing code", { status: 400 });
  const redirectUri = `${url.origin}/api/front-desk/oauth/callback`;

  const body = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    return new Response(`token exchange failed: ${text}`, { status: 500 });
  }
  const data = JSON.parse(text) as { refresh_token?: string };
  if (!data.refresh_token) {
    return new Response(
      `No refresh_token returned. Revoke app access at https://myaccount.google.com/permissions and retry.\n\nRaw response: ${text}`,
      { status: 400, headers: { "Content-Type": "text/plain" } }
    );
  }
  return new Response(
    `Refresh token captured. Save it with:\n\n` +
      `  wrangler secret put GOOGLE_OAUTH_REFRESH_TOKEN\n` +
      `  <paste>\n${data.refresh_token}\n\n` +
      `Then close this window and delete these routes from the deployed Worker.\n`,
    { status: 200, headers: { "Content-Type": "text/plain" } }
  );
}
