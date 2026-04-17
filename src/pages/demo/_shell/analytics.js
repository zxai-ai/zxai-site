// Demo analytics. Batches events client-side and POSTs to /api/demo-events.
// Non-blocking. Silent on failure.
//
// Usage:
//   import { trackEvent } from "/demo/_shell/analytics.js";
//   trackEvent("reactivation", "demo_started");
//   trackEvent("reactivation", "turn_branched", { turn_index: 1, branch_chosen: "Not right now" });

const ENDPOINT = "/api/demo-events";
const BATCH_INTERVAL_MS = 2000;
const MAX_QUEUE = 50;

let queue = [];
let flushTimer = null;

function getSessionId() {
  const key = "zxai_sid";
  const existing = document.cookie.split("; ").find((c) => c.startsWith(key + "="));
  if (existing) return existing.split("=")[1];
  const id = (crypto.randomUUID && crypto.randomUUID()) || fallbackId();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${key}=${id}; expires=${expires}; path=/; SameSite=Lax`;
  return id;
}

function fallbackId() {
  return "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function trackEvent(agent, eventType, metadata = {}) {
  const event = {
    agent,
    event_type: eventType,
    turn_index: metadata.turn_index ?? null,
    branch_chosen: metadata.branch_chosen ?? null,
    session_id: getSessionId(),
    metadata: stripReserved(metadata),
    client_ts: new Date().toISOString(),
  };
  queue.push(event);
  if (queue.length >= MAX_QUEUE) {
    flush();
    return;
  }
  scheduleFlush();
}

function stripReserved(m) {
  const { turn_index, branch_chosen, ...rest } = m;
  return Object.keys(rest).length ? rest : null;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, BATCH_INTERVAL_MS);
}

async function flush() {
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  try {
    const blob = new Blob([JSON.stringify({ events: batch })], { type: "application/json" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    // Silent. Analytics must never break the demo.
  }
}

// Flush on page hide so we don't lose the last events.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
}
