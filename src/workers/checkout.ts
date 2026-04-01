import { Env } from "../../shared/types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/checkout") {
      return handleCheckout(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/webhook") {
      return handleWebhook(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleCheckout(request: Request, env: Env): Promise<Response> {
  let body: { url?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const siteUrl = body.url?.trim();
  const email = body.email?.trim();

  if (!siteUrl || !email) {
    return json({ error: "URL and email are required" }, 400);
  }

  try {
    new URL(siteUrl);
  } catch {
    return json({ error: "Please enter a valid URL" }, 400);
  }

  // Create Stripe Checkout Session
  const params = new URLSearchParams({
    "payment_method_types[0]": "card",
    mode: "payment",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][product_data][name]": "AI Visibility Audit",
    "line_items[0][price_data][unit_amount]": "9900",
    "line_items[0][quantity]": "1",
    success_url: `${new URL(request.url).origin}/confirmation.html`,
    cancel_url: `${new URL(request.url).origin}/`,
    "metadata[url]": siteUrl,
    "metadata[email]": email,
    customer_email: email,
  });

  const stripeRes = await fetch(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(env.STRIPE_SECRET_KEY + ":")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!stripeRes.ok) {
    const err = await stripeRes.text();
    console.error("Stripe error:", err);
    return json({ error: "Payment setup failed" }, 500);
  }

  const session = await stripeRes.json<{ url: string }>();
  return json({ url: session.url });
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const payload = await request.text();

  // Verify Stripe webhook signature
  const verified = await verifyStripeSignature(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );
  if (!verified) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(payload);

  if (event.type !== "checkout.session.completed") {
    return new Response("OK");
  }

  const session = event.data.object;
  const siteUrl = session.metadata?.url;
  const email = session.metadata?.email;
  const paymentId = session.payment_intent;

  if (!siteUrl || !email) {
    console.error("Missing metadata in webhook");
    return new Response("Missing metadata", { status: 400 });
  }

  const orderId = crypto.randomUUID();

  // Create order in D1
  await env.DB.prepare(
    "INSERT INTO orders (id, email, url, stripe_payment_id, status) VALUES (?, ?, ?, ?, 'pending')"
  )
    .bind(orderId, email, siteUrl, paymentId)
    .run();

  // Trigger pipeline Worker
  const origin = new URL(request.url).origin;
  await fetch(`${origin}/api/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId }),
  });

  return new Response("OK");
}

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string
): Promise<boolean> {
  const parts = header.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key === "t") acc.timestamp = value;
      if (key === "v1") acc.signatures.push(value);
      return acc;
    },
    { timestamp: "", signatures: [] as string[] }
  );

  if (!parts.timestamp || parts.signatures.length === 0) return false;

  const signedPayload = `${parts.timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return parts.signatures.includes(expected);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
