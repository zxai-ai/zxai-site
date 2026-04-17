// Demo analytics endpoint.
// Receives batched events from the browser (via sendBeacon or fetch) and
// writes them to the `demo_events` D1 table.
//
// Event taxonomy (enforce allowlist to prevent table pollution):
//   demo_started      — prospect lands on a demo page
//   demo_opened       — prospect clicks Accept / Start
//   demo_declined     — voice demo: caller declined the incoming call
//   turn_branched     — voice demo: response button pressed
//   interaction       — generic click (visual demos)
//   demo_skipped      — Skip button pressed
//   demo_completed    — reached the end card
//   cta_clicked       — primary or secondary CTA clicked
//   replay            — Replay button pressed
//
// Agent allowlist matches DEMO_UNIVERSE.agents slugs in
// src/pages/demo/_shell/universe.js. Unknown agents/events are dropped.

import type { Env } from "../../shared/types";

const ALLOWED_EVENTS = new Set([
  "demo_started",
  "demo_opened",
  "demo_declined",
  "turn_branched",
  "interaction",
  "demo_skipped",
  "demo_completed",
  "cta_clicked",
  "replay",
]);

const ALLOWED_AGENTS = new Set([
  "front-desk",
  "scheduling",
  "prior-auth",
  "revenue-recovery",
  "reactivation",
  "retention",
  "reputation",
  "marketing",
  "web-seo",
  "index", // /demo/ index page
]);

const MAX_EVENTS_PER_BATCH = 100;
const CORS_ORIGIN_ALLOWLIST = new Set([
  "https://zxai.ai",
  "https://www.zxai.ai",
  "http://localhost:8787",
  "http://localhost:8788",
]);

interface IncomingEvent {
  agent?: string;
  event_type?: string;
  turn_index?: number | null;
  branch_chosen?: string | null;
  session_id?: string | null;
  metadata?: unknown;
  client_ts?: string | null;
}

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && CORS_ORIGIN_ALLOWLIST.has(origin) ? origin : "https://zxai.ai";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
  const data = new TextEncoder().encode(`${ip}|${day}|zxai-demo-events`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function handleDemoEvents(
  request: Request,
  env: Env
): Promise<Response> {
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin);
  }

  let body: { events?: IncomingEvent[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }
  const events = Array.isArray(body?.events) ? body.events : [];
  if (!events.length) return json({ ok: true, written: 0 }, 200, origin);
  if (events.length > MAX_EVENTS_PER_BATCH) {
    return json({ error: "batch_too_large" }, 413, origin);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const userAgent = (request.headers.get("User-Agent") || "").slice(0, 300);
  const day = todayUtc();
  const ipHash = ip ? await hashIp(ip, day) : null;

  // Filter and clean events.
  const valid = events
    .filter((e) => e && typeof e === "object")
    .filter((e) => typeof e.agent === "string" && ALLOWED_AGENTS.has(e.agent))
    .filter((e) => typeof e.event_type === "string" && ALLOWED_EVENTS.has(e.event_type))
    .map((e) => ({
      agent: e.agent as string,
      event_type: e.event_type as string,
      turn_index: typeof e.turn_index === "number" ? e.turn_index : null,
      branch_chosen: typeof e.branch_chosen === "string" ? e.branch_chosen.slice(0, 300) : null,
      session_id: typeof e.session_id === "string" ? e.session_id.slice(0, 100) : null,
      metadata: e.metadata ? safeStringify(e.metadata).slice(0, 2000) : null,
      client_ts: typeof e.client_ts === "string" ? e.client_ts.slice(0, 40) : null,
    }));

  if (!valid.length) return json({ ok: true, written: 0 }, 200, origin);

  // Batch insert. D1 supports `batch` for multiple prepared statements.
  const stmts = valid.map((e) =>
    env.DB.prepare(
      `INSERT INTO demo_events
        (agent, event_type, turn_index, branch_chosen, session_id, ip_hash, user_agent, metadata, client_ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      e.agent,
      e.event_type,
      e.turn_index,
      e.branch_chosen,
      e.session_id,
      ipHash,
      userAgent,
      e.metadata,
      e.client_ts
    )
  );

  try {
    await env.DB.batch(stmts);
  } catch (err) {
    // Never surface analytics failures to the client — demo must not break.
    console.error("demo_events write failed:", err);
    return json({ ok: true, written: 0, error: "write_failed" }, 200, origin);
  }

  return json({ ok: true, written: valid.length }, 200, origin);
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}
