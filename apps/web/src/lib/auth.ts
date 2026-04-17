export const TOKEN_KEY = "hikelog_google_id_token";

export function setIdToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getIdToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearIdToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }
  return baseUrl;
}

export async function exchangeGoogleIdToken(idToken: string): Promise<string> {
  const res = await fetch(`${getApiBaseUrl()}/api/v1/admin-auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id_token: idToken }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    let detail: string | null = null;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown };
      if (typeof parsed.detail === "string" && parsed.detail.trim()) {
        detail = parsed.detail;
      }
    } catch {
      detail = null;
    }
    throw new Error(detail || text || `Login failed: ${res.status}`);
  }

  const payload = (await res.json()) as { access_token?: unknown };
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("Login failed: missing access token");
  }

  return payload.access_token;
}
