const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250514";
const MAX_TOKENS = 4096;
const TIMEOUT_MS = 90_000;

export async function analyze(
  prompt: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(CLAUDE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
        system:
          "You are a medical practice digital visibility analyst. Score honestly. Be specific. Output valid JSON only.",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    }

    const body = await res.json<{
      content: Array<{ type: string; text: string }>;
    }>();

    const text = body.content.find((c) => c.type === "text")?.text;
    if (!text) throw new Error("No text in Claude response");

    return text;
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      throw new Error("Claude API request timed out");
    }
    throw err;
  }
}
