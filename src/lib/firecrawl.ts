import { FirecrawlResult } from "../../shared/types";

const FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape";
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30_000;

export async function scrape(
  url: string,
  apiKey: string
): Promise<FirecrawlResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(FIRECRAWL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ url, formats: ["markdown"] }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429 && attempt < MAX_RETRIES - 1) {
        continue;
      }

      if (!res.ok) {
        throw new Error(`Firecrawl ${res.status}: ${await res.text()}`);
      }

      const body = await res.json<{ success: boolean; data: FirecrawlResult }>();
      return body.data;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err as Error;
      if ((err as Error).name === "AbortError") {
        lastError = new Error("Firecrawl request timed out");
      }
    }
  }

  throw lastError ?? new Error("Firecrawl scrape failed");
}
