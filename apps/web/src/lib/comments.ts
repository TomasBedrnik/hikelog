export type CommentRead = {
  id: number;
  name: string;
  text: string;
  created_at: string;
};

export type CommentWrite = {
  name: string;
  text: string;
};

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }
  return baseUrl;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export function createPublicTripComment(tripId: number, payload: CommentWrite) {
  return request<CommentRead>(`/api/v1/public/trips/${tripId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createPublicActivityComment(activityId: number, payload: CommentWrite) {
  return request<CommentRead>(`/api/v1/public/activities/${activityId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
