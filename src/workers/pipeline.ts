import { Env, Order, ReportData } from "../../shared/types";
import { scrape } from "../lib/firecrawl";
import { lookup } from "../lib/places";
import { analyze } from "../lib/claude";
import { buildPrompt } from "../lib/prompt-builder";
import { sendReportLink } from "../lib/email";

interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: WorkerContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Route: trigger pipeline
    if (request.method === "POST" && url.pathname === "/api/pipeline") {
      const body = await request.json<{ order_id: string }>();
      if (!body.order_id) {
        return json({ error: "order_id required" }, 400);
      }
      ctx.waitUntil(runPipeline(body.order_id, env, request.url));
      return json({ status: "started", order_id: body.order_id });
    }

    // Route: get report data
    if (request.method === "GET" && url.pathname.startsWith("/api/report/")) {
      const orderId = url.pathname.split("/api/report/")[1];
      if (!orderId) return json({ error: "order_id required" }, 400);
      return handleGetReport(orderId, env);
    }

    // Route: checkout
    if (request.method === "POST" && url.pathname === "/api/checkout") {
      const { default: checkout } = await import("./checkout");
      return checkout.fetch(request, env);
    }

    // Route: Stripe webhook
    if (request.method === "POST" && url.pathname === "/api/webhook") {
      const { default: checkout } = await import("./checkout");
      return checkout.fetch(request, env);
    }

    // Static pages are served by wrangler assets (src/pages/).
    // /report/:id needs to serve report.html for client-side routing.
    if (url.pathname.startsWith("/report/")) {
      return env.ASSETS.fetch(new Request(new URL("/report.html", url.origin)));
    }

    // All other paths fall through to static assets (index.html, confirmation.html, etc.)
    return new Response("Not found", { status: 404 });
  },
};

async function runPipeline(
  orderId: string,
  env: Env,
  requestUrl: string
): Promise<void> {
  const origin = new URL(requestUrl).origin;

  try {
    // 1. Read order
    const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?")
      .bind(orderId)
      .first<Order>();

    if (!order) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    // 2. Scraping
    await setStatus(env, orderId, "scraping");

    const crawlResult = await scrape(order.url, env.FIRECRAWL_API_KEY);

    // 3. Places lookup (non-blocking)
    const placesResult = await lookup(order.url, env.GOOGLE_PLACES_API_KEY);

    // 4. Store raw data
    await env.DB.prepare(
      "INSERT INTO raw_data (order_id, firecrawl_data, places_data) VALUES (?, ?, ?)"
    )
      .bind(
        orderId,
        JSON.stringify(crawlResult),
        placesResult ? JSON.stringify(placesResult) : null
      )
      .run();

    // 5. Analyzing
    await setStatus(env, orderId, "analyzing");

    const prompt = buildPrompt(order.url, crawlResult, placesResult);
    const analysisRaw = await analyze(prompt, env.ANTHROPIC_API_KEY);

    // Parse JSON response
    let analysisJson: {
      practice_name: string;
      scores: ReportData["scores"];
      recommendations: ReportData["recommendations"];
    };

    try {
      const cleaned = analysisRaw
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
      analysisJson = JSON.parse(cleaned);
    } catch {
      throw new Error(
        `Invalid JSON from Claude: ${analysisRaw.slice(0, 200)}`
      );
    }

    const report: ReportData = {
      order_id: orderId,
      url: order.url,
      practice_name: analysisJson.practice_name,
      audit_date: new Date().toISOString().split("T")[0],
      scores: analysisJson.scores,
      recommendations: analysisJson.recommendations,
    };

    // 6. Store report
    await env.DB.prepare(
      "INSERT INTO reports (order_id, report_json, score_overall) VALUES (?, ?, ?)"
    )
      .bind(orderId, JSON.stringify(report), report.scores.overall)
      .run();

    // 7. Delivering
    await setStatus(env, orderId, "delivering");

    await sendReportLink(
      order.email,
      orderId,
      report.scores.overall,
      env.RESEND_API_KEY,
      origin
    );

    // 8. Done
    await setStatus(env, orderId, "delivered");
    await env.DB.prepare(
      "UPDATE reports SET delivered_at = datetime('now') WHERE order_id = ?"
    )
      .bind(orderId)
      .run();
  } catch (err) {
    console.error(`Pipeline failed for ${orderId}:`, err);
    await setStatus(env, orderId, "failed");
  }
}

async function handleGetReport(
  orderId: string,
  env: Env
): Promise<Response> {
  const row = await env.DB.prepare(
    "SELECT r.report_json, o.status FROM reports r JOIN orders o ON o.id = r.order_id WHERE r.order_id = ?"
  )
    .bind(orderId)
    .first<{ report_json: string; status: string }>();

  if (!row) {
    const order = await env.DB.prepare("SELECT status FROM orders WHERE id = ?")
      .bind(orderId)
      .first<{ status: string }>();

    if (order) {
      return json({ status: order.status, report: null });
    }
    return json({ error: "Order not found" }, 404);
  }

  return json({ status: row.status, report: JSON.parse(row.report_json) });
}

async function setStatus(
  env: Env,
  orderId: string,
  status: string
): Promise<void> {
  await env.DB.prepare(
    "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(status, orderId)
    .run();
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
