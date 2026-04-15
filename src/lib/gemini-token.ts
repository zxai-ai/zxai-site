// Mint a Gemini Live ephemeral auth token via the REST API.
// Equivalent to the Python SDK's client.auth_tokens.create(config=...).
// Spec: https://ai.google.dev/gemini-api/docs/ephemeral-tokens

interface EphemeralToken {
  name: string;
}

export async function mintEphemeralToken(
  apiKey: string,
  opts: {
    ttlMinutes: number;
    newSessionExpireMinutes: number;
  }
): Promise<{ token: string; expires_at: string }> {
  const now = new Date();
  const expireTime = new Date(now.getTime() + opts.ttlMinutes * 60_000);
  const newSessionExpire = new Date(
    now.getTime() + opts.newSessionExpireMinutes * 60_000
  );

  const url =
    "https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=" +
    encodeURIComponent(apiKey);

  // REST API expects fields at top level, not nested under "config"
  // (the Python SDK wraps them internally).
  const body = {
    uses: 1,
    expire_time: expireTime.toISOString(),
    new_session_expire_time: newSessionExpire.toISOString(),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`auth_tokens.create failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as EphemeralToken;
  return { token: data.name, expires_at: expireTime.toISOString() };
}
