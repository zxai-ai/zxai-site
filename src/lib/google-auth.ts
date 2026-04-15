// Google OAuth: refresh-token -> access-token exchange.
// Used by the Front Desk demo to call Google Calendar as am@zxai.ai.

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface CachedToken {
  access_token: string;
  expires_at: number; // epoch ms
}

let cache: CachedToken | null = null;

export async function getGoogleAccessToken(env: {
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  GOOGLE_OAUTH_REFRESH_TOKEN: string;
}): Promise<string> {
  // Reuse cached token if it has >60s left
  if (cache && cache.expires_at > Date.now() + 60_000) {
    return cache.access_token;
  }

  const body = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as TokenResponse;
  cache = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}
